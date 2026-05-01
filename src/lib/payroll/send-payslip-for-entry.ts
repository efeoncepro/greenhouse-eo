import 'server-only'

import { Buffer } from 'node:buffer'

import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { generatePayrollReceiptPdf, RECEIPT_TEMPLATE_VERSION } from '@/lib/payroll/generate-payroll-pdf'
import {
  buildPayrollReceiptId,
  buildPayrollReceiptStoragePath,
  getPayrollReceiptByEntryId,
  savePayrollReceipt,
  type PayrollReceiptDeliveryTrigger,
  type PayrollReceiptRecord
} from '@/lib/payroll/payroll-receipts-store'
import { sendEmail } from '@/lib/email/delivery'
import { downloadGreenhouseMediaAsset, uploadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
import { getGreenhousePrivateAssetsBucket, upsertSystemGeneratedAsset } from '@/lib/storage/greenhouse-assets'

/**
 * TASK-759 — Helper canónico per-entry para envío del recibo de nómina.
 *
 * Idempotente: si ya existe un receipt con `status='email_sent'` para la entry
 * (mismo revision), retorna `skipped` sin reenviar. La idempotency key es
 * `(entry_id, revision)` natural de la tabla.
 *
 * Reusable desde:
 *  - payrollReceiptsProjection (legacy, periodo completo via generatePayrollReceiptsForPeriod)
 *  - payslipOnPaymentPaidProjection (per-line, al pagar la orden)
 *  - endpoints manuales de resend (futuro)
 *
 * Nunca falla "ruidosamente" — captura errores y persiste status canónico
 * (`generation_failed`, `email_failed`) para que el reactive consumer pueda
 * reintentar o el operador pueda inspeccionar la causa.
 */
export interface SendPayslipForEntryInput {
  entryId: string
  trigger: PayrollReceiptDeliveryTrigger
  paymentOrderLineId?: string | null
  actorEmail?: string | null

  /** Si se conoce el sourceEventId del trigger (e.g. payroll_period.exported eventId
   *  o finance.payment_order.paid eventId). Mejora trazabilidad. */
  sourceEventId?: string | null
}

export interface SendPayslipForEntryResult {
  status: 'sent' | 'skipped_already_sent' | 'skipped_no_email' | 'failed_generation' | 'failed_email'
  receiptId: string | null
  resendId: string | null
  error: string | null
}

const buildAttachmentName = (periodId: string, memberId: string, revision: number) =>
  `recibo-${periodId}-${memberId}-r${revision}.pdf`

export async function sendPayslipForEntry(
  input: SendPayslipForEntryInput
): Promise<SendPayslipForEntryResult> {
  // 1. Resolver entry + period
  const entry = await getPayrollEntryById(input.entryId)

  if (!entry) {
    return { status: 'failed_generation', receiptId: null, resendId: null, error: `entry ${input.entryId} not found` }
  }

  const period = await getPayrollPeriod(entry.periodId)

  if (!period) {
    return { status: 'failed_generation', receiptId: null, resendId: null, error: `period ${entry.periodId} not found` }
  }

  // 2. Idempotency check — si ya hay receipt email_sent para esta entry, skip.
  const existing = await getPayrollReceiptByEntryId(input.entryId)

  if (existing?.status === 'email_sent' && existing.emailSentAt) {
    return { status: 'skipped_already_sent', receiptId: existing.receiptId, resendId: null, error: null }
  }

  // 3. Sin email → skip (no failure).
  if (!entry.memberEmail) {
    return { status: 'skipped_no_email', receiptId: existing?.receiptId ?? null, resendId: null, error: null }
  }

  const revision = existing?.revision ?? 1
  const receiptId = existing?.receiptId ?? buildPayrollReceiptId(input.entryId, revision)
  const sourceEventId = input.sourceEventId ?? existing?.sourceEventId ?? `payslip-trigger-${input.trigger}-${Date.now()}`

  // 4. Asegurar PDF disponible (regenerar si no existe o fue generation_failed)
  let pdfBuffer: Buffer | null = null
  let storagePath = existing?.storagePath ?? null
  let storageBucket = existing?.storageBucket ?? null
  let assetId = existing?.assetId ?? null

  const needsRegeneration = !existing || existing.status === 'generation_failed' || !existing.storagePath

  if (needsRegeneration) {
    try {
      pdfBuffer = await generatePayrollReceiptPdf(input.entryId)

      const objectName = buildPayrollReceiptStoragePath(entry.periodId, entry.memberId, revision)

      storagePath = await uploadGreenhouseStorageObject({
        bucketName: getGreenhousePrivateAssetsBucket(),
        objectName,
        contentType: 'application/pdf',
        bytes: pdfBuffer,
        cacheControl: 'private, max-age=0, must-revalidate'
      })

      storageBucket = storagePath.split('/')[2] || null

      const asset = storageBucket
        ? await upsertSystemGeneratedAsset({
            assetId,
            ownerAggregateType: 'payroll_receipt',
            ownerAggregateId: receiptId,
            ownerMemberId: entry.memberId,
            bucketName: storageBucket,
            objectPath: objectName,
            fileName: buildAttachmentName(entry.periodId, entry.memberId, revision),
            mimeType: 'application/pdf',
            sizeBytes: pdfBuffer.byteLength,
            actorUserId: input.actorEmail ?? null,
            metadata: {
              entryId: input.entryId,
              periodId: entry.periodId,
              payRegime: entry.payRegime,
              triggeredBy: input.trigger
            }
          })
        : null

      assetId = asset?.assetId ?? assetId

      await savePayrollReceipt({
        receiptId,
        entryId: input.entryId,
        periodId: entry.periodId,
        memberId: entry.memberId,
        payRegime: entry.payRegime,
        revision,
        sourceEventId,
        status: 'generated',
        assetId,
        storageBucket,
        storagePath,
        fileSizeBytes: pdfBuffer.byteLength,
        generatedAt: new Date().toISOString(),
        generatedBy: input.actorEmail ?? null,
        emailRecipient: entry.memberEmail
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)

      await savePayrollReceipt({
        receiptId,
        entryId: input.entryId,
        periodId: entry.periodId,
        memberId: entry.memberId,
        payRegime: entry.payRegime,
        revision,
        sourceEventId,
        status: 'generation_failed',
        assetId,
        storagePath,
        generatedBy: input.actorEmail ?? null,
        generationError: errorMsg,
        emailRecipient: entry.memberEmail
      })

      return { status: 'failed_generation', receiptId, resendId: null, error: errorMsg }
    }
  }

  // 5. Cargar PDF (desde memoria si lo regeneramos, sino del bucket).
  let attachmentBuffer: Buffer

  try {
    attachmentBuffer =
      pdfBuffer ||
      (storagePath
        ? Buffer.from((await downloadGreenhouseMediaAsset(storagePath)).arrayBuffer)
        : Buffer.from(await generatePayrollReceiptPdf(input.entryId)))
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    return { status: 'failed_generation', receiptId, resendId: null, error: errorMsg }
  }

  // 6. Send email.
  const attachmentName = buildAttachmentName(entry.periodId, entry.memberId, revision)

  const baseReceipt: PayrollReceiptRecord = {
    receiptId,
    entryId: input.entryId,
    periodId: entry.periodId,
    memberId: entry.memberId,
    payRegime: entry.payRegime,
    revision,
    sourceEventId,
    status: 'generated',
    assetId,
    storageBucket,
    storagePath,
    fileSizeBytes: attachmentBuffer.byteLength,
    generatedAt: new Date().toISOString(),
    generatedBy: input.actorEmail ?? null,
    generationError: null,
    emailRecipient: entry.memberEmail,
    emailSentAt: null,
    emailDeliveryId: null,
    emailError: null,
    templateVersion: null,
    deliveryTrigger: null,
    paymentOrderLineId: null,
    createdAt: null,
    updatedAt: null
  }

  let sendResult

  try {
    sendResult = await sendEmail({
      emailType: 'payroll_receipt',
      domain: 'payroll',
      recipients: [{
        userId: entry.memberId,
        email: entry.memberEmail,
        name: entry.memberName
      }],
      context: {
        fullName: entry.memberName,
        periodYear: period.year,
        periodMonth: period.month,
        entryCurrency: entry.currency,
        grossTotal: entry.grossTotal,
        totalDeductions: entry.chileTotalDeductions,
        netTotal: entry.netTotal,
        payRegime: entry.payRegime,
        receiptFilename: attachmentName,
        pdfBuffer: attachmentBuffer
      },
      sourceEntity: baseReceipt.periodId,
      actorEmail: input.actorEmail ?? undefined
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    await savePayrollReceipt({
      ...baseReceipt,
      status: 'email_failed',
      emailError: errorMsg,
      deliveryTrigger: input.trigger,
      paymentOrderLineId: input.paymentOrderLineId ?? null
    })

    return { status: 'failed_email', receiptId, resendId: null, error: errorMsg }
  }

  if (sendResult?.status === 'sent') {
    await savePayrollReceipt({
      ...baseReceipt,
      status: 'email_sent',
      emailSentAt: new Date().toISOString(),
      emailDeliveryId: sendResult.resendId,
      templateVersion: RECEIPT_TEMPLATE_VERSION,
      deliveryTrigger: input.trigger,
      paymentOrderLineId: input.paymentOrderLineId ?? null
    })

    return { status: 'sent', receiptId, resendId: sendResult.resendId, error: null }
  }

  // sendResult exists but not sent (e.g. queued, failed locally).
  await savePayrollReceipt({
    ...baseReceipt,
    status: 'email_failed',
    emailError: sendResult?.error || 'Email delivery skipped.',
    deliveryTrigger: input.trigger,
    paymentOrderLineId: input.paymentOrderLineId ?? null
  })

  return { status: 'failed_email', receiptId, resendId: null, error: sendResult?.error || 'Email delivery skipped.' }
}
