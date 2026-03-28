import 'server-only'

import { Buffer } from 'node:buffer'

import { APP_URL } from '@/emails/constants'
import PayrollExportReadyEmail, { type CurrencyBreakdown } from '@/emails/PayrollExportReadyEmail'
import { generatePayrollCsv } from '@/lib/payroll/export-payroll'
import { generatePayrollPeriodPdf } from '@/lib/payroll/generate-payroll-pdf'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import {
  buildPayrollExportPackageDownloadFilename,
  buildPayrollExportPackageStoragePath,
  getPayrollExportPackageByPeriodId,
  PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION,
  recordPayrollExportPackageDelivery,
  upsertPayrollExportPackageArtifacts,
  type PayrollExportPackageRecord
} from '@/lib/payroll/payroll-export-packages-store'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { downloadGreenhouseMediaAsset, getGreenhouseMediaBucket, uploadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
import { getEmailFromAddress, getResendClient, isResendConfigured } from '@/lib/resend'

const PAYROLL_EXPORT_READY_RECIPIENTS = [
  'finance@efeoncepro.com',
  'hhumberly@efeoncepro.com',
  'jreyes@efeoncepro.com'
] as const

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatMoney = (value: number, currency: string) =>
  currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`

const buildBreakdowns = (
  entries: Awaited<ReturnType<typeof getPayrollEntries>>
): CurrencyBreakdown[] => {
  const grouped = new Map<string, { currency: string; regimeLabel: string; gross: number; net: number; count: number }>()

  for (const entry of entries) {
    const currency = entry.currency || 'CLP'
    const existing = grouped.get(currency)

    if (existing) {
      existing.gross += entry.grossTotal
      existing.net += entry.netTotal
      existing.count++
    } else {
      grouped.set(currency, {
        currency,
        regimeLabel: entry.payRegime === 'chile' ? 'Chile' : 'Internacional',
        gross: entry.grossTotal,
        net: entry.netTotal,
        count: 1
      })
    }
  }

  return Array.from(grouped.values()).map(g => ({
    currency: g.currency,
    regimeLabel: g.regimeLabel,
    grossTotal: formatMoney(g.gross, g.currency),
    netTotal: formatMoney(g.net, g.currency),
    entryCount: g.count
  }))
}

const buildNetTotalDisplay = (breakdowns: CurrencyBreakdown[]) =>
  breakdowns.map(b => b.netTotal).join(' + ') || '—'

export interface PayrollExportPackageAssets {
  periodId: string
  periodYear: number
  periodMonth: number
  entries: Awaited<ReturnType<typeof getPayrollEntries>>
  pdfBuffer: Buffer
  csvBuffer: Buffer
  record: PayrollExportPackageRecord
  wasGenerated: boolean
}

export interface PayrollExportArtifactDelivery {
  buffer: Buffer
  contentType: string
  filename: string
  record: PayrollExportPackageRecord
  wasGenerated: boolean
}

export const buildPayrollExportArtifactFilename = (periodId: string, kind: 'pdf' | 'csv') =>
  buildPayrollExportPackageDownloadFilename(periodId, kind)

const readStoredArtifact = async (storagePath: string) =>
  Buffer.from((await downloadGreenhouseMediaAsset(storagePath)).arrayBuffer)

const canReuseStoredPackage = (record: PayrollExportPackageRecord) =>
  record.pdfTemplateVersion === PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION &&
  record.csvTemplateVersion === PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION &&
  Boolean(record.pdfStoragePath) &&
  Boolean(record.csvStoragePath)

const generateAndPersistPackage = async (params: {
  periodId: string
  generatedBy?: string | null
}) => {
  const pdfBuffer = await generatePayrollPeriodPdf(params.periodId)
  const csvText = await generatePayrollCsv(params.periodId)
  const csvBuffer = Buffer.from(csvText, 'utf8')
  const storageBucket = getGreenhouseMediaBucket()
  const pdfStoragePath = buildPayrollExportPackageStoragePath(params.periodId, 'pdf')
  const csvStoragePath = buildPayrollExportPackageStoragePath(params.periodId, 'csv')

  const [pdfUploadedPath, csvUploadedPath] = await Promise.all([
    uploadGreenhouseStorageObject({
      objectName: pdfStoragePath,
      contentType: 'application/pdf',
      bytes: pdfBuffer,
      cacheControl: 'private, max-age=0, must-revalidate'
    }),
    uploadGreenhouseStorageObject({
      objectName: csvStoragePath,
      contentType: 'text/csv; charset=utf-8',
      bytes: csvBuffer,
      cacheControl: 'private, max-age=0, must-revalidate'
    })
  ])

  const record = await upsertPayrollExportPackageArtifacts({
    periodId: params.periodId,
    storageBucket,
    pdfStoragePath: pdfUploadedPath,
    csvStoragePath: csvUploadedPath,
    pdfFileSizeBytes: pdfBuffer.byteLength,
    csvFileSizeBytes: csvBuffer.byteLength,
    pdfTemplateVersion: PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION,
    csvTemplateVersion: PAYROLL_EXPORT_PACKAGE_TEMPLATE_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: params.generatedBy ?? null
  })

  if (!record) {
    throw new Error('Unable to persist payroll export package.')
  }

  return {
    pdfBuffer,
    csvBuffer,
    record,
    wasGenerated: true
  }
}

export const getOrCreatePayrollExportPackageAssets = async (
  periodId: string,
  generatedBy?: string | null
): Promise<PayrollExportPackageAssets> => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved or exported periods can generate reports.', 409)
  }

  const entries = await getPayrollEntries(periodId)
  const existing = await getPayrollExportPackageByPeriodId(periodId)

  if (existing && canReuseStoredPackage(existing)) {
    try {
      const [pdfBuffer, csvBuffer] = await Promise.all([
        readStoredArtifact(existing.pdfStoragePath as string),
        readStoredArtifact(existing.csvStoragePath as string)
      ])

      return {
        periodId,
        periodYear: period.year,
        periodMonth: period.month,
        entries,
        pdfBuffer,
        csvBuffer,
        record: existing,
        wasGenerated: false
      }
    } catch {
      // Fall through to regeneration if either artifact is missing or stale.
    }
  }

  const generated = await generateAndPersistPackage({
    periodId,
    generatedBy
  })

  return {
    periodId,
    periodYear: period.year,
    periodMonth: period.month,
    entries,
    pdfBuffer: generated.pdfBuffer,
    csvBuffer: generated.csvBuffer,
    record: generated.record,
    wasGenerated: generated.wasGenerated
  }
}

export const getPayrollExportArtifact = async (
  periodId: string,
  kind: 'pdf' | 'csv',
  generatedBy?: string | null
): Promise<PayrollExportArtifactDelivery> => {
  const assets = await getOrCreatePayrollExportPackageAssets(periodId, generatedBy)
  const buffer = kind === 'pdf' ? assets.pdfBuffer : assets.csvBuffer
  const contentType = kind === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8'

  return {
    buffer,
    contentType,
    filename: buildPayrollExportArtifactFilename(periodId, kind),
    record: assets.record,
    wasGenerated: assets.wasGenerated
  }
}

export const sendPayrollExportReadyNotification = async (periodId: string, actorEmail?: string | null) => {
  const assets = await getOrCreatePayrollExportPackageAssets(periodId, actorEmail)

  if (!isResendConfigured()) {
    return null
  }

  const monthName = MONTH_NAMES[assets.periodMonth - 1] ?? String(assets.periodMonth)
  const periodLabel = `${monthName} ${assets.periodYear}`
  const breakdowns = buildBreakdowns(assets.entries)
  const netTotalDisplay = buildNetTotalDisplay(breakdowns)

  const exportedAt = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const resend = getResendClient()

  try {
    const result = await resend.emails.send({
      from: getEmailFromAddress(),
      to: [...PAYROLL_EXPORT_READY_RECIPIENTS],
      subject: `Nómina cerrada — ${periodLabel} · ${assets.entries.length} colaboradores`,
      react: PayrollExportReadyEmail({
        periodLabel,
        entryCount: assets.entries.length,
        breakdowns,
        netTotalDisplay,
        exportedBy: actorEmail,
        exportedAt
      }),
      text: [
        `NÓMINA — ${periodLabel.toUpperCase()}`,
        '═══════════════════',
        '',
        'Nómina cerrada y lista para revisión.',
        '',
        `Colaboradores: ${assets.entries.length}`,
        '',
        ...breakdowns.flatMap(b => [
          `${b.regimeLabel} (${b.currency})`,
          `  Bruto:  ${b.grossTotal}`,
          `  Neto:   ${b.netTotal}`,
          ''
        ]),
        '───────────────────',
        'ADJUNTOS',
        '• Reporte de nómina (PDF) — resumen por colaborador',
        '• Detalle de nómina (CSV) — desglose completo para contabilidad',
        '',
        actorEmail ? `Exportado por ${actorEmail} · ${exportedAt}` : `Exportado: ${exportedAt}`,
        '',
        '→ Ver nómina en Greenhouse:',
        `  ${APP_URL}/hr/payroll`,
        '',
        '— Greenhouse by Efeonce Group'
      ].join('\n'),
      attachments: [
        {
          filename: buildPayrollExportArtifactFilename(periodId, 'pdf'),
          content: assets.pdfBuffer.toString('base64'),
          contentType: 'application/pdf'
        },
        {
          filename: buildPayrollExportArtifactFilename(periodId, 'csv'),
          content: assets.csvBuffer.toString('base64'),
          contentType: 'text/csv; charset=utf-8'
        }
      ]
    } as any)

    const deliveryId = result?.data?.id ?? null

    await recordPayrollExportPackageDelivery({
      periodId,
      deliveryStatus: 'sent',
      deliveryAttemptsDelta: 1,
      lastSentAt: new Date().toISOString(),
      lastSentBy: actorEmail ?? null,
      lastEmailDeliveryId: deliveryId,
      lastSendError: null
    })

    return deliveryId
  } catch (error) {
    await recordPayrollExportPackageDelivery({
      periodId,
      deliveryStatus: 'failed',
      deliveryAttemptsDelta: 1,
      lastSentAt: null,
      lastSentBy: actorEmail ?? null,
      lastEmailDeliveryId: null,
      lastSendError: error instanceof Error ? error.message : 'Failed to send payroll export ready email.'
    })

    throw error
  }
}
