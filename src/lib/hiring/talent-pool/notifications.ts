import 'server-only'

import { claimTokenSensitiveEmailIntent, sendEmail } from '@/lib/email/delivery'
import { hiringPublicBaseUrl } from '@/lib/hiring/notifications'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { talentPoolFlags } from './config'
import { issueTalentPoolSelfServiceTokenWithClient } from './self-service'

interface ConsentRequestContext extends Record<string, unknown> {
  consent_event_id: string
  membership_id: string
  talent_profile_id: string
  candidate_email: string | null
  candidate_name: string | null
  is_current_request: boolean
}

const eventIdOr = (payload: Record<string, unknown>, fallback: string): string =>
  typeof payload._eventId === 'string' && payload._eventId.length > 0 ? payload._eventId : fallback

const tokenDeliveryEventIdOr = (payload: Record<string, unknown>, fallback: string): string => {
  const candidate = eventIdOr(payload, fallback)

  return /^outbox-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : fallback
}

const resolveConsentRequestContext = async (consentEventId: string): Promise<ConsentRequestContext | null> => {
  const rows = await runGreenhousePostgresQuery<ConsentRequestContext>(
    `SELECT ce.consent_event_id,
            m.membership_id,
            m.public_id AS talent_profile_id,
            ip.canonical_email AS candidate_email,
            ip.full_name AS candidate_name,
            (m.lifecycle_status <> 'withdrawn' AND NOT EXISTS (
              SELECT 1
                FROM greenhouse_hiring.talent_pool_consent_event later
               WHERE later.membership_id=ce.membership_id
                 AND later.purpose='future_opportunities'
                 AND later.consent_event_id<>ce.consent_event_id
                 AND (later.effective_at,later.occurred_at,later.consent_event_id)
                     >(ce.effective_at,ce.occurred_at,ce.consent_event_id)
            )) AS is_current_request
       FROM greenhouse_hiring.talent_pool_consent_event ce
       JOIN greenhouse_hiring.talent_pool_membership m ON m.membership_id=ce.membership_id
       JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id=m.candidate_facet_id
       JOIN greenhouse_core.identity_profiles ip ON ip.profile_id=cf.identity_profile_id
      WHERE ce.consent_event_id=$1
        AND ce.purpose='future_opportunities'
        AND ce.action='requested'`,
    [consentEventId]
  )

  return rows[0] ?? null
}

export const sendTalentPoolVerificationEmail = async (
  consentEventId: string,
  payload: Record<string, unknown>
): Promise<string> => {
  if (!talentPoolFlags().selfService) return 'talent_pool_verification_email skip: flag OFF'

  const context = await resolveConsentRequestContext(consentEventId)

  if (!context) return `talent_pool_verification_email no-op: consent event ${consentEventId} no existe`
  if (!context.is_current_request) return `talent_pool_verification_email skip: request ${consentEventId} superseded`

  const candidateEmail = context.candidate_email?.trim()

  if (!candidateEmail) {
    captureWithDomain(new Error('Talent Pool request sin email resoluble'), 'hiring', {
      tags: { source: 'talent_pool_verification_email' },
      extra: { consentEventId }
    })

    return `talent_pool_verification_email skip: request ${consentEventId} sin email`
  }

  const eventId = tokenDeliveryEventIdOr(payload, `talent-pool-consent-requested:${consentEventId}`)

  const intent = await claimTokenSensitiveEmailIntent({
    emailType: 'hiring_talent_pool_verification',
    domain: 'hr',
    recipient: { email: candidateEmail, ...(context.candidate_name ? { name: context.candidate_name } : {}) },
    sourceEventId: eventId,
    sourceEntity: consentEventId,
    safeContext: { locale: 'es' },
    issueCredential: client => issueTalentPoolSelfServiceTokenWithClient(client, {
      membershipId: context.membership_id,
      consentEventId
    })
  })

  if (!intent.claimed) {
    return `talent_pool_verification_email dedupe: ${consentEventId}`
  }

  const issued = intent.value

  if (!issued) return `talent_pool_verification_email skip: ${consentEventId} sin token emitido`

  const result = await sendEmail({
    emailType: 'hiring_talent_pool_verification',
    domain: 'hr',
    recipients: [{ email: candidateEmail, ...(context.candidate_name ? { name: context.candidate_name } : {}) }],
    context: {
      recipientName: context.candidate_name ?? undefined,
      profileUrl: `${hiringPublicBaseUrl()}/public/careers/talent-profile/${issued.token}`,
      tokenTtlDays: issued.tokenTtlDays,
      locale: 'es'
    },
    sourceEventId: eventId,
    sourceEntity: consentEventId,
    persistence: {
      mode: 'token_sensitive',
      safeContext: { locale: 'es', tokenTtlDays: issued.tokenTtlDays },
      deliveryIntentId: intent.deliveryId
    }
  })

  return `talent_pool_verification_email ${consentEventId}: ${result.status}`
}
