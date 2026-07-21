import 'server-only'

import { verifyEmail } from '@/lib/growth/forms/email-verification'

export type MeetingEmailVerificationReason =
  | 'email_format'
  | 'email_not_corporate'
  | 'email_disposable'
  | null

export interface MeetingEmailVerificationVerdict {
  accepted: boolean
  syntaxValid: boolean
  isCorporate: boolean
  isDisposable: boolean
  suggestion: string | null
  reasonCode: MeetingEmailVerificationReason
}

/**
 * Canonical corporate-email policy shared with Growth Forms. This adapter deliberately
 * returns only the fields the meeting surface needs and never returns or logs the email.
 */
export const verifyMeetingEmail = async (rawEmail: unknown): Promise<MeetingEmailVerificationVerdict> => {
  const verdict = await verifyEmail(rawEmail)
  const accepted = verdict.syntaxValid && verdict.isCorporate && !verdict.isDisposable

  return {
    accepted,
    syntaxValid: verdict.syntaxValid,
    isCorporate: verdict.isCorporate,
    isDisposable: verdict.isDisposable,
    suggestion: verdict.suggestion,
    reasonCode: verdict.reasonCode,
  }
}
