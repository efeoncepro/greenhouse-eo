import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS,
  ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS,
  decideAssessmentAccessRecoveryEligibility,
  type AssessmentAccessRecoveryReason,
} from './contracts'

interface AvailabilityRow extends Record<string, unknown> {
  assessment_id: string
  application_id: string
  opening_id: string
  method: string
  status: string
  started_at: Date | string | null
  token_expires_at: Date | string | null
  application_stage: string
  application_decision: string | null
  consent_status: string
  now_at: Date | string
  effective_deadline_at: Date | string | null
  has_candidate_email: boolean
  email_provider_status: string | null
  recovery_count_24h: number | string
  secure_link_count_24h: number | string
  latest_recovery_at: Date | string | null
}

export interface AssessmentAccessRecoveryAvailability {
  assessmentId: string
  applicationId: string
  openingId: string
  status: string
  eligible: boolean
  eligibilityCode: string | null
  channels: {
    email: { available: boolean; providerStatus: string | null; hasCandidateEmail: boolean }
    secureLink: { available: boolean }
  }
  rateLimit: {
    maxPer24Hours: number
    usedIn24Hours: number
    cooldownUntil: string | null
    limited: boolean
  }
}

const iso = (value: Date | string) => new Date(value).toISOString()

/** Token-free operator reader used by Application 360. */
export const getAssessmentAccessRecoveryAvailability = async (
  assessmentId: string,
  reasonCode: AssessmentAccessRecoveryReason = 'alternate_channel_requested',
): Promise<AssessmentAccessRecoveryAvailability | null> => {
  const rows = await runGreenhousePostgresQuery<AvailabilityRow>(
    `SELECT assessment.assessment_id,assessment.application_id,application.opening_id,
            assessment.method,assessment.status,assessment.started_at,assessment.token_expires_at,
            application.stage AS application_stage,application.decision AS application_decision,
            facet.consent_status,clock_timestamp() AS now_at,
            greenhouse_hiring.assessment_access_recovery_deadline(
              assessment.started_at,assessment.time_limit_minutes,assessment.accommodations_json
            ) AS effective_deadline_at,
            (profile.canonical_email IS NOT NULL AND BTRIM(profile.canonical_email) <> '') AS has_candidate_email,
            provider.provider_status AS email_provider_status,
            COALESCE(recent.recovery_count_24h,0) AS recovery_count_24h,
            COALESCE(recent.secure_link_count_24h,0) AS secure_link_count_24h,
            recent.latest_recovery_at
     FROM greenhouse_hiring.hiring_assessment assessment
     JOIN greenhouse_hiring.hiring_application application
       ON application.application_id=assessment.application_id
     JOIN greenhouse_hiring.candidate_facet facet
       ON facet.candidate_facet_id=application.candidate_facet_id
     JOIN greenhouse_core.identity_profiles profile
       ON profile.profile_id=application.identity_profile_id
     LEFT JOIN LATERAL (
       SELECT CASE
                WHEN delivery.complained_at IS NOT NULL OR delivery.provider_status='complained' THEN 'complained'
                WHEN delivery.bounced_at IS NOT NULL OR delivery.provider_status='bounced' THEN 'bounced'
                WHEN delivery.suppressed_at IS NOT NULL OR delivery.provider_status='suppressed' THEN 'suppressed'
              END AS provider_status
       FROM greenhouse_notifications.email_deliveries delivery
       WHERE LOWER(delivery.recipient_email)=LOWER(profile.canonical_email)
         AND (delivery.bounced_at IS NOT NULL OR delivery.complained_at IS NOT NULL
           OR delivery.suppressed_at IS NOT NULL
           OR delivery.provider_status IN ('bounced','complained','suppressed'))
       ORDER BY COALESCE(delivery.provider_event_created_at,delivery.provider_observed_at,
                         delivery.updated_at) DESC,delivery.created_at DESC
       LIMIT 1
     ) provider ON TRUE
     LEFT JOIN LATERAL (
       -- Espejo EXACTO de assertRecoveryRateLimit: sólo consumen cuota los intentos que
       -- entregaron algo, y el enlace seguro tiene presupuesto propio. Si los dos predicados
       -- divergen, la UI le dice a HR que puede recuperar y el command lo rechaza (o al revés,
       -- que es peor: le oculta la única salida que le queda al candidato).
       SELECT COUNT(*) FILTER (
                WHERE created_at >= clock_timestamp()-INTERVAL '24 hours'
                  AND channel='email'
                  AND outcome IN ('dispatch_accepted','link_issued','dispatch_unknown')
              ) AS recovery_count_24h,
              COUNT(*) FILTER (
                WHERE created_at >= clock_timestamp()-INTERVAL '24 hours'
                  AND channel='secure_link'
                  AND outcome IN ('dispatch_accepted','link_issued','dispatch_unknown')
              ) AS secure_link_count_24h,
              MAX(created_at) AS latest_recovery_at
       FROM greenhouse_hiring.hiring_assessment_access_recovery recovery
       WHERE recovery.assessment_id=assessment.assessment_id
     ) recent ON TRUE
     WHERE assessment.assessment_id=$1
     LIMIT 1`,
    [assessmentId],
  )

  const row = rows[0]

  if (!row) return null

  const now = new Date(row.now_at)

  const eligibility = decideAssessmentAccessRecoveryEligibility({
    method: row.method,
    status: row.status,
    startedAt: row.started_at,
    tokenExpiresAt: row.token_expires_at,
    effectiveDeadlineAt: row.effective_deadline_at,
    applicationStage: row.application_stage,
    applicationDecision: row.application_decision,
    consentStatus: row.consent_status,
    reasonCode,
    now,
  })

  const used = Number(row.recovery_count_24h)
  const latest = row.latest_recovery_at ? new Date(row.latest_recovery_at) : null

  const cooldownUntil = latest
    ? new Date(latest.getTime() + ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS * 1000)
    : null

  const secureLinkUsed = Number(row.secure_link_count_24h)
  const cooldownActive = Boolean(cooldownUntil && cooldownUntil > now)

  // Cada canal agota su propia cuota. El enlace seguro es la salida cuando el correo no llega:
  // hacerlo depender del contador del correo cerraba la última puerta del candidato justo en el
  // escenario para el que fue diseñado.
  const emailLimited = used >= ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS || cooldownActive
  const secureLinkLimited = secureLinkUsed >= ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS || cooldownActive

  // `eligible` describe el assessment (estado, plazo, consentimiento), no el presupuesto de un
  // canal: un test recuperable con el correo agotado sigue siendo recuperable por enlace seguro.
  const eligible = eligibility.allowed && !(emailLimited && secureLinkLimited)
  const emailProviderBlocked = Boolean(row.email_provider_status)

  return {
    assessmentId: row.assessment_id,
    applicationId: row.application_id,
    openingId: row.opening_id,
    status: row.status,
    eligible,
    eligibilityCode: eligibility.allowed ? null : eligibility.code,
    channels: {
      email: {
        available: eligibility.allowed && !emailLimited && row.has_candidate_email && !emailProviderBlocked,
        providerStatus: row.email_provider_status,
        hasCandidateEmail: row.has_candidate_email,
      },
      secureLink: { available: eligibility.allowed && !secureLinkLimited },
    },
    rateLimit: {
      maxPer24Hours: ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS,
      usedIn24Hours: used,
      cooldownUntil: cooldownUntil && cooldownUntil > now ? iso(cooldownUntil) : null,
      // `limited` sigue significando "no queda ningún canal": es lo que la UI usa para decidir si
      // muestra la salida o el mensaje de espera. Un correo agotado con enlace seguro disponible
      // NO es estar limitado.
      limited: emailLimited && secureLinkLimited,
    },
  }
}
