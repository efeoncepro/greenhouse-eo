import 'server-only'

import InvitationEmail from '@/emails/InvitationEmail'
import LeaveRequestDecisionEmail from '@/emails/LeaveRequestDecisionEmail'
import LeaveRequestPendingReviewEmail from '@/emails/LeaveRequestPendingReviewEmail'
import LeaveRequestSubmittedEmail from '@/emails/LeaveRequestSubmittedEmail'
import LeaveReviewConfirmationEmail from '@/emails/LeaveReviewConfirmationEmail'
import MagicLinkEmail from '@/emails/MagicLinkEmail'
import NotificationEmail from '@/emails/NotificationEmail'
import PasswordResetEmail from '@/emails/PasswordResetEmail'
import PayrollExportReadyEmail, { type CurrencyBreakdown } from '@/emails/PayrollExportReadyEmail'
import PayrollLiquidacionV2Email from '@/emails/PayrollLiquidacionV2Email'
import PayrollReceiptEmail from '@/emails/PayrollReceiptEmail'
import PayrollPaymentCommittedEmail from '@/emails/PayrollPaymentCommittedEmail'
import PayrollPaymentCancelledEmail from '@/emails/PayrollPaymentCancelledEmail'
import BeneficiaryPaymentProfileChangedEmail, {
  type PaymentProfileEmailKind
} from '@/emails/BeneficiaryPaymentProfileChangedEmail'
import QuoteSharePromptEmail from '@/emails/QuoteSharePromptEmail'
import WeeklyExecutiveDigestEmail from '@/emails/WeeklyExecutiveDigestEmail'
import { getMicrocopy } from '@/lib/copy'
import VerifyEmail from '@/emails/VerifyEmail'
import type { WeeklyDigestEmailContext } from '@/lib/nexa/digest'

import type {
  EmailAttachment,
  EmailPreviewMeta,
  EmailTemplateContext,
  EmailTemplateRenderResult,
  EmailTemplateResolver,
  EmailType
} from './types'

type ResolverMap = Map<EmailType, EmailTemplateResolver<any>>
type PreviewMetaMap = Map<EmailType, EmailPreviewMeta>

const EMAIL_TEMPLATES: ResolverMap = new Map()
const EMAIL_PREVIEW_META: PreviewMetaMap = new Map()

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
}) => {
  const t = getMicrocopy().emails.payroll.exportReady

  return [
    `${t.kickerPrefix.replace(' · ', ' — ')}${context.periodLabel.toUpperCase()}`,
    t.plainTextSeparator,
    '',
    `${t.heading}.`,
    '',
    `${t.collaboratorsLabel}: ${context.entryCount}`,
    '',
    ...context.breakdowns.flatMap(b => [
      `${b.regimeLabel} (${b.currency})`,
      `  ${t.grossLabel}:  ${b.grossTotal}`,
      `  ${t.netLabel}:   ${b.netTotal}`,
      ''
    ]),
    '───────────────────',
    t.plainTextAttachments,
    `• ${t.payrollReportTitle} — ${t.payrollReportPlainTextSubtitle}`,
    `• ${t.payrollDetailTitle} — ${t.payrollDetailPlainTextSubtitle}`,
    '',
    context.exportedBy ? `${t.exportedByPrefix}${context.exportedBy}` : `${t.exportedByPrefix}${t.exportedByFallback}`,
    context.exportedAt ? `${t.exportedAtLabel}: ${formatShortDateTime(context.exportedAt) ?? context.exportedAt}` : '',
    '',
    `→ ${t.plainTextCta}:`,
    `  ${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/hr/payroll`,
    '',
    getMicrocopy().emails.common.brandSignature
  ].filter(Boolean).join('\n')
}

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

const buildPayrollLiquidacionV2PlainText = (context: {
  fullName: string
  periodYear: number
  periodMonth: number
  previousNetTotal: number
  newNetTotal: number
  currency: 'CLP' | 'USD'
  receiptUrl?: string
}) => {
  const monthName = MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)
  const firstName = context.fullName.split(' ')[0] || context.fullName
  const delta = context.newNetTotal - context.previousNetTotal

  const deltaLabel =
    delta > 0
      ? `+${formatMoney(Math.abs(delta), context.currency)}`
      : delta < 0
        ? `-${formatMoney(Math.abs(delta), context.currency)}`
        : 'Sin cambios netos'

  const link = context.receiptUrl ?? `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/my/payroll`

  return [
    `Hola ${firstName},`,
    '',
    `Actualizamos tu liquidación de ${monthName} ${context.periodYear}. Esta versión reemplaza a la anterior y ya está disponible en Greenhouse.`,
    '',
    'Resumen:',
    `- Líquido anterior: ${formatMoney(context.previousNetTotal, context.currency)}`,
    `- Líquido actualizado: ${formatMoney(context.newNetTotal, context.currency)}`,
    `- Diferencia: ${deltaLabel}`,
    '',
    `Ver liquidación actualizada: ${link}`,
    '',
    '— Greenhouse by Efeonce Group'
  ].join('\n')
}

const buildNotificationPlainText = (context: {
  title: string
  body?: string
  actionUrl?: string
  recipientName?: string
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'

  const greeting = locale === 'en'
    ? (context.recipientName ? `Hi ${context.recipientName},` : 'Hi,')
    : (context.recipientName ? `Hola ${context.recipientName.split(' ')[0]},` : 'Hola,')

  const actionPrefix = locale === 'en' ? 'View more:' : 'Ver m\u00e1s:'

  return [
    greeting,
    '',
    context.title,
    context.body || '',
    '',
    context.actionUrl ? `${actionPrefix} ${context.actionUrl}` : '',
    '',
    '\u2014 Greenhouse by Efeonce Group'
  ].filter(Boolean).join('\n')
}

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

export function registerPreviewMeta(emailType: EmailType, meta: EmailPreviewMeta) {
  EMAIL_PREVIEW_META.set(emailType, meta)
}

export function getPreviewMeta(emailType: EmailType): EmailPreviewMeta | null {
  return EMAIL_PREVIEW_META.get(emailType) ?? null
}

export function getPreviewCatalog(): Array<{ emailType: EmailType } & EmailPreviewMeta> {
  return Array.from(EMAIL_PREVIEW_META.entries()).map(([emailType, meta]) => ({
    emailType,
    ...meta
  }))
}

registerTemplate('password_reset', (context: {
  resetUrl: string
  userName?: string
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'

  return {
    subject: locale === 'en'
      ? 'Reset your password \u2014 Greenhouse'
      : 'Restablece tu contrase\u00f1a \u2014 Greenhouse',
    react: PasswordResetEmail({ resetUrl: context.resetUrl, userName: context.userName, locale }),
    text: locale === 'en'
      ? ['Reset your Greenhouse password.', '', `Link: ${context.resetUrl}`].join('\n')
      : ['Restablece tu contrase\u00f1a en Greenhouse.', '', `Enlace: ${context.resetUrl}`].join('\n')
  }
})

// TASK-742 Capa 5 \u2014 Magic-link self-recovery
registerTemplate('magic_link', (context: {
  magicLinkUrl: string
  userName?: string
  locale?: 'es' | 'en'
  expiresInMinutes?: number
}) => {
  const locale = context.locale || 'es'
  const minutes = context.expiresInMinutes ?? 15

  return {
    subject: locale === 'en'
      ? `Sign in to Greenhouse \u2014 link valid ${minutes} min`
      : `Acceso a Greenhouse \u2014 enlace v\u00e1lido ${minutes} min`,
    react: MagicLinkEmail({
      magicLinkUrl: context.magicLinkUrl,
      userName: context.userName,
      locale,
      expiresInMinutes: minutes
    }),
    text: locale === 'en'
      ? [`Sign in to Greenhouse. Valid ${minutes} minutes.`, '', `Link: ${context.magicLinkUrl}`].join('\n')
      : [`Entra a Greenhouse. V\u00e1lido por ${minutes} minutos.`, '', `Enlace: ${context.magicLinkUrl}`].join('\n')
  }
})

registerTemplate('invitation', (context: {
  inviteUrl: string
  inviterName: string
  clientName: string
  userName?: string
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'

  return {
    subject: locale === 'en'
      ? 'You were invited to Greenhouse \u2014 Efeonce'
      : 'Te invitaron a Greenhouse \u2014 Efeonce',
    react: InvitationEmail({ ...context, locale }),
    text: locale === 'en'
      ? [`${context.inviterName} invited you to ${context.clientName} on Greenhouse.`, '', `Activate your account: ${context.inviteUrl}`].join('\n')
      : [`${context.inviterName} te invit\u00f3 a ${context.clientName} en Greenhouse.`, '', `Activa tu cuenta: ${context.inviteUrl}`].join('\n')
  }
})

registerTemplate('verify_email', (context: {
  verifyUrl: string
  userName?: string
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'

  return {
    subject: locale === 'en'
      ? 'Confirm your email \u2014 Greenhouse'
      : 'Confirma tu correo \u2014 Greenhouse',
    react: VerifyEmail({ verifyUrl: context.verifyUrl, userName: context.userName, locale }),
    text: locale === 'en'
      ? ['Confirm your Greenhouse email.', '', `Link: ${context.verifyUrl}`].join('\n')
      : ['Confirma tu correo en Greenhouse.', '', `Enlace: ${context.verifyUrl}`].join('\n')
  }
})

registerTemplate('notification', (context: {
  title: string
  body?: string
  actionUrl?: string
  actionLabel?: string
  recipientName?: string
  locale?: 'es' | 'en'
  unsubscribeUrl?: string
}) => {
  const locale = context.locale || 'es'

  return {
    subject: context.title,
    react: NotificationEmail({
      title: context.title,
      body: context.body,
      actionUrl: context.actionUrl,
      actionLabel: context.actionLabel,
      recipientName: context.recipientName,
      locale,
      unsubscribeUrl: context.unsubscribeUrl
    }),
    text: buildNotificationPlainText({ ...context, locale })
  }
})

registerTemplate('payroll_export', (context: {
  periodLabel: string
  entryCount: number
  breakdowns: CurrencyBreakdown[]
  netTotalDisplay: string
  exportedBy?: string | null
  exportedAt?: string | null
  attachments?: EmailAttachment[]
  unsubscribeUrl?: string
}) => ({
  subject: getMicrocopy().emails.subjects.payrollExport(context.periodLabel, context.entryCount),
  react: PayrollExportReadyEmail({
    periodLabel: context.periodLabel,
    entryCount: context.entryCount,
    breakdowns: context.breakdowns,
    netTotalDisplay: context.netTotalDisplay,
    exportedBy: context.exportedBy ?? undefined,
    exportedAt: formatShortDateTime(context.exportedAt) ?? undefined,
    unsubscribeUrl: context.unsubscribeUrl
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

// TASK-759b — Promesa pre-pago (sin PDF)
registerTemplate('payroll_payment_committed', (context: {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  netTotal: number
  payRegime: 'chile' | 'international'
  scheduledFor: string | null
  processorLabel: string | null
}) => ({
  subject: context.payRegime === 'chile'
    ? `Tu pago de ${MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)} ${context.periodYear} está programado`
    : `Your ${MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)} ${context.periodYear} payment is scheduled`,
  react: PayrollPaymentCommittedEmail({
    fullName: context.fullName,
    periodYear: context.periodYear,
    periodMonth: context.periodMonth,
    entryCurrency: context.entryCurrency,
    netTotal: context.netTotal,
    payRegime: context.payRegime,
    scheduledFor: context.scheduledFor,
    processorLabel: context.processorLabel
  }),
  text: context.payRegime === 'chile'
    ? `Hola ${context.fullName.split(' ')[0]}, tu pago de ${MONTH_NAMES[context.periodMonth - 1]} ${context.periodYear} (${formatMoney(context.netTotal, context.entryCurrency)}) fue aprobado y está programado. Te enviaremos el recibo apenas se ejecute.`
    : `Hi ${context.fullName.split(' ')[0]}, your ${MONTH_NAMES[context.periodMonth - 1]} ${context.periodYear} payment (${formatMoney(context.netTotal, context.entryCurrency)}) has been approved and is scheduled. We will send the receipt once executed.`
}))

registerTemplate('beneficiary_payment_profile_changed', (context: {
  fullName: string
  kind: PaymentProfileEmailKind
  providerLabel: string | null
  bankName: string | null
  accountNumberMasked: string | null
  currency: 'CLP' | 'USD'
  effectiveAt: string | null
  reason: string | null
  requestedByMember: boolean
}) => {
  const t = getMicrocopy().emails.beneficiaryPaymentProfileChanged
  const firstName = context.fullName.split(' ')[0] || context.fullName

  return {
    subject: getMicrocopy().emails.subjects.beneficiaryPaymentProfileChanged[context.kind],
    react: BeneficiaryPaymentProfileChangedEmail({
      fullName: context.fullName,
      kind: context.kind,
      providerLabel: context.providerLabel,
      bankName: context.bankName,
      accountNumberMasked: context.accountNumberMasked,
      currency: context.currency,
      effectiveAt: context.effectiveAt,
      reason: context.reason,
      requestedByMember: context.requestedByMember
    }),
    text: t.plainText[context.kind](firstName, context.accountNumberMasked ?? '••••')
  }
})

// TASK-759c — Compensación cancelación (sin PDF)
registerTemplate('payroll_payment_cancelled', (context: {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  netTotal: number
  payRegime: 'chile' | 'international'
  cancellationReason: string | null
}) => ({
  subject: context.payRegime === 'chile'
    ? `Actualización sobre tu pago de ${MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)} ${context.periodYear}`
    : `Update on your ${MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)} ${context.periodYear} payment`,
  react: PayrollPaymentCancelledEmail({
    fullName: context.fullName,
    periodYear: context.periodYear,
    periodMonth: context.periodMonth,
    entryCurrency: context.entryCurrency,
    netTotal: context.netTotal,
    payRegime: context.payRegime,
    cancellationReason: context.cancellationReason
  }),
  text: context.payRegime === 'chile'
    ? `Hola ${context.fullName.split(' ')[0]}, detectamos un problema con el pago programado de ${MONTH_NAMES[context.periodMonth - 1]} ${context.periodYear} (${formatMoney(context.netTotal, context.entryCurrency)}). Lo estamos resolviendo.`
    : `Hi ${context.fullName.split(' ')[0]}, we detected an issue with the scheduled payment for ${MONTH_NAMES[context.periodMonth - 1]} ${context.periodYear} (${formatMoney(context.netTotal, context.entryCurrency)}). We are resolving it.`
}))

registerTemplate('payroll_liquidacion_v2', (context: {
  fullName: string
  periodYear: number
  periodMonth: number
  previousNetTotal: number
  newNetTotal: number
  currency: 'CLP' | 'USD'
  receiptUrl?: string
}) => ({
  subject: `Tu liquidación de ${MONTH_NAMES[context.periodMonth - 1] ?? String(context.periodMonth)} ${context.periodYear} fue actualizada`,
  react: PayrollLiquidacionV2Email({
    fullName: context.fullName,
    periodYear: context.periodYear,
    periodMonth: context.periodMonth,
    previousNetTotal: context.previousNetTotal,
    newNetTotal: context.newNetTotal,
    currency: context.currency,
    receiptUrl: context.receiptUrl
  }),
  text: buildPayrollLiquidacionV2PlainText(context)
}))

// ── Leave Request Decision (to the requester) ──

type LeaveDecisionStatus = 'approved' | 'rejected' | 'cancelled'

const LEAVE_STATUS_LABELS_ES: Record<LeaveDecisionStatus, string> = {
  approved: 'aprobada',
  rejected: 'no aprobada',
  cancelled: 'cancelada'
}

const LEAVE_STATUS_LABELS_EN: Record<LeaveDecisionStatus, string> = {
  approved: 'approved',
  rejected: 'not approved',
  cancelled: 'cancelled'
}

const buildLeaveDecisionPlainText = (context: {
  memberFirstName: string
  actorName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  status: LeaveDecisionStatus
  notes?: string | null
  locale?: 'es' | 'en'
}) => {
  const isEn = (context.locale || 'es') === 'en'
  const statusLabel = isEn ? LEAVE_STATUS_LABELS_EN[context.status] : LEAVE_STATUS_LABELS_ES[context.status]

  const daysLabel = isEn
    ? `${context.requestedDays} ${context.requestedDays === 1 ? 'day' : 'days'}`
    : `${context.requestedDays} ${context.requestedDays === 1 ? 'día' : 'días'}`

  return [
    isEn ? `Hi ${context.memberFirstName},` : `Hola ${context.memberFirstName},`,
    '',
    isEn
      ? `Your ${context.leaveTypeName} request was ${statusLabel}.`
      : `Tu solicitud de ${context.leaveTypeName} fue ${statusLabel}.`,
    '',
    isEn ? 'Summary:' : 'Resumen:',
    `- ${isEn ? 'Type' : 'Tipo'}: ${context.leaveTypeName}`,
    `- ${isEn ? 'From' : 'Desde'}: ${context.startDate}`,
    `- ${isEn ? 'To' : 'Hasta'}: ${context.endDate}`,
    `- ${isEn ? 'Days' : 'Días'}: ${daysLabel}`,
    '',
    ...(context.notes ? [isEn ? 'Reviewer notes:' : 'Observaciones del revisor:', context.notes, ''] : []),
    `→ ${isEn ? 'View my leave' : 'Ver mis permisos'}: ${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/my/leave`,
    '',
    '— Greenhouse by Efeonce Group'
  ].filter(line => line !== undefined).join('\n')
}

registerTemplate('leave_request_decision', (context: {
  memberFirstName: string
  actorName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  status: LeaveDecisionStatus
  notes?: string | null
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'
  const statusLabel = locale === 'en' ? LEAVE_STATUS_LABELS_EN[context.status] : LEAVE_STATUS_LABELS_ES[context.status]

  return {
    subject: locale === 'en'
      ? `Your ${context.leaveTypeName} request was ${statusLabel} — Greenhouse`
      : `Tu solicitud de ${context.leaveTypeName} fue ${statusLabel} — Greenhouse`,
    react: LeaveRequestDecisionEmail({
      memberFirstName: context.memberFirstName,
      actorName: context.actorName,
      leaveTypeName: context.leaveTypeName,
      startDate: context.startDate,
      endDate: context.endDate,
      requestedDays: context.requestedDays,
      status: context.status,
      notes: context.notes,
      locale
    }),
    text: buildLeaveDecisionPlainText(context)
  }
})

// ── Leave Review Confirmation (to the reviewer) ──

const buildLeaveReviewPlainText = (context: {
  actorFirstName: string
  memberName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  status: LeaveDecisionStatus
  notes?: string | null
  reason?: string | null
  locale?: 'es' | 'en'
}) => {
  const isEn = (context.locale || 'es') === 'en'

  const statusLabel = isEn
    ? { approved: 'approved', rejected: 'rejected', cancelled: 'cancelled' }[context.status]
    : { approved: 'aprobado', rejected: 'rechazado', cancelled: 'cancelado' }[context.status]

  const daysLabel = isEn
    ? `${context.requestedDays} ${context.requestedDays === 1 ? 'day' : 'days'}`
    : `${context.requestedDays} ${context.requestedDays === 1 ? 'día' : 'días'}`

  return [
    isEn ? `Hi ${context.actorFirstName},` : `Hola ${context.actorFirstName},`,
    '',
    isEn
      ? `You ${statusLabel} ${context.memberName}'s ${context.leaveTypeName} request.`
      : `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} la solicitud de ${context.leaveTypeName} de ${context.memberName}.`,
    '',
    isEn ? 'Summary:' : 'Resumen:',
    `- ${isEn ? 'Team member' : 'Colaborador'}: ${context.memberName}`,
    `- ${isEn ? 'Type' : 'Tipo'}: ${context.leaveTypeName}`,
    `- ${isEn ? 'From' : 'Desde'}: ${context.startDate}`,
    `- ${isEn ? 'To' : 'Hasta'}: ${context.endDate}`,
    `- ${isEn ? 'Days' : 'Días'}: ${daysLabel}`,
    '',
    ...(context.notes ? [isEn ? 'Your notes:' : 'Tus observaciones:', context.notes, ''] : []),
    ...(context.reason ? [isEn ? 'Original reason:' : 'Motivo de la solicitud:', context.reason, ''] : []),
    `→ ${isEn ? 'View team leave' : 'Ver permisos del equipo'}: ${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/hr/leave`,
    '',
    '— Greenhouse by Efeonce Group'
  ].filter(line => line !== undefined).join('\n')
}

registerTemplate('leave_review_confirmation', (context: {
  actorFirstName: string
  memberName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  status: LeaveDecisionStatus
  notes?: string | null
  reason?: string | null
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'

  const statusLabel = locale === 'en'
    ? { approved: 'approved', rejected: 'rejected', cancelled: 'cancelled' }[context.status]
    : { approved: 'aprobado', rejected: 'rechazado', cancelled: 'cancelado' }[context.status]

  return {
    subject: locale === 'en'
      ? `Leave ${statusLabel} for ${context.memberName} — Greenhouse`
      : `Permiso ${statusLabel} para ${context.memberName} — Greenhouse`,
    react: LeaveReviewConfirmationEmail({
      actorFirstName: context.actorFirstName,
      memberName: context.memberName,
      leaveTypeName: context.leaveTypeName,
      startDate: context.startDate,
      endDate: context.endDate,
      requestedDays: context.requestedDays,
      status: context.status,
      notes: context.notes,
      reason: context.reason,
      locale
    }),
    text: buildLeaveReviewPlainText(context)
  }
})

// ── Leave Request Submitted (to the requester) ──

const buildLeaveSubmittedPlainText = (context: {
  memberFirstName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  reason?: string | null
  locale?: 'es' | 'en'
}) => {
  const isEn = (context.locale || 'es') === 'en'

  const daysLabel = isEn
    ? `${context.requestedDays} ${context.requestedDays === 1 ? 'day' : 'days'}`
    : `${context.requestedDays} ${context.requestedDays === 1 ? 'día' : 'días'}`

  return [
    isEn ? `Hi ${context.memberFirstName},` : `Hola ${context.memberFirstName},`,
    '',
    isEn
      ? `Your ${context.leaveTypeName} request for ${daysLabel} has been submitted and is pending review.`
      : `Tu solicitud de ${context.leaveTypeName} por ${daysLabel} fue enviada y está pendiente de revisión.`,
    '',
    isEn ? 'Summary:' : 'Resumen:',
    `- ${isEn ? 'Type' : 'Tipo'}: ${context.leaveTypeName}`,
    `- ${isEn ? 'From' : 'Desde'}: ${context.startDate}`,
    `- ${isEn ? 'To' : 'Hasta'}: ${context.endDate}`,
    `- ${isEn ? 'Days' : 'Días'}: ${daysLabel}`,
    '',
    ...(context.reason ? [isEn ? 'Your reason:' : 'Tu motivo:', context.reason, ''] : []),
    `→ ${isEn ? 'View my leave' : 'Ver mis permisos'}: ${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/my/leave`,
    '',
    '— Greenhouse by Efeonce Group'
  ].filter(line => line !== undefined).join('\n')
}

registerTemplate('leave_request_submitted', (context: {
  memberFirstName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  reason?: string | null
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'

  return {
    subject: locale === 'en'
      ? `Your ${context.leaveTypeName} request was submitted — Greenhouse`
      : `Tu solicitud de ${context.leaveTypeName} fue enviada — Greenhouse`,
    react: LeaveRequestSubmittedEmail({
      memberFirstName: context.memberFirstName,
      leaveTypeName: context.leaveTypeName,
      startDate: context.startDate,
      endDate: context.endDate,
      requestedDays: context.requestedDays,
      reason: context.reason,
      locale
    }),
    text: buildLeaveSubmittedPlainText(context)
  }
})

// ── Leave Request Pending Review (to the reviewer) ──

const buildLeavePendingReviewPlainText = (context: {
  reviewerFirstName: string
  memberName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  reason?: string | null
  locale?: 'es' | 'en'
}) => {
  const isEn = (context.locale || 'es') === 'en'

  const daysLabel = isEn
    ? `${context.requestedDays} ${context.requestedDays === 1 ? 'day' : 'days'}`
    : `${context.requestedDays} ${context.requestedDays === 1 ? 'día' : 'días'}`

  return [
    isEn ? `Hi ${context.reviewerFirstName},` : `Hola ${context.reviewerFirstName},`,
    '',
    isEn
      ? `${context.memberName} submitted a ${context.leaveTypeName} request for ${daysLabel} that needs your review.`
      : `${context.memberName} envió una solicitud de ${context.leaveTypeName} por ${daysLabel} que necesita tu revisión.`,
    '',
    isEn ? 'Summary:' : 'Resumen:',
    `- ${isEn ? 'Team member' : 'Colaborador'}: ${context.memberName}`,
    `- ${isEn ? 'Type' : 'Tipo'}: ${context.leaveTypeName}`,
    `- ${isEn ? 'From' : 'Desde'}: ${context.startDate}`,
    `- ${isEn ? 'To' : 'Hasta'}: ${context.endDate}`,
    `- ${isEn ? 'Days' : 'Días'}: ${daysLabel}`,
    '',
    ...(context.reason ? [isEn ? 'Request reason:' : 'Motivo de la solicitud:', context.reason, ''] : []),
    `→ ${isEn ? 'Review request' : 'Revisar solicitud'}: ${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/hr/leave`,
    '',
    '— Greenhouse by Efeonce Group'
  ].filter(line => line !== undefined).join('\n')
}

registerTemplate('leave_request_pending_review', (context: {
  reviewerFirstName: string
  memberName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  reason?: string | null
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'

  return {
    subject: locale === 'en'
      ? `${context.memberName} requested ${context.leaveTypeName} — Greenhouse`
      : `${context.memberName} solicitó ${context.leaveTypeName} — Greenhouse`,
    react: LeaveRequestPendingReviewEmail({
      reviewerFirstName: context.reviewerFirstName,
      memberName: context.memberName,
      leaveTypeName: context.leaveTypeName,
      startDate: context.startDate,
      endDate: context.endDate,
      requestedDays: context.requestedDays,
      reason: context.reason,
      locale
    }),
    text: buildLeavePendingReviewPlainText(context)
  }
})

registerTemplate('weekly_executive_digest', (context: WeeklyDigestEmailContext) => {
  const previewPeriodLabel = context.periodLabel || 'Semana del 8 al 14 de abril de 2026'
  const t = getMicrocopy().emails.weeklyExecutiveDigest
  const subject = t.subject

  return {
    subject,
    react: WeeklyExecutiveDigestEmail({
      periodLabel: previewPeriodLabel,
      totalInsights: context.totalInsights,
      criticalCount: context.criticalCount,
      warningCount: context.warningCount,
      infoCount: context.infoCount,
      spacesAffected: context.spacesAffected,
      spaces: context.spaces,
      portalUrl: context.portalUrl,
      closingNote: context.closingNote,
      unsubscribeUrl: context.unsubscribeUrl
    }),
    text: [
      subject,
      '',
      `Período: ${previewPeriodLabel}`,
      '',
      t.plainTextOpenPortal
    ].join('\n')
  }
})

// ═══════════════════════════════════════════════════════════
// Preview Metadata Registry
// Auto-descubrible: nuevos templates con registerPreviewMeta()
// aparecen automaticamente en la vista de preview admin.
// ═══════════════════════════════════════════════════════════

registerPreviewMeta('invitation', {
  label: 'Invitacion de onboarding',
  description: 'Email que se envia al invitar un usuario nuevo a la plataforma',
  domain: 'identity',
  supportsLocale: true,
  defaultProps: {
    inviteUrl: 'https://greenhouse.efeoncepro.com/auth/accept-invite?token=preview-token',
    inviterName: 'Julio Reyes',
    clientName: 'Efeonce Group',
    userName: 'Maria Gonzalez'
  },
  propsSchema: [
    { key: 'inviterName', label: 'Nombre del invitador', type: 'text' },
    { key: 'clientName', label: 'Nombre del cliente', type: 'text' },
    { key: 'userName', label: 'Nombre del destinatario', type: 'text' },
    { key: 'inviteUrl', label: 'URL de invitacion', type: 'text' }
  ]
})

registerPreviewMeta('password_reset', {
  label: 'Restablecer contrasena',
  description: 'Email con enlace para cambiar la contrasena',
  domain: 'identity',
  supportsLocale: true,
  defaultProps: {
    resetUrl: 'https://greenhouse.efeoncepro.com/auth/reset-password?token=preview-token',
    userName: 'Maria Gonzalez'
  },
  propsSchema: [
    { key: 'userName', label: 'Nombre del destinatario', type: 'text' },
    { key: 'resetUrl', label: 'URL de reset', type: 'text' }
  ]
})

registerPreviewMeta('verify_email', {
  label: 'Verificacion de correo',
  description: 'Email para confirmar la direccion de correo electronico',
  domain: 'identity',
  supportsLocale: true,
  defaultProps: {
    verifyUrl: 'https://greenhouse.efeoncepro.com/auth/verify-email?token=preview-token',
    userName: 'Maria Gonzalez'
  },
  propsSchema: [
    { key: 'userName', label: 'Nombre del destinatario', type: 'text' },
    { key: 'verifyUrl', label: 'URL de verificacion', type: 'text' }
  ]
})

registerPreviewMeta('notification', {
  label: 'Notificacion generica',
  description: 'Template generico para notificaciones del sistema',
  domain: 'system',
  supportsLocale: true,
  defaultProps: {
    title: 'Nuevo activo disponible para revision',
    body: 'El equipo de diseno subio 3 nuevos archivos al proyecto Campana Q2. Requieren tu aprobacion antes del viernes.',
    actionUrl: 'https://greenhouse.efeoncepro.com/delivery',
    recipientName: 'Maria Gonzalez'
  },
  propsSchema: [
    { key: 'title', label: 'Titulo', type: 'text' },
    { key: 'body', label: 'Cuerpo del mensaje', type: 'text' },
    { key: 'actionUrl', label: 'URL de accion', type: 'text' },
    { key: 'actionLabel', label: 'Texto del boton', type: 'text' },
    { key: 'recipientName', label: 'Nombre del destinatario', type: 'text' }
  ]
})

registerPreviewMeta('payroll_export', {
  label: 'Nomina cerrada',
  description: 'Notificacion de que la nomina del periodo fue exportada y esta lista para revision',
  domain: 'payroll',
  supportsLocale: false,
  defaultProps: {
    periodLabel: 'Marzo 2026',
    entryCount: 11,
    breakdowns: [
      { currency: 'CLP', regimeLabel: 'Chile', grossTotal: '$12.450.000', netTotal: '$9.280.000', entryCount: 8 },
      { currency: 'USD', regimeLabel: 'Internacional', grossTotal: 'US$8,500.00', netTotal: 'US$7,200.00', entryCount: 3 }
    ],
    netTotalDisplay: '$9.280.000 + US$7,200.00'
  },
  propsSchema: [
    { key: 'periodLabel', label: 'Periodo', type: 'text' },
    { key: 'entryCount', label: 'Colaboradores', type: 'number' },
    { key: 'netTotalDisplay', label: 'Neto total a mostrar', type: 'text' }
  ]
})

registerPreviewMeta('payroll_receipt', {
  label: 'Recibo de nomina',
  description: 'Liquidacion individual del colaborador con PDF adjunto',
  domain: 'payroll',
  supportsLocale: false,
  defaultProps: {
    fullName: 'Maria Gonzalez Rojas',
    periodYear: 2026,
    periodMonth: 3,
    entryCurrency: 'CLP',
    grossTotal: 1850000,
    totalDeductions: 370000,
    netTotal: 1480000,
    payRegime: 'chile'
  },
  propsSchema: [
    { key: 'fullName', label: 'Nombre completo', type: 'text' },
    { key: 'periodYear', label: 'Ano', type: 'number' },
    { key: 'periodMonth', label: 'Mes (1-12)', type: 'number' },
    { key: 'entryCurrency', label: 'Moneda', type: 'select', options: ['CLP', 'USD'] },
    { key: 'grossTotal', label: 'Bruto', type: 'number' },
    { key: 'totalDeductions', label: 'Descuentos', type: 'number' },
    { key: 'netTotal', label: 'Liquido', type: 'number' },
    { key: 'payRegime', label: 'Regimen', type: 'select', options: ['chile', 'international'] }
  ]
})

registerPreviewMeta('payroll_liquidacion_v2', {
  label: 'Liquidacion actualizada (v2)',
  description: 'Aviso al colaborador de que su liquidacion fue reliquidada y esta disponible en una nueva version',
  domain: 'payroll',
  supportsLocale: false,
  defaultProps: {
    fullName: 'Maria Gonzalez Rojas',
    periodYear: 2026,
    periodMonth: 3,
    previousNetTotal: 1480000,
    newNetTotal: 1550000,
    currency: 'CLP'
  },
  propsSchema: [
    { key: 'fullName', label: 'Nombre completo', type: 'text' },
    { key: 'periodYear', label: 'Ano', type: 'number' },
    { key: 'periodMonth', label: 'Mes (1-12)', type: 'number' },
    { key: 'previousNetTotal', label: 'Liquido anterior', type: 'number' },
    { key: 'newNetTotal', label: 'Liquido actualizado', type: 'number' },
    { key: 'currency', label: 'Moneda', type: 'select', options: ['CLP', 'USD'] },
    { key: 'receiptUrl', label: 'URL del recibo', type: 'text' }
  ]
})

registerPreviewMeta('leave_request_decision', {
  label: 'Decision de permiso (solicitante)',
  description: 'Notifica al colaborador que su solicitud de permiso fue aprobada, rechazada o cancelada',
  domain: 'hr',
  supportsLocale: true,
  defaultProps: {
    memberFirstName: 'Maria',
    actorName: 'Julio Reyes',
    leaveTypeName: 'Vacaciones',
    startDate: '2026-04-14',
    endDate: '2026-04-18',
    requestedDays: 5,
    status: 'approved',
    notes: 'Aprobado sin observaciones. Buen descanso!'
  },
  propsSchema: [
    { key: 'memberFirstName', label: 'Nombre del solicitante', type: 'text' },
    { key: 'actorName', label: 'Nombre del revisor', type: 'text' },
    { key: 'leaveTypeName', label: 'Tipo de permiso', type: 'text' },
    { key: 'startDate', label: 'Fecha inicio', type: 'text' },
    { key: 'endDate', label: 'Fecha fin', type: 'text' },
    { key: 'requestedDays', label: 'Dias solicitados', type: 'number' },
    { key: 'status', label: 'Estado', type: 'select', options: ['approved', 'rejected', 'cancelled'] },
    { key: 'notes', label: 'Observaciones del revisor', type: 'text' }
  ]
})

registerPreviewMeta('leave_review_confirmation', {
  label: 'Confirmacion de revision (revisor)',
  description: 'Confirma al supervisor/admin que su decision sobre un permiso fue registrada',
  domain: 'hr',
  supportsLocale: true,
  defaultProps: {
    actorFirstName: 'Julio',
    memberName: 'Maria Gonzalez Rojas',
    leaveTypeName: 'Vacaciones',
    startDate: '2026-04-14',
    endDate: '2026-04-18',
    requestedDays: 5,
    status: 'approved',
    notes: 'Aprobado sin observaciones. Buen descanso!',
    reason: 'Necesito tomar mis vacaciones pendientes del periodo anterior.'
  },
  propsSchema: [
    { key: 'actorFirstName', label: 'Nombre del revisor', type: 'text' },
    { key: 'memberName', label: 'Nombre del colaborador', type: 'text' },
    { key: 'leaveTypeName', label: 'Tipo de permiso', type: 'text' },
    { key: 'startDate', label: 'Fecha inicio', type: 'text' },
    { key: 'endDate', label: 'Fecha fin', type: 'text' },
    { key: 'requestedDays', label: 'Dias solicitados', type: 'number' },
    { key: 'status', label: 'Estado', type: 'select', options: ['approved', 'rejected', 'cancelled'] },
    { key: 'notes', label: 'Observaciones del revisor', type: 'text' },
    { key: 'reason', label: 'Motivo de la solicitud', type: 'text' }
  ]
})

registerPreviewMeta('leave_request_submitted', {
  label: 'Solicitud enviada (solicitante)',
  description: 'Confirma al colaborador que su solicitud de permiso fue enviada y esta pendiente de revision',
  domain: 'hr',
  supportsLocale: true,
  defaultProps: {
    memberFirstName: 'Andres',
    leaveTypeName: 'Permiso por estudio',
    startDate: '2026-04-09',
    endDate: '2026-04-09',
    requestedDays: 0.5,
    reason: 'Debo realizar la sustentacion de mi trabajo de fin de master.'
  },
  propsSchema: [
    { key: 'memberFirstName', label: 'Nombre del solicitante', type: 'text' },
    { key: 'leaveTypeName', label: 'Tipo de permiso', type: 'text' },
    { key: 'startDate', label: 'Fecha inicio', type: 'text' },
    { key: 'endDate', label: 'Fecha fin', type: 'text' },
    { key: 'requestedDays', label: 'Dias solicitados', type: 'number' },
    { key: 'reason', label: 'Motivo', type: 'text' }
  ]
})

registerPreviewMeta('leave_request_pending_review', {
  label: 'Permiso por revisar (aprobador)',
  description: 'Notifica al supervisor o HR que hay una solicitud de permiso pendiente de revision',
  domain: 'hr',
  supportsLocale: true,
  defaultProps: {
    reviewerFirstName: 'Julio',
    memberName: 'Andres Carlosama',
    leaveTypeName: 'Permiso por estudio',
    startDate: '2026-04-09',
    endDate: '2026-04-09',
    requestedDays: 0.5,
    reason: 'Debo realizar la sustentacion de mi trabajo de fin de master.'
  },
  propsSchema: [
    { key: 'reviewerFirstName', label: 'Nombre del revisor', type: 'text' },
    { key: 'memberName', label: 'Nombre del colaborador', type: 'text' },
    { key: 'leaveTypeName', label: 'Tipo de permiso', type: 'text' },
    { key: 'startDate', label: 'Fecha inicio', type: 'text' },
    { key: 'endDate', label: 'Fecha fin', type: 'text' },
    { key: 'requestedDays', label: 'Dias solicitados', type: 'number' },
    { key: 'reason', label: 'Motivo de la solicitud', type: 'text' }
  ]
})

registerPreviewMeta('weekly_executive_digest', {
  label: 'Resumen ejecutivo semanal',
  description: 'Digest semanal para liderazgo con insights cross-Space e ICO-first',
  domain: 'delivery',
  supportsLocale: false,
  defaultProps: {
    periodLabel: 'Semana del 8 al 14 de abril de 2026',
    totalInsights: 4,
    criticalCount: 1,
    warningCount: 2,
    infoCount: 1,
    spacesAffected: 3,
    portalUrl: 'https://greenhouse.efeoncepro.com',
    closingNote: 'Resumen automático basado en los insights materializados del período. Abre Greenhouse para ver el detalle completo.',
    spaces: [
      {
        name: 'Space Operaciones',
        href: 'https://greenhouse.efeoncepro.com/agency/spaces/operaciones',
        insights: [
          {
            severity: 'critical',
            headline: 'Retraso crítico en una ruta operativa clave',
            narrative: [
              { type: 'text', value: 'El Space ' },
              { type: 'link', value: 'Operaciones', href: 'https://greenhouse.efeoncepro.com/agency/spaces/operaciones' },
              { type: 'text', value: ' muestra un retraso que afecta a ' },
              { type: 'link', value: 'Valentina Hoyos', href: 'https://greenhouse.efeoncepro.com/people/valentina-hoyos' },
              { type: 'text', value: ' y requiere revisión antes del cierre semanal.' }
            ],
            actionLabel: 'Abrir Space',
            actionUrl: 'https://greenhouse.efeoncepro.com/agency/spaces/operaciones'
          },
          {
            severity: 'warning',
            headline: 'Carga de trabajo por encima del promedio',
            narrative: [
              { type: 'text', value: 'La actividad en ' },
              { type: 'link', value: 'Operaciones Norte', href: 'https://greenhouse.efeoncepro.com/agency/spaces/operaciones-norte' },
              { type: 'text', value: ' se mantuvo por encima del umbral esperado durante tres días hábiles.' }
            ]
          }
        ]
      },
      {
        name: 'Space Comercial',
        href: 'https://greenhouse.efeoncepro.com/agency/spaces/comercial',
        insights: [
          {
            severity: 'warning',
            headline: 'Señal temprana en pipeline de cuentas clave',
            narrative: [
              { type: 'text', value: 'El seguimiento a ' },
              { type: 'link', value: 'ACME', href: 'https://greenhouse.efeoncepro.com/clients/acme' },
              { type: 'text', value: ' y ' },
              { type: 'link', value: 'Northwind', href: 'https://greenhouse.efeoncepro.com/clients/northwind' },
              { type: 'text', value: ' sugiere revisar prioridades antes de la próxima reunión ejecutiva.' }
            ],
            actionLabel: 'Ver detalle',
            actionUrl: 'https://greenhouse.efeoncepro.com/agency/spaces/comercial'
          }
        ]
      },
      {
        name: 'Space Personas',
        href: 'https://greenhouse.efeoncepro.com/people',
        insights: [
          {
            severity: 'info',
            headline: 'Movimientos de equipo concentrados en dos unidades',
            narrative: [
              { type: 'text', value: 'La rotación reciente en ' },
              { type: 'link', value: 'People Ops', href: 'https://greenhouse.efeoncepro.com/people?team=people-ops' },
              { type: 'text', value: ' y ' },
              { type: 'link', value: 'Customer Success', href: 'https://greenhouse.efeoncepro.com/people?team=customer-success' },
              { type: 'text', value: ' no requiere acción inmediata, pero conviene seguirla en el próximo corte.' }
            ]
          }
        ]
      }
    ]
  },
  propsSchema: [
    { key: 'periodLabel', label: 'Periodo', type: 'text' },
    { key: 'totalInsights', label: 'Total de insights', type: 'number' },
    { key: 'criticalCount', label: 'Críticos', type: 'number' },
    { key: 'warningCount', label: 'En seguimiento', type: 'number' },
    { key: 'infoCount', label: 'Informativos', type: 'number' },
    { key: 'spacesAffected', label: 'Spaces afectados', type: 'number' },
    { key: 'portalUrl', label: 'URL del portal', type: 'text' },
    { key: 'closingNote', label: 'Nota de cierre', type: 'text' }
  ]
})

// ── TASK-631 Fase 3+4 — quote_share template (with PDF + org context) ─────
interface QuoteShareContext extends Record<string, unknown> {
  shareUrl: string
  quotationNumber: string
  versionNumber: number
  clientName: string
  recipientName?: string
  totalLabel: string
  validUntilLabel?: string | null
  senderName: string
  senderRole?: string | null
  senderEmail?: string | null
  customMessage?: string | null
  hasPdfAttached?: boolean
  pdfFileName?: string | null
  pdfSizeBytes?: number | null
  subject?: string
}

registerTemplate<QuoteShareContext>('quote_share', context => {
  const greetingName = context.recipientName?.split(' ')[0] ?? null
  const greeting = greetingName ? `Hola ${greetingName},` : 'Hola,'

  return {
    subject:
      context.subject
      ?? `Propuesta ${context.quotationNumber} v${context.versionNumber} para ${context.clientName}`,
    react: QuoteSharePromptEmail({
      shareUrl: context.shareUrl,
      quotationNumber: context.quotationNumber,
      versionNumber: context.versionNumber,
      clientName: context.clientName,
      recipientName: context.recipientName ?? null,
      totalLabel: context.totalLabel,
      validUntilLabel: context.validUntilLabel ?? null,
      senderName: context.senderName,
      senderRole: context.senderRole ?? null,
      senderEmail: context.senderEmail ?? null,
      customMessage: context.customMessage ?? null,
      hasPdfAttached: context.hasPdfAttached ?? false,
      pdfFileName: context.pdfFileName ?? null
    }),
    text: [
      `PROPUESTA ${context.quotationNumber} v${context.versionNumber}`,
      `PARA: ${context.clientName}`,
      '═══════════════════════════════════',
      '',
      greeting,
      '',
      context.customMessage ?? '',
      context.customMessage ? '' : null,
      `Te comparto la propuesta comercial que preparamos para tu equipo en ${context.clientName}.`,
      '',
      context.hasPdfAttached && context.pdfFileName
        ? `📎 ADJUNTO: ${context.pdfFileName}`
        : null,
      context.hasPdfAttached ? '' : null,
      `Inversión total: ${context.totalLabel}`,
      context.validUntilLabel ? `Válida hasta: ${context.validUntilLabel}` : null,
      '',
      `→ Ver propuesta online (con opción de aceptar):`,
      `  ${context.shareUrl}`,
      '',
      `— ${context.senderName}`,
      context.senderRole ? `   ${context.senderRole}` : null,
      context.senderEmail ? `   ${context.senderEmail}` : null
    ]
      .filter(line => line !== null)
      .join('\n')
  }
})
