import 'server-only'

import { Buffer } from 'node:buffer'

import { generatePayrollPeriodPdf } from '@/lib/payroll/generate-payroll-pdf'
import { generatePayrollCsv } from '@/lib/payroll/export-payroll'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import PayrollExportReadyEmail from '@/emails/PayrollExportReadyEmail'
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

const summarizeCurrency = (
  entries: Awaited<ReturnType<typeof getPayrollEntries>>,
  selector: (entry: Awaited<ReturnType<typeof getPayrollEntries>>[number]) => number
) => {
  const totals = new Map<string, number>()

  for (const entry of entries) {
    const currency = entry.currency || 'CLP'

    totals.set(currency, (totals.get(currency) || 0) + selector(entry))
  }

  const items = Array.from(totals.entries()).map(([currency, total]) => formatMoney(total, currency))

  if (items.length === 0) {
    return '—'
  }

  return items.length === 1 ? items[0] : `Mixto (${items.join(' / ')})`
}

export const sendPayrollExportReadyNotification = async (periodId: string, actorEmail?: string | null) => {
  if (!isResendConfigured()) {
    return null
  }

  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new Error('Payroll period not found.')
  }

  const entries = await getPayrollEntries(periodId)
  const pdfBuffer = await generatePayrollPeriodPdf(periodId)
  const csv = await generatePayrollCsv(periodId)
  const monthName = MONTH_NAMES[period.month - 1] ?? String(period.month)
  const periodLabel = `${monthName} ${period.year}`
  const grossSummary = summarizeCurrency(entries, entry => entry.grossTotal)
  const netSummary = summarizeCurrency(entries, entry => entry.netTotal)
  const resend = getResendClient()

  const result = await resend.emails.send({
    from: getEmailFromAddress(),
    to: [...PAYROLL_EXPORT_READY_RECIPIENTS],
    subject: `Payroll exportado — ${periodLabel}`,
    react: PayrollExportReadyEmail({
      periodLabel,
      entryCount: entries.length,
      grossTotal: grossSummary,
      netTotal: netSummary,
      exportedBy: actorEmail
    }),
    text: [
      `Payroll ${periodLabel} exportado y listo para revisar.`,
      '',
      `Colaboradores: ${entries.length}`,
      `Bruto total: ${grossSummary}`,
      `Neto total: ${netSummary}`,
      '',
      'Adjuntamos el PDF de período y el CSV de soporte.',
      '',
      '— Greenhouse by Efeonce Group'
    ].join('\n'),
    attachments: [
      {
        filename: `payroll-${period.periodId}.pdf`,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf'
      },
      {
        filename: `payroll-${period.periodId}.csv`,
        content: Buffer.from(csv, 'utf8').toString('base64'),
        contentType: 'text/csv; charset=utf-8'
      }
    ]
  } as any)

  return result?.data?.id ?? null
}
