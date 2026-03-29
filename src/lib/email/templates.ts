import 'server-only'

import InvitationEmail from '@/emails/InvitationEmail'
import NotificationEmail from '@/emails/NotificationEmail'
import PasswordResetEmail from '@/emails/PasswordResetEmail'
import PayrollExportReadyEmail, { type CurrencyBreakdown } from '@/emails/PayrollExportReadyEmail'
import PayrollReceiptEmail from '@/emails/PayrollReceiptEmail'
import VerifyEmail from '@/emails/VerifyEmail'

import type {
  EmailAttachment,
  EmailTemplateContext,
  EmailTemplateRenderResult,
  EmailTemplateResolver,
  EmailType
} from './types'

type ResolverMap = Map<EmailType, EmailTemplateResolver<any>>

const EMAIL_TEMPLATES: ResolverMap = new Map()

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatMoney = (value: number, currency: string) =>
  currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`

const formatShortDateTime = (value: string | null | undefined) => {
  if (!value) return null

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

const buildPayrollExportPlainText = (context: {
  periodLabel: string
  entryCount: number
  breakdowns: CurrencyBreakdown[]
  netTotalDisplay: string
  exportedBy?: string | null
  exportedAt?: string | null
}) => [
  `NÓMINA — ${context.periodLabel.toUpperCase()}`,
  '═══════════════════',
  '',
  'Nómina cerrada y lista para revisión.',
  '',
  `Colaboradores: ${context.entryCount}`,
  '',
  ...context.breakdowns.flatMap(b => [
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
  context.exportedBy ? `Exportado por ${context.exportedBy}` : 'Exportado por Greenhouse',
  context.exportedAt ? `Fecha: ${formatShortDateTime(context.exportedAt) ?? context.exportedAt}` : '',
  '',
  '→ Ver nómina en Greenhouse:',
  `  ${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/hr/payroll`,
  '',
  '— Greenhouse by Efeonce Group'
].filter(Boolean).join('\n')

const buildPayrollReceiptPlainText = (context: {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  grossTotal: number
  totalDeductions: number | null
  netTotal: number
  payRegime: 'chile' | 'international'
}) => {
  const monthName = MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)
  const firstName = context.fullName.split(' ')[0] || context.fullName

  return context.payRegime === 'chile'
    ? [
        `Hola ${firstName},`,
        '',
        `Tu recibo de nómina de ${monthName} ${context.periodYear} ya está disponible.`,
        '',
        'Resumen:',
        `- Bruto: ${formatMoney(context.grossTotal, context.entryCurrency)}`,
        `- Descuentos: ${formatMoney(context.totalDeductions ?? 0, context.entryCurrency)}`,
        `- Líquido: ${formatMoney(context.netTotal, context.entryCurrency)}`,
        '',
        'Adjuntamos el PDF de tu recibo.',
        '',
        '— Greenhouse by Efeonce Group'
      ].join('\n')
    : [
        `Hi ${firstName},`,
        '',
        `Your payment statement for ${monthName} ${context.periodYear} is ready.`,
        '',
        'Summary:',
        `- Gross: ${formatMoney(context.grossTotal, context.entryCurrency)}`,
        `- Deductions: ${formatMoney(context.totalDeductions ?? 0, context.entryCurrency)}`,
        `- Net payment: ${formatMoney(context.netTotal, context.entryCurrency)}`,
        '',
        'We attached the PDF for your records.',
        '',
        '— Greenhouse by Efeonce Group'
      ].join('\n')
}

const buildNotificationPlainText = (context: {
  title: string
  body?: string
  actionUrl?: string
  recipientName?: string
}) => [
  context.recipientName ? `Hola ${context.recipientName.split(' ')[0]},` : 'Hola,',
  '',
  context.title,
  context.body || '',
  '',
  context.actionUrl ? `Ver más: ${context.actionUrl}` : '',
  '',
  '— Greenhouse by Efeonce Group'
].filter(Boolean).join('\n')

export function registerTemplate<TContext extends EmailTemplateContext>(
  emailType: EmailType,
  resolver: EmailTemplateResolver<TContext>
) {
  EMAIL_TEMPLATES.set(emailType, resolver as EmailTemplateResolver<any>)
}

export function resolveTemplate<TContext extends EmailTemplateContext>(
  emailType: EmailType,
  context: TContext
): EmailTemplateRenderResult {
  const resolver = EMAIL_TEMPLATES.get(emailType)

  if (!resolver) {
    throw new Error(`No email template registered for ${emailType}`)
  }

  return resolver(context)
}

export const listRegisteredTemplates = () => Array.from(EMAIL_TEMPLATES.keys())

registerTemplate('password_reset', (context: {
  resetUrl: string
  userName?: string
}) => ({
  subject: 'Restablece tu contraseña — Greenhouse',
  react: PasswordResetEmail({ resetUrl: context.resetUrl, userName: context.userName }),
  text: [
    'Restablece tu contraseña en Greenhouse.',
    '',
    `Enlace: ${context.resetUrl}`
  ].join('\n')
}))

registerTemplate('invitation', (context: {
  inviteUrl: string
  inviterName: string
  clientName: string
  userName?: string
}) => ({
  subject: 'Te invitaron a Greenhouse — Efeonce',
  react: InvitationEmail(context),
  text: [
    `${context.inviterName} te invitó a ${context.clientName} en Greenhouse.`,
    '',
    `Activa tu cuenta: ${context.inviteUrl}`
  ].join('\n')
}))

registerTemplate('verify_email', (context: {
  verifyUrl: string
  userName?: string
}) => ({
  subject: 'Confirma tu correo — Greenhouse',
  react: VerifyEmail({ verifyUrl: context.verifyUrl, userName: context.userName }),
  text: [
    'Confirma tu correo en Greenhouse.',
    '',
    `Enlace: ${context.verifyUrl}`
  ].join('\n')
}))

registerTemplate('notification', (context: {
  title: string
  body?: string
  actionUrl?: string
  actionLabel?: string
  recipientName?: string
}) => ({
  subject: context.title,
  react: NotificationEmail({
    title: context.title,
    body: context.body,
    actionUrl: context.actionUrl,
    actionLabel: context.actionLabel,
    recipientName: context.recipientName
  }),
  text: buildNotificationPlainText(context)
}))

registerTemplate('payroll_export', (context: {
  periodLabel: string
  entryCount: number
  breakdowns: CurrencyBreakdown[]
  netTotalDisplay: string
  exportedBy?: string | null
  exportedAt?: string | null
  attachments?: EmailAttachment[]
}) => ({
  subject: `Nómina cerrada — ${context.periodLabel} · ${context.entryCount} colaboradores`,
  react: PayrollExportReadyEmail({
    periodLabel: context.periodLabel,
    entryCount: context.entryCount,
    breakdowns: context.breakdowns,
    netTotalDisplay: context.netTotalDisplay,
    exportedBy: context.exportedBy ?? undefined,
    exportedAt: formatShortDateTime(context.exportedAt) ?? undefined
  }),
  text: buildPayrollExportPlainText(context),
  attachments: context.attachments
}))

registerTemplate('payroll_receipt', (context: {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  grossTotal: number
  totalDeductions: number | null
  netTotal: number
  payRegime: 'chile' | 'international'
  receiptFilename: string
  pdfBuffer: Buffer
}) => ({
  subject: context.payRegime === 'chile'
    ? `Tu recibo de nómina — ${MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)} ${context.periodYear}`
    : `Your payment statement — ${MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)} ${context.periodYear}`,
  react: PayrollReceiptEmail({
    fullName: context.fullName,
    periodYear: context.periodYear,
    periodMonth: context.periodMonth,
    entryCurrency: context.entryCurrency,
    grossTotal: context.grossTotal,
    totalDeductions: context.totalDeductions,
    netTotal: context.netTotal,
    payRegime: context.payRegime
  }),
  text: buildPayrollReceiptPlainText(context),
  attachments: [{
    filename: context.receiptFilename,
    content: context.pdfBuffer,
    contentType: 'application/pdf'
  }]
}))
