import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-784 Slice 7 — Reliability signal:
 * Reveals sensitivos por usuario en las ultimas 24h.
 *
 * Steady state esperado = 0 (revelar es accion poco frecuente). Si un usuario
 * pasa el threshold (>3 reveals en 24h) puede indicar abuso o attacker
 * persistente. Reporta el TOTAL acumulado para ops triage.
 */

export const IDENTITY_LEGAL_PROFILE_REVEAL_ANOMALY_SIGNAL_ID =
  'identity.legal_profile.reveal_anomaly_rate'

const ANOMALY_THRESHOLD_PER_ACTOR = 3
const WINDOW_HOURS = 24

const QUERY_SQL = `
  WITH actor_counts AS (
    SELECT actor_user_id, COUNT(*)::int AS n
    FROM greenhouse_core.person_identity_document_audit_log
    WHERE action = 'revealed_sensitive'
      AND created_at > NOW() - INTERVAL '${WINDOW_HOURS} hours'
      AND actor_user_id IS NOT NULL
    GROUP BY actor_user_id
  )
  SELECT COALESCE(SUM(n), 0)::int AS total_reveals,
         COALESCE(SUM(CASE WHEN n > ${ANOMALY_THRESHOLD_PER_ACTOR} THEN 1 ELSE 0 END), 0)::int AS anomalous_actors
  FROM actor_counts
`

export const getIdentityLegalProfileRevealAnomalySignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ total_reveals: number; anomalous_actors: number; [key: string]: unknown }>(
      QUERY_SQL
    )

    const totalReveals = Number(rows[0]?.total_reveals ?? 0)
    const anomalousActors = Number(rows[0]?.anomalous_actors ?? 0)

    let severity: ReliabilitySignal['severity'] = 'ok'

    if (anomalousActors > 0) severity = 'warning'
    if (anomalousActors >= 3) severity = 'error'

    return {
      signalId: IDENTITY_LEGAL_PROFILE_REVEAL_ANOMALY_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityLegalProfileRevealAnomalySignal',
      label: 'Reveals sensitivos en 24h',
      severity,
      summary:
        anomalousActors === 0
          ? `${totalReveals} reveal${totalReveals === 1 ? '' : 's'} en 24h. Ningun actor sobre threshold.`
          : `${anomalousActors} actor${anomalousActors === 1 ? '' : 's'} con > ${ANOMALY_THRESHOLD_PER_ACTOR} reveals en 24h (${totalReveals} total). Investiga uso anormal.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'See identity-legal-profile-reveal-anomaly.ts'
        },
        {
          kind: 'metric',
          label: 'total_reveals_24h',
          value: String(totalReveals)
        },
        {
          kind: 'metric',
          label: 'anomalous_actors',
          value: String(anomalousActors)
        },
        {
          kind: 'metric',
          label: 'threshold_per_actor',
          value: String(ANOMALY_THRESHOLD_PER_ACTOR)
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_identity_legal_profile_reveal_anomaly' }
    })

    return {
      signalId: IDENTITY_LEGAL_PROFILE_REVEAL_ANOMALY_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityLegalProfileRevealAnomalySignal',
      label: 'Reveals sensitivos en 24h',
      severity: 'unknown',
      summary: 'No fue posible leer el signal.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
