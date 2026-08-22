import 'server-only'

import { realOnlyPredicate } from '@/lib/hiring/data-origin/contracts'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

type IntegrityRow = {
  facets_without_membership: number
  eligible_without_consent: number
  withdrawn_with_evidence: number
}

export const HIRING_TALENT_POOL_INTEGRITY_SIGNAL_ID = 'hiring.talent_pool.integrity'

/**
 * TASK-1748 — la señal cuenta SÓLO población real, y no es cosmético.
 *
 * `facets_without_membership` mide «fichas activas que la projection todavía no proyectó». Desde que
 * la projection deja de materializar membresías para personas sintéticas (a propósito), una ficha
 * sintética sin membresía dejó de ser un atraso y pasó a ser el resultado correcto. Sin este filtro
 * la señal saldría de su steady 0 y diría «N candidate facets aún no están proyectados» sobre
 * registros que nunca van a proyectarse — una alerta permanente y falsa, que es peor que no tenerla
 * porque entrena a ignorar el tablero.
 *
 * Los otros dos contadores (consentimiento y retiro) NO se filtran por procedencia y también es
 * deliberado: miden violaciones sobre membresías que ya existen, y una violación de consentimiento
 * no deja de serlo por la procedencia del sujeto. Lo que la procedencia gobierna es la visibilidad,
 * jamás el consentimiento ni el compliance.
 */
export const getHiringTalentPoolIntegritySignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Integridad del Banco de Talento'

  try {
    const rows = await runGreenhousePostgresQuery<IntegrityRow>(`SELECT
      (SELECT COUNT(*)::int FROM greenhouse_hiring.candidate_facet cf
        JOIN greenhouse_core.identity_profiles ip ON ip.profile_id=cf.identity_profile_id AND ${realOnlyPredicate('ip')}
        WHERE cf.status='active' AND NOT EXISTS (SELECT 1 FROM greenhouse_hiring.talent_pool_membership m WHERE m.candidate_facet_id=cf.candidate_facet_id)) AS facets_without_membership,
      (SELECT COUNT(*)::int FROM greenhouse_hiring.talent_pool_membership m
        WHERE m.lifecycle_status='pool_eligible' AND NOT EXISTS (
          SELECT 1 FROM greenhouse_hiring.talent_pool_consent_event e
          WHERE e.membership_id=m.membership_id AND e.purpose='future_opportunities' AND e.action='granted'
            AND e.expires_at>NOW() AND NOT EXISTS (SELECT 1 FROM greenhouse_hiring.talent_pool_consent_event w
              WHERE w.membership_id=e.membership_id AND w.purpose=e.purpose AND w.action='withdrawn' AND w.occurred_at>=e.occurred_at)
        )) AS eligible_without_consent,
      (SELECT COUNT(*)::int FROM greenhouse_hiring.talent_pool_membership m
        WHERE m.lifecycle_status='withdrawn' AND EXISTS (
          SELECT 1 FROM greenhouse_hiring.talent_pool_evidence_projection e WHERE e.membership_id=m.membership_id
        )) AS withdrawn_with_evidence`)

    const row = rows[0] ?? { facets_without_membership: 0, eligible_without_consent: 0, withdrawn_with_evidence: 0 }
    const critical = Number(row.eligible_without_consent) + Number(row.withdrawn_with_evidence)
    const lag = Number(row.facets_without_membership)

    return {
      signalId: HIRING_TALENT_POOL_INTEGRITY_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringTalentPoolIntegritySignal',
      label,
      severity: critical > 0 ? 'error' : lag > 0 ? 'warning' : 'ok',
      summary:
        critical > 0
          ? 'El banco contiene una violación de consentimiento o retiro.'
          : lag > 0
            ? `${lag} fichas reales aún no están proyectadas.`
            : 'Membership, consentimiento y retiro están reconciliados.',
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'facets_without_membership', value: String(lag) },
        { kind: 'metric', label: 'eligible_without_consent', value: String(row.eligible_without_consent) },
        { kind: 'metric', label: 'withdrawn_with_evidence', value: String(row.withdrawn_with_evidence) },
        { kind: 'doc', label: 'ADR', value: 'docs/architecture/GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_talent_pool_integrity' } })

    return {
      signalId: HIRING_TALENT_POOL_INTEGRITY_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringTalentPoolIntegritySignal',
      label,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar la integridad del Banco de Talento.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }]
    }
  }
}
