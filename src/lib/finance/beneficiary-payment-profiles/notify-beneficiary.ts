import 'server-only'

import { query } from '@/lib/db'
import { sendEmail } from '@/lib/email/delivery'
import { captureWithDomain } from '@/lib/observability/capture'

import type { PaymentProfileEmailKind } from '@/emails/BeneficiaryPaymentProfileChangedEmail'

/**
 * TASK-753 — Notifica al beneficiario por email cuando su perfil de pago
 * cambia (created / approved / superseded / cancelled). Reusa `sendEmail`
 * canonico (TASK-265 email engine).
 *
 * Frontera: solo envia cuando `beneficiary_type='member'` (V1). Otros
 * beneficiary types (shareholder, supplier, future) NO reciben este mail
 * automatico — su path de notificacion es operacional, no transaccional.
 *
 * Idempotencia: la projection que invoca este helper es idempotente por
 * (eventId, profileId, kind). El audit del envio queda en
 * `email_deliveries` (TASK-265). Si el email ya se envio para el mismo
 * sourceEventId, sendEmail puede skipearlo segun su politica.
 */

interface ProfileLookupRow {
  profile_id: string
  beneficiary_type: string
  beneficiary_id: string
  beneficiary_name: string | null
  bank_name: string | null
  account_number_masked: string | null
  currency: 'CLP' | 'USD'
  status: string
  metadata_json: Record<string, unknown> | null
  cancelled_reason: string | null
  approved_at: Date | null
  cancelled_at: Date | null
  created_at: Date
  [key: string]: unknown
}

interface MemberLookupRow {
  member_id: string
  display_name: string | null
  primary_email: string | null
  identity_email: string | null
  [key: string]: unknown
}

export interface NotifyBeneficiaryInput {
  profileId: string
  kind: PaymentProfileEmailKind
  sourceEventId?: string | null
}

export interface NotifyBeneficiaryResult {
  status: 'sent' | 'skipped_no_email' | 'skipped_non_member' | 'skipped_profile_missing' | 'failed'
  deliveryId?: string | null
  error?: string | null
}

export const notifyBeneficiaryOfPaymentProfileChange = async (
  input: NotifyBeneficiaryInput
): Promise<NotifyBeneficiaryResult> => {
  const profileRows = await query<ProfileLookupRow>(
    `SELECT profile_id, beneficiary_type, beneficiary_id, beneficiary_name,
            bank_name, account_number_masked, currency,
            status, metadata_json, cancelled_reason,
            approved_at, cancelled_at, created_at
       FROM greenhouse_finance.beneficiary_payment_profiles
      WHERE profile_id = $1
      LIMIT 1`,
    [input.profileId]
  )

  const profile = profileRows[0]

  if (!profile) {
    return { status: 'skipped_profile_missing', error: `profile ${input.profileId} not found` }
  }

  if (profile.beneficiary_type !== 'member') {
    return { status: 'skipped_non_member' }
  }

  // identity_profiles uses `canonical_email` (the single canonical column).
  // Member fallback: `primary_email`. Both can be NULL — colaborador
  // sin email recibira status='skipped_no_email' (degraded honest).
  //
  // Defensive: query envuelta en try/catch para que un schema drift NO
  // dispare el circuit breaker indefinidamente. Si la query falla, caemos
  // a 'skipped_no_email' (fail-soft) y registramos en Sentry sin tirar la
  // projection. Esto evita que un error de schema (e.g. rename column)
  // bloquee permanentemente notificaciones a colaboradores.
  let member: MemberLookupRow | null = null

  try {
    const memberRows = await query<MemberLookupRow>(
      `SELECT m.member_id,
              m.display_name,
              m.primary_email,
              ip.canonical_email AS identity_email
         FROM greenhouse_core.members m
         LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = m.identity_profile_id
        WHERE m.member_id = $1
        LIMIT 1`,
      [profile.beneficiary_id]
    )

    member = memberRows[0] ?? null
  } catch (lookupError) {
    captureWithDomain(lookupError, 'finance', {
      tags: { source: 'notify_beneficiary_payment_profile_change.member_lookup' },
      extra: { profileId: profile.profile_id, beneficiaryId: profile.beneficiary_id }
    })

    return {
      status: 'skipped_no_email',
      error: 'Member email lookup failed; degraded silently to avoid breaker open.'
    }
  }

  const recipientEmail = member?.identity_email ?? member?.primary_email ?? null

  if (!member || !recipientEmail) {
    return { status: 'skipped_no_email' }
  }

  const fullName = profile.beneficiary_name ?? member.display_name ?? recipientEmail
  const requestedByMember = profile.metadata_json?.requested_by === 'member'

  const effectiveAt =
    input.kind === 'cancelled'
      ? profile.cancelled_at?.toISOString() ?? null
      : input.kind === 'approved' || input.kind === 'superseded'
        ? profile.approved_at?.toISOString() ?? null
        : profile.created_at.toISOString()

  try {
    const result = await sendEmail({
      emailType: 'beneficiary_payment_profile_changed',
      domain: 'finance',
      recipients: [{ email: recipientEmail, name: fullName, userId: profile.beneficiary_id }],
      sourceEventId: input.sourceEventId ?? undefined,
      sourceEntity: `beneficiary_payment_profile:${profile.profile_id}`,
      context: {
        fullName,
        kind: input.kind,
        bankName: profile.bank_name,
        accountNumberMasked: profile.account_number_masked,
        currency: profile.currency,
        effectiveAt,
        reason: profile.cancelled_reason ?? null,
        requestedByMember
      }
    })

    if (result.status === 'sent' || result.status === 'delivered') {
      return { status: 'sent', deliveryId: result.deliveryId }
    }

    return {
      status: 'failed',
      deliveryId: result.deliveryId,
      error: result.error ?? `unexpected delivery status: ${result.status}`
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'notify_beneficiary_payment_profile_change' },
      extra: { profileId: profile.profile_id, kind: input.kind }
    })

    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
