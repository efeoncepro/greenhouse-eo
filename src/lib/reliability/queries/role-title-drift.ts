import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-785 Slice 7 — Reliability signals: role_title drift governance.
 *
 * Dos signals independientes:
 *
 *  1. `workforce.role_title.drift_with_entra` (drift, warning):
 *     - Cuenta miembros con `role_title` HR != `identity_profiles.job_title`
 *       (Entra) y `role_title_source = 'hr_manual'`. Esto NO es un problema
 *       per se — HR puede mantener intencionalmente un valor distinto al
 *       que Entra setea. Es una señal de awareness para que HR revise.
 *     - Steady state esperado: variable. Severidad `warning` cuando count > 0
 *       (informativo, no bloqueante).
 *
 *  2. `workforce.role_title.unresolved_drift_overdue` (drift, error):
 *     - Cuenta drift proposals con status='pending' y `first_detected_at`
 *       hace más de 30 días. Esto SÍ es un problema — significa que HR
 *       no está revisando el queue.
 *     - Steady state esperado = 0. Severidad `error` cuando count > 0.
 *
 * Roll up bajo moduleKey 'identity' (registry actualizado).
 */

export const ROLE_TITLE_DRIFT_WITH_ENTRA_SIGNAL_ID =
  'workforce.role_title.drift_with_entra'

export const ROLE_TITLE_UNRESOLVED_DRIFT_OVERDUE_SIGNAL_ID =
  'workforce.role_title.unresolved_drift_overdue'

const DRIFT_WITH_ENTRA_QUERY = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.members m
  JOIN greenhouse_core.identity_profiles ip
    ON ip.profile_id = m.identity_profile_id
  WHERE m.role_title IS NOT NULL
    AND ip.job_title IS NOT NULL
    AND m.role_title != ip.job_title
    AND m.role_title_source = 'hr_manual'
`

const UNRESOLVED_DRIFT_OVERDUE_QUERY = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.member_role_title_drift_proposals
  WHERE status = 'pending'
    AND first_detected_at < NOW() - INTERVAL '30 days'
`

export const getRoleTitleDriftWithEntraSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(DRIFT_WITH_ENTRA_QUERY)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: ROLE_TITLE_DRIFT_WITH_ENTRA_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getRoleTitleDriftWithEntraSignal',
      label: 'Role title con drift HR ↔ Entra',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin drift entre members.role_title (HR) e identity_profiles.job_title (Entra).'
          : `${count} miembro${count === 1 ? '' : 's'} con role_title HR distinto a Entra. Revisar /hr/people o resolver vía drift queue.`,
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: DRIFT_WITH_ENTRA_QUERY.trim() },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-785-workforce-role-title-source-of-truth-governance.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_role_title_drift_with_entra' }
    })

    return {
      signalId: ROLE_TITLE_DRIFT_WITH_ENTRA_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getRoleTitleDriftWithEntraSignal',
      label: 'Role title con drift HR ↔ Entra',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
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

export const getRoleTitleUnresolvedDriftOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(UNRESOLVED_DRIFT_OVERDUE_QUERY)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: ROLE_TITLE_UNRESOLVED_DRIFT_OVERDUE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getRoleTitleUnresolvedDriftOverdueSignal',
      label: 'Drift de role title sin resolver (>30 días)',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin drift proposals pendientes >30 días. HR atiende el queue al día.'
          : `${count} drift proposal${count === 1 ? '' : 's'} sin resolver hace más de 30 días. HR debe revisar queue.`,
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: UNRESOLVED_DRIFT_OVERDUE_QUERY.trim() },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-785-workforce-role-title-source-of-truth-governance.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_role_title_unresolved_drift_overdue' }
    })

    return {
      signalId: ROLE_TITLE_UNRESOLVED_DRIFT_OVERDUE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getRoleTitleUnresolvedDriftOverdueSignal',
      label: 'Drift de role title sin resolver (>30 días)',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
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
