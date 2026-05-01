import type { ReactElement } from 'react'

export type EmailDomain = 'identity' | 'payroll' | 'finance' | 'hr' | 'delivery' | 'system'

export type EmailType =
  | 'password_reset'
  | 'invitation'
  | 'verify_email'
  | 'magic_link'
  | 'payroll_export'
  | 'payroll_receipt'
  | 'payroll_liquidacion_v2'
  | 'notification'
  | 'weekly_executive_digest'
  | 'leave_request_decision'
  | 'leave_review_confirmation'
  | 'leave_request_submitted'
  | 'leave_request_pending_review'
  | 'quote_share'

export type EmailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped' | 'rate_limited' | 'delivered' | 'dead_letter'

export type EmailPriority = 'critical' | 'transactional' | 'broadcast'

/**
 * Priority mapping canónico por EmailType.
 * critical/transactional bypass rate limits completamente.
 * broadcast respeta rate limits y usa Batch API para multi-recipient.
 */
export const EMAIL_PRIORITY_MAP: Record<string, EmailPriority> = {
  password_reset:               'critical',
  magic_link:                   'critical',
  verify_email:                 'critical',
  invitation:                   'transactional',
  leave_request_decision:       'transactional',
  leave_request_submitted:      'transactional',
  leave_request_pending_review: 'transactional',
  leave_review_confirmation:    'transactional',
  notification:                 'broadcast',
  payroll_export:               'broadcast',
  payroll_receipt:              'broadcast',
  payroll_liquidacion_v2:       'transactional',
  weekly_executive_digest:      'broadcast',
  quote_share:                  'transactional',
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
}

export interface EmailTemplateContext extends Record<string, unknown> {
  recipientEmail?: string
  recipientName?: string
  recipientUserId?: string
}

export type EmailTemplateResolver<TContext extends EmailTemplateContext = EmailTemplateContext> =
  (context: TContext) => EmailTemplateRenderResult

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

  /** Priority override. Defaults to EMAIL_PRIORITY_MAP[emailType] ?? 'broadcast'. */
  priority?: EmailPriority
}

export interface SendEmailResult {
  deliveryId: string
  resendId: string | null
  status: EmailDeliveryStatus
  recipientResults?: Array<{
    recipientEmail: string
    resendId: string | null
    status: EmailDeliveryStatus
    error?: string
  }>
  error?: string
}
