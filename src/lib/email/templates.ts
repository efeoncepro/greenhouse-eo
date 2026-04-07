import 'server-only'

import InvitationEmail from '@/emails/InvitationEmail'
import LeaveRequestDecisionEmail from '@/emails/LeaveRequestDecisionEmail'
import LeaveReviewConfirmationEmail from '@/emails/LeaveReviewConfirmationEmail'
import NotificationEmail from '@/emails/NotificationEmail'
import PasswordResetEmail from '@/emails/PasswordResetEmail'
import PayrollExportReadyEmail, { type CurrencyBreakdown } from '@/emails/PayrollExportReadyEmail'
import PayrollReceiptEmail from '@/emails/PayrollReceiptEmail'
import VerifyEmail from '@/emails/VerifyEmail'

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
  subject: `Nómina cerrada — ${context.periodLabel} · ${context.entryCount} colaboradores`,
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
