import type { ReactElement } from 'react'

export type EmailDomain = 'identity' | 'payroll' | 'finance' | 'hr' | 'delivery' | 'system'

export type EmailType =
  | 'password_reset'
  | 'invitation'
  | 'verify_email'
  | 'payroll_export'
  | 'payroll_receipt'
  | 'notification'
  | 'leave_request_decision'
  | 'leave_review_confirmation'

export type EmailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped' | 'rate_limited' | 'delivered'

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
