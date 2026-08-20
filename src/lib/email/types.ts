import type { ReactElement } from 'react'

export type EmailDomain = 'identity' | 'payroll' | 'finance' | 'hr' | 'delivery' | 'system' | 'growth'

export type EmailType =
  | 'password_reset'
  | 'invitation'
  | 'verify_email'
  | 'magic_link'
  | 'payroll_export'
  | 'payroll_receipt'
  | 'payroll_liquidacion_v2'
  | 'payroll_payment_committed'
  | 'payroll_payment_cancelled'
  | 'beneficiary_payment_profile_changed'
  | 'notification'
  | 'weekly_executive_digest'
  | 'leave_request_decision'
  | 'leave_review_confirmation'
  | 'leave_request_submitted'
  | 'leave_request_pending_review'
  | 'quote_share'
  | 'contractor_remittance_paid'
  | 'ai_visibility_grader_report'
  | 'growth_ebook_delivery'
  | 'hiring_application_received_internal'
  | 'hiring_application_confirmation'
  | 'hiring_assessment_assigned'
  | 'hiring_assessment_access_recovery'
  | 'hiring_assessment_access_rotated'
  | 'hiring_assessment_submitted_internal'
  | 'hiring_stage_advanced'
  | 'hiring_decision_selected'
  | 'hiring_decision_rejected'
  | 'hiring_talent_pool_verification'

export type EmailDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'rate_limited'
  | 'delivered'
  | 'dead_letter'

export type EmailPriority = 'critical' | 'transactional' | 'broadcast'

/**
 * Types whose render context carries a credential/bearer. Persistence and generic retry are
 * forced safe by the delivery layer even when a caller forgets or tries to opt out.
 */
export const TOKEN_SENSITIVE_EMAIL_TYPES = Object.freeze([
  'password_reset',
  'invitation',
  'verify_email',
  'magic_link',
  'hiring_assessment_assigned',
  'hiring_assessment_access_recovery',
  'hiring_talent_pool_verification'
] as const satisfies readonly EmailType[])

export const isTokenSensitiveEmailType = (emailType: EmailType): boolean =>
  TOKEN_SENSITIVE_EMAIL_TYPES.includes(emailType as (typeof TOKEN_SENSITIVE_EMAIL_TYPES)[number])

/**
 * Priority mapping canónico por EmailType.
 * critical/transactional bypass rate limits completamente.
 * broadcast respeta rate limits y usa Batch API para multi-recipient.
 */
export const EMAIL_PRIORITY_MAP: Record<string, EmailPriority> = {
  password_reset: 'critical',
  magic_link: 'critical',
  verify_email: 'critical',
  invitation: 'transactional',
  leave_request_decision: 'transactional',
  leave_request_submitted: 'transactional',
  leave_request_pending_review: 'transactional',
  leave_review_confirmation: 'transactional',
  notification: 'broadcast',
  payroll_export: 'broadcast',
  payroll_receipt: 'broadcast',
  payroll_liquidacion_v2: 'transactional',
  payroll_payment_committed: 'transactional',
  payroll_payment_cancelled: 'transactional',
  beneficiary_payment_profile_changed: 'transactional',
  weekly_executive_digest: 'broadcast',
  quote_share: 'transactional',
  contractor_remittance_paid: 'transactional',
  ai_visibility_grader_report: 'transactional',
  growth_ebook_delivery: 'transactional',
  // TASK-1689 — ciclo de vida de Hiring (consumers reactivos en ops-worker)
  hiring_application_received_internal: 'transactional',
  hiring_application_confirmation: 'transactional',
  hiring_assessment_assigned: 'transactional',
  hiring_assessment_access_recovery: 'transactional',
  hiring_assessment_access_rotated: 'transactional',
  hiring_assessment_submitted_internal: 'transactional',
  hiring_stage_advanced: 'transactional',
  hiring_decision_selected: 'transactional',
  hiring_decision_rejected: 'transactional',
  hiring_talent_pool_verification: 'transactional'
}

export interface EmailRecipient {
  email: string
  name?: string
  userId?: string
}

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

export interface EmailTemplateRenderResult {
  subject: string
  react: ReactElement
  text: string
  attachments?: EmailAttachment[]
}

export interface EmailDeliveryPayload<TContext extends EmailTemplateContext = EmailTemplateContext> {
  recipients: EmailRecipient[]
  context: TContext
  attachments?: EmailAttachment[]
  persistence?: {
    mode: 'standard' | 'token_sensitive'
    retryable: boolean
  }
}

export interface EmailTemplateContext extends Record<string, unknown> {
  recipientEmail?: string
  recipientName?: string
  recipientUserId?: string
}

export interface TokenSensitiveEmailSafeContext {
  locale?: string
  expiresAt?: string
  inProgress?: boolean
  timeLimitMinutes?: number | null
  tokenTtlDays?: number | null
}

export type EmailTemplateResolver<TContext extends EmailTemplateContext = EmailTemplateContext> = (
  context: TContext
) => EmailTemplateRenderResult

export interface EmailPreviewMeta {
  label: string
  description: string
  domain: EmailDomain
  defaultProps: Record<string, unknown>
  supportsLocale: boolean
  propsSchema: EmailPreviewPropField[]
}

export interface EmailPreviewPropField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean'
  options?: string[]
}

export interface SendEmailInput<TContext extends EmailTemplateContext = EmailTemplateContext> {
  emailType: EmailType
  domain: EmailDomain
  recipients?: EmailRecipient[]
  context: TContext
  attachments?: EmailAttachment[]
  sourceEventId?: string
  sourceEntity?: string
  actorEmail?: string

  /**
   * Token-sensitive messages render with `context` in memory, but persist only `safeContext`.
   * They are never replayed by the generic retry worker because recreating the bearer belongs
   * to the owning domain command.
   */
  persistence?:
    | { mode?: 'standard' }
    | {
        mode: 'token_sensitive'
        safeContext: TokenSensitiveEmailSafeContext
        /** Durable intent claimed before the owning domain rotates a bearer. */
        deliveryIntentId?: string
      }

  /** Priority override. Defaults to EMAIL_PRIORITY_MAP[emailType] ?? 'broadcast'. */
  priority?: EmailPriority
}

/**
 * AGENCY-branded email types: sender = **Efeonce** (the agency), NOT the platform sender
 * `getEmailFromAddress()` (which today is the carried-debt "Efeonce Greenhouse"). These are
 * public, agency-facing surfaces (lead magnet) where a cold prospect must see Efeonce. The
 * address stays a Resend-verified domain; only the display name differs.
 */
export const AGENCY_FROM_ADDRESS = 'Efeonce <greenhouse@efeoncepro.com>'
export const AGENCY_BRANDED_EMAIL_TYPES: ReadonlySet<EmailType> = new Set<EmailType>([
  'ai_visibility_grader_report',
  'growth_ebook_delivery',
  // TASK-1689 — candidate-facing hiring: el candidato es externo y conoce a Efeonce, no al
  // portal. Los avisos internos a People NO van acá: usan el sender plataforma.
  'hiring_application_confirmation',
  'hiring_assessment_assigned',
  'hiring_assessment_access_recovery',
  // El aviso de rotación NO lleva credencial (ver `TOKEN_SENSITIVE_EMAIL_TYPES`), pero sí es
  // candidate-facing: el candidato conoce a Efeonce, no al portal.
  'hiring_assessment_access_rotated',
  'hiring_stage_advanced',
  'hiring_decision_selected',
  'hiring_decision_rejected',
  'hiring_talent_pool_verification'
])

export interface SendEmailResult {
  deliveryId: string
  resendId: string | null
  status: EmailDeliveryStatus
  /** Provider acknowledgement, distinct from the local delivery-row status. */
  dispatchOutcome?: 'accepted' | 'failed' | 'unknown'
  recipientResults?: Array<{
    deliveryId?: string
    recipientEmail: string
    resendId: string | null
    status: EmailDeliveryStatus
    dispatchOutcome?: 'accepted' | 'failed' | 'unknown'
    error?: string
  }>
  error?: string
}
