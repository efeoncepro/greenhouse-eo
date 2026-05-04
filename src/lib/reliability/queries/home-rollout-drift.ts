import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-780 Phase 3 — Reliability signal: home rollout drift.
 *
 * Detecta divergencias entre la flag canónica PG (`home_rollout_flags`) y los
 * 2 mecanismos colaterales que deciden la variante de home:
 *
 *  1. **Env fallback drift** — si la flag PG está prendida globalmente pero
 *     `process.env.HOME_V2_ENABLED` apunta a otra cosa, hay riesgo de que un
 *     fallback (PG caído) renderice variante distinta a la esperada.
 *
 *  2. **Opt-out rate drift** — si > 5% de usuarios activos tienen
 *     `client_users.home_v2_opt_out=TRUE`, es señal de regresión de UX en V2:
 *     los usuarios están escapando manualmente.
 *
 * **Steady state esperado**: 0 issues. Cualquier valor > 0 → severity = `error`.
 *
 * **Why "drift" kind**: dos sources of truth que deberían coincidir (PG flag
 * vs env var; opt-out rate vs ~0%). Mismo vocabulario que TASK-765 / TASK-774.
 *
 * Pattern reference: TASK-773 outbox-unpublished-lag, TASK-774 account-balances-fx-drift.
 */
export const HOME_ROLLOUT_DRIFT_SIGNAL_ID = 'home.rollout.drift'

const OPT_OUT_THRESHOLD_PERCENT = 5.0

const QUERY_SQL = `
  WITH active_users AS (
    SELECT
      COUNT(*) FILTER (WHERE home_v2_opt_out = TRUE) AS opted_out,
      COUNT(*)                                       AS total_active
    FROM greenhouse_core.client_users
    WHERE is_active = TRUE
  ),
  global_flag AS (
    SELECT enabled
    FROM greenhouse_serving.home_rollout_flags
    WHERE flag_key = 'home_v2_shell'
      AND scope_type = 'global'
    LIMIT 1
  )
  SELECT
    COALESCE((SELECT opted_out     FROM active_users), 0)::int AS opted_out,
    COALESCE((SELECT total_active  FROM active_users), 0)::int AS total_active,
    (SELECT enabled FROM global_flag)                          AS pg_global_enabled
`

type DriftRow = {
  opted_out: number
  total_active: number
  pg_global_enabled: boolean | null
} & Record<string, unknown>

const readEnvSetting = (): boolean | null => {
  const raw = (process.env.HOME_V2_ENABLED ?? '').trim().toLowerCase()

  if (raw === 'true' || raw === '1' || raw === 'on') return true
  if (raw === 'false' || raw === '0' || raw === 'off') return false

  return null
}

export const getHomeRolloutDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<DriftRow>(QUERY_SQL)
    const row = rows[0] ?? { opted_out: 0, total_active: 0, pg_global_enabled: null }

    const optedOut = Number(row.opted_out ?? 0)
    const totalActive = Number(row.total_active ?? 0)
    const optOutRate = totalActive === 0 ? 0 : (optedOut / totalActive) * 100
    const pgGlobal = row.pg_global_enabled
    const envSetting = readEnvSetting()

    const driftReasons: string[] = []

    if (pgGlobal === null) {
      driftReasons.push('Falta fila global en home_rollout_flags (flag_key=home_v2_shell, scope=global)')
    }

    if (pgGlobal !== null && envSetting !== null && pgGlobal !== envSetting) {
      driftReasons.push(
        `PG global flag (${pgGlobal ? 'enabled' : 'disabled'}) diverge de env HOME_V2_ENABLED (${envSetting ? 'enabled' : 'disabled'})`
      )
    }

    if (optOutRate > OPT_OUT_THRESHOLD_PERCENT) {
      driftReasons.push(
        `Opt-out rate ${optOutRate.toFixed(2)}% supera el umbral ${OPT_OUT_THRESHOLD_PERCENT}% (${optedOut}/${totalActive} usuarios activos optaron por legacy)`
      )
    }

    const severity: ReliabilitySignal['severity'] = driftReasons.length === 0 ? 'ok' : 'error'

    return {
      signalId: HOME_ROLLOUT_DRIFT_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getHomeRolloutDriftSignal',
      label: 'Drift de rollout Home V2',
      severity,
      summary:
        driftReasons.length === 0
          ? `Rollout estable. Opt-out rate ${optOutRate.toFixed(2)}% (${optedOut}/${totalActive}). PG global flag ${pgGlobal ? 'on' : 'off'}.`
          : `${driftReasons.length} drift detectado${driftReasons.length === 1 ? '' : 's'}: ${driftReasons.join(' · ')}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'opt_out_rate_percent', value: optOutRate.toFixed(2) },
        { kind: 'metric', label: 'opt_out_users', value: String(optedOut) },
        { kind: 'metric', label: 'active_users', value: String(totalActive) },
        { kind: 'metric', label: 'pg_global_enabled', value: pgGlobal === null ? 'missing' : String(pgGlobal) },
        { kind: 'metric', label: 'env_setting', value: envSetting === null ? 'unset' : String(envSetting) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-780-home-rollout-flag-platform.md (phase 3)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'reliability_signal_home_rollout_drift' }
    })

    return {
      signalId: HOME_ROLLOUT_DRIFT_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getHomeRolloutDriftSignal',
      label: 'Drift de rollout Home V2',
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
