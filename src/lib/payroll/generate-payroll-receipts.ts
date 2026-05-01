import 'server-only'

import { Buffer } from 'node:buffer'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { generatePayrollReceiptPdf, RECEIPT_TEMPLATE_VERSION } from '@/lib/payroll/generate-payroll-pdf'
import {
  assertPayrollReceiptsReady
} from '@/lib/payroll/postgres-store'
import {
  buildPayrollReceiptId,
  buildPayrollReceiptStoragePath,
  getLatestPayrollReceiptRevision,
  getPayrollReceiptRowsBySourceEvent,
  savePayrollReceipt,
  type PayrollReceiptRecord
} from '@/lib/payroll/payroll-receipts-store'
import { sendEmail } from '@/lib/email/delivery'
import { downloadGreenhouseMediaAsset, uploadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
import { getGreenhousePrivateAssetsBucket, upsertSystemGeneratedAsset } from '@/lib/storage/greenhouse-assets'
import { PayrollValidationError } from '@/lib/payroll/shared'

export interface GeneratePayrollReceiptsInput {
  periodId: string
  sourceEventId: string
  actorEmail?: string | null
  sendEmails?: boolean
}

export interface GeneratePayrollReceiptsResult {
  periodId: string
  revision: number
  totalEntries: number
  generated: number
  reused: number
  emailed: number
  generationFailed: number
  emailFailed: number
  skippedNoEmail: number
}

const getPayrollReceiptBatchRevision = async ({
  periodId,
  sourceEventId
}: {
  periodId: string
  sourceEventId: string
}) => {
  const existing = await getPayrollReceiptRowsBySourceEvent(sourceEventId)

  if (existing.length > 0) {
    return existing[0].revision
  }

  return getLatestPayrollReceiptRevision(periodId)
}

const sendReceiptEmail = async (params: {
  entry: Awaited<ReturnType<typeof getPayrollEntries>>[number]
  periodYear: number
  periodMonth: number
  pdfBuffer: Buffer
  receipt: PayrollReceiptRecord
}) => {
  if (!params.entry.memberEmail) {
    return null
  }

  const attachmentName = `receipt-${params.receipt.periodId}-${params.entry.memberId}-r${params.receipt.revision}.pdf`

  return sendEmail({
    emailType: 'payroll_receipt',
    domain: 'payroll',
    recipients: [{
      userId: params.entry.memberId,
      email: params.entry.memberEmail,
      name: params.entry.memberName
    }],
    context: {
      fullName: params.entry.memberName,
      periodYear: params.periodYear,
      periodMonth: params.periodMonth,
      entryCurrency: params.entry.currency,
      grossTotal: params.entry.grossTotal,
      totalDeductions: params.entry.chileTotalDeductions,
      netTotal: params.entry.netTotal,
      payRegime: params.entry.payRegime,
      receiptFilename: attachmentName,
      pdfBuffer: params.pdfBuffer
    },
    sourceEntity: params.receipt.periodId,
    actorEmail: params.receipt.generatedBy ?? undefined
  })
}

export const generatePayrollReceiptsForPeriod = async (
  input: GeneratePayrollReceiptsInput
): Promise<GeneratePayrollReceiptsResult> => {
  await assertPayrollReceiptsReady()

  const period = await getPayrollPeriod(input.periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate receipts.', 409)
  }

  const entries = await getPayrollEntries(input.periodId)
  const existingReceipts = await getPayrollReceiptRowsBySourceEvent(input.sourceEventId)
  const existingByEntryId = new Map(existingReceipts.map(receipt => [receipt.entryId, receipt]))

  const revision = await getPayrollReceiptBatchRevision({
    periodId: input.periodId,
    sourceEventId: input.sourceEventId
  })

  let generated = 0
  let reused = 0
  let emailed = 0
  let generationFailed = 0
  let emailFailed = 0
  let skippedNoEmail = 0

  for (const entry of entries) {
    const existing = existingByEntryId.get(entry.entryId)
    const receiptId = existing?.receiptId || buildPayrollReceiptId(entry.entryId, revision)

    const objectName = existing?.storagePath
      ? existing.storagePath.replace(/^gs:\/\/[^/]+\//, '')
      : buildPayrollReceiptStoragePath(period.periodId, entry.memberId, revision)

    let pdfBuffer: Buffer | null = null
    let receiptStoragePath = existing?.storagePath || null
    let currentAssetId = existing?.assetId ?? null

    if (!existing || existing.status === 'generation_failed' || !existing.storagePath) {
      try {
        pdfBuffer = await generatePayrollReceiptPdf(entry.entryId)

        receiptStoragePath = await uploadGreenhouseStorageObject({
          bucketName: getGreenhousePrivateAssetsBucket(),
          objectName,
          contentType: 'application/pdf',
          bytes: pdfBuffer,
          cacheControl: 'private, max-age=0, must-revalidate'
        })

        const receiptBucket = receiptStoragePath.split('/')[2] || null

        const asset = receiptBucket
          ? await upsertSystemGeneratedAsset({
              assetId: existing?.assetId ?? null,
              ownerAggregateType: 'payroll_receipt',
              ownerAggregateId: receiptId,
              ownerMemberId: entry.memberId,
              bucketName: receiptBucket,
              objectPath: objectName,
              fileName: `receipt-${input.periodId}-${entry.memberId}-r${revision}.pdf`,
              mimeType: 'application/pdf',
              sizeBytes: pdfBuffer.byteLength,
              actorUserId: input.actorEmail ?? null,
              metadata: {
                entryId: entry.entryId,
                periodId: input.periodId,
                payRegime: entry.payRegime
              }
            })
          : null

        currentAssetId = asset?.assetId ?? currentAssetId

        await savePayrollReceipt({
          receiptId,
          entryId: entry.entryId,
          periodId: input.periodId,
          memberId: entry.memberId,
          payRegime: entry.payRegime,
          revision,
          sourceEventId: input.sourceEventId,
          status: 'generated',
          assetId: currentAssetId,
          storageBucket: receiptBucket,
          storagePath: receiptStoragePath,
          fileSizeBytes: pdfBuffer.byteLength,
          generatedAt: new Date().toISOString(),
          generatedBy: input.actorEmail ?? null,
          emailRecipient: entry.memberEmail
        })

        generated++
      } catch (error) {
        generationFailed++

        await savePayrollReceipt({
          receiptId,
          entryId: entry.entryId,
          periodId: input.periodId,
          memberId: entry.memberId,
          payRegime: entry.payRegime,
          revision,
          sourceEventId: input.sourceEventId,
          status: 'generation_failed',
          assetId: currentAssetId,
          storagePath: receiptStoragePath,
          generatedBy: input.actorEmail ?? null,
          generationError: error instanceof Error ? error.message : String(error),
          emailRecipient: entry.memberEmail
        })

        continue
      }
    } else {
      reused++
    }

    if (!input.sendEmails) {
      continue
    }

    if (!entry.memberEmail) {
      skippedNoEmail++
      continue
    }

    if (existing?.status === 'email_sent' && existing.emailSentAt) {
      continue
    }

    try {
      const attachmentBuffer =
        pdfBuffer ||
        (receiptStoragePath
          ? Buffer.from((await downloadGreenhouseMediaAsset(receiptStoragePath)).arrayBuffer)
          : Buffer.from((await generatePayrollReceiptPdf(entry.entryId))))

      const sendResult = await sendReceiptEmail({
        entry,
        periodYear: period.year,
        periodMonth: period.month,
        pdfBuffer: attachmentBuffer,
        receipt: {
          receiptId,
          entryId: entry.entryId,
          periodId: input.periodId,
          memberId: entry.memberId,
          payRegime: entry.payRegime,
          revision,
          sourceEventId: input.sourceEventId,
          status: 'generated',
          assetId: currentAssetId,
          storageBucket: null,
          storagePath: receiptStoragePath,
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
      })

      if (sendResult?.status === 'sent') {
        await savePayrollReceipt({
          receiptId,
          entryId: entry.entryId,
          periodId: input.periodId,
          memberId: entry.memberId,
          payRegime: entry.payRegime,
          revision,
          sourceEventId: input.sourceEventId,
          status: 'email_sent',
          assetId: currentAssetId,
          storagePath: receiptStoragePath,
          emailRecipient: entry.memberEmail,
          emailSentAt: new Date().toISOString(),
          emailDeliveryId: sendResult.resendId,
          generatedBy: input.actorEmail ?? null,
          templateVersion: RECEIPT_TEMPLATE_VERSION,
          deliveryTrigger: 'period_exported'
        })

        emailed++
      } else if (sendResult) {
        emailFailed++

        await savePayrollReceipt({
          receiptId,
          entryId: entry.entryId,
          periodId: input.periodId,
          memberId: entry.memberId,
          payRegime: entry.payRegime,
          revision,
          sourceEventId: input.sourceEventId,
          status: 'email_failed',
          assetId: currentAssetId,
          storagePath: receiptStoragePath,
          emailRecipient: entry.memberEmail,
          emailError: sendResult.error || 'Email delivery skipped.',
          generatedBy: input.actorEmail ?? null
        })
      }
    } catch (error) {
      emailFailed++

      await savePayrollReceipt({
        receiptId,
        entryId: entry.entryId,
        periodId: input.periodId,
        memberId: entry.memberId,
        payRegime: entry.payRegime,
        revision,
        sourceEventId: input.sourceEventId,
        status: 'email_failed',
        assetId: currentAssetId,
        storagePath: receiptStoragePath,
        emailRecipient: entry.memberEmail,
        emailError: error instanceof Error ? error.message : String(error),
        generatedBy: input.actorEmail ?? null
      })
    }
  }

  return {
    periodId: input.periodId,
    revision,
    totalEntries: entries.length,
    generated,
    reused,
    emailed,
    generationFailed,
    emailFailed,
    skippedNoEmail
  }
}
