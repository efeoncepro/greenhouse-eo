import 'server-only'

import { Buffer } from 'node:buffer'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { generatePayrollReceiptPdf } from '@/lib/payroll/generate-payroll-pdf'
import PayrollReceiptEmail from '@/emails/PayrollReceiptEmail'
import {
  assertPayrollPostgresReady
} from '@/lib/payroll/postgres-store'
import {
  buildPayrollReceiptId,
  buildPayrollReceiptStoragePath,
  getLatestPayrollReceiptRevision,
  getPayrollReceiptRowsBySourceEvent,
  savePayrollReceipt,
  type PayrollReceiptRecord
} from '@/lib/payroll/payroll-receipts-store'
import { getEmailFromAddress, getResendClient, isResendConfigured } from '@/lib/resend'
import { downloadGreenhouseMediaAsset, uploadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
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

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatMoney = (value: number, currency: 'CLP' | 'USD') =>
  currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`

const buildEmailSubject = (periodYear: number, periodMonth: number, payRegime: 'chile' | 'international') =>
  payRegime === 'chile'
    ? `Tu recibo de nómina — ${MONTH_NAMES[periodMonth - 1] ?? String(periodMonth)} ${periodYear}`
    : `Your payment statement — ${MONTH_NAMES[periodMonth - 1] ?? String(periodMonth)} ${periodYear}`

const buildEmailText = (params: {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  grossTotal: number
  totalDeductions: number | null
  netTotal: number
  payRegime: 'chile' | 'international'
}) => {
  const monthName = MONTH_NAMES[params.periodMonth - 1] ?? String(params.periodMonth)
  const firstName = params.fullName.split(' ')[0] || params.fullName

  return params.payRegime === 'chile'
    ? [
        `Hola ${firstName},`,
        '',
        `Tu recibo de nómina de ${monthName} ${params.periodYear} ya está disponible.`,
        '',
        `Resumen:`,
        `- Bruto: ${formatMoney(params.grossTotal, params.entryCurrency)}`,
        `- Descuentos: ${formatMoney(params.totalDeductions ?? 0, params.entryCurrency)}`,
        `- Líquido: ${formatMoney(params.netTotal, params.entryCurrency)}`,
        '',
        'Adjuntamos el PDF de tu recibo.',
        '',
        '— Greenhouse by Efeonce Group'
      ].join('\n')
    : [
        `Hi ${firstName},`,
        '',
        `Your payment statement for ${monthName} ${params.periodYear} is ready.`,
        '',
        `Summary:`,
        `- Gross: ${formatMoney(params.grossTotal, params.entryCurrency)}`,
        `- Deductions: ${formatMoney(params.totalDeductions ?? 0, params.entryCurrency)}`,
        `- Net payment: ${formatMoney(params.netTotal, params.entryCurrency)}`,
        '',
        'We attached the PDF for your records.',
        '',
        '— Greenhouse by Efeonce Group'
      ].join('\n')
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
  if (!isResendConfigured() || !params.entry.memberEmail) {
    return null
  }

  const resend = getResendClient()
  const attachmentName = `receipt-${params.receipt.periodId}-${params.entry.memberId}-r${params.receipt.revision}.pdf`

  const result = await resend.emails.send({
    from: getEmailFromAddress(),
    to: params.entry.memberEmail,
    subject: buildEmailSubject(params.periodYear, params.periodMonth, params.entry.payRegime),
    react: PayrollReceiptEmail({
      fullName: params.entry.memberName,
      periodYear: params.periodYear,
      periodMonth: params.periodMonth,
      entryCurrency: params.entry.currency,
      grossTotal: params.entry.grossTotal,
      totalDeductions: params.entry.chileTotalDeductions,
      netTotal: params.entry.netTotal,
      payRegime: params.entry.payRegime
    }),
    text: buildEmailText({
      fullName: params.entry.memberName,
      periodYear: params.periodYear,
      periodMonth: params.periodMonth,
      entryCurrency: params.entry.currency,
      grossTotal: params.entry.grossTotal,
      totalDeductions: params.entry.chileTotalDeductions,
      netTotal: params.entry.netTotal,
      payRegime: params.entry.payRegime
    }),
    attachments: [
      {
        filename: attachmentName,
        content: params.pdfBuffer.toString('base64'),
        contentType: 'application/pdf'
      }
    ]
  } as any)

  return result?.data?.id ?? null
}

export const generatePayrollReceiptsForPeriod = async (
  input: GeneratePayrollReceiptsInput
): Promise<GeneratePayrollReceiptsResult> => {
  await assertPayrollPostgresReady()

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

    if (!existing || existing.status === 'generation_failed' || !existing.storagePath) {
      try {
        pdfBuffer = await generatePayrollReceiptPdf(entry.entryId)

        receiptStoragePath = await uploadGreenhouseStorageObject({
          objectName,
          contentType: 'application/pdf',
          bytes: pdfBuffer,
          cacheControl: 'private, max-age=0, must-revalidate'
        })

        const receiptBucket = receiptStoragePath.split('/')[2] || null

        await savePayrollReceipt({
          receiptId,
          entryId: entry.entryId,
          periodId: input.periodId,
          memberId: entry.memberId,
          payRegime: entry.payRegime,
          revision,
          sourceEventId: input.sourceEventId,
          status: 'generated',
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

      const resendId = await sendReceiptEmail({
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
          createdAt: null,
          updatedAt: null
        }
      })

      await savePayrollReceipt({
        receiptId,
        entryId: entry.entryId,
        periodId: input.periodId,
        memberId: entry.memberId,
        payRegime: entry.payRegime,
        revision,
        sourceEventId: input.sourceEventId,
        status: 'email_sent',
        storagePath: receiptStoragePath,
        emailRecipient: entry.memberEmail,
        emailSentAt: new Date().toISOString(),
        emailDeliveryId: resendId,
        generatedBy: input.actorEmail ?? null
      })

      emailed++
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
