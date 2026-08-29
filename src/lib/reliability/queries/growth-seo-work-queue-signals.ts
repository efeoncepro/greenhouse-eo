import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1700 — Las tres señales de la cola priorizada. Steady = 0 en las tres.
 *
 * Vigilan cosas que ninguna señal SEO existente vigila: las de hoy miran el pipeline de
 * CAPTURA (¿llegaron los datos?), y estas miran si el operador está mirando un PLAN válido.
 */

const MODULE_KEY = 'growth' as const

/**
 * Degradación honesta compartida: `unknown` no es `ok`.
 *
 * El error se reporta a Sentry ANTES de devolver — una señal que no se puede leer y no deja
 * rastro es indistinguible de una que nunca se cableó.
 */
const unknownSignal = (
  signalId: string,
  label: string,
  source: string,
  error: unknown,
  observedAt: string
): ReliabilitySignal => {
  captureWithDomain(error, 'growth', { tags: { source } })

  return {
    signalId,
    moduleKey: MODULE_KEY,
    kind: 'data_quality',
    source,
    severity: 'unknown',
    label,
    summary: 'No fue posible leer el signal. Revisa los logs.',
    observedAt,
    evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
  }
}

// ─── 1. Plan vencido ────────────────────────────────────────────────────────

export const GROWTH_SEO_WORK_QUEUE_STALE_SNAPSHOT_SIGNAL_ID = 'growth.seo.work_queue.stale_snapshot'

/**
 * Targets ELEGIBLES cuyo plan vigente pasó su `expires_at` — o que nunca tuvieron uno.
 *
 * 🔴 El denominador son los targets elegibles, NO los que ya tienen snapshot. Contar sólo
 * sobre los que tienen cola haría invisible el caso peor: un target elegible que nunca
 * materializó, que es exactamente lo que pasa cuando el flag quedó prendido en un solo
 * runtime. Ese modo de falla no produce un snapshot viejo — produce ninguno.
 */
export const getGrowthSeoWorkQueueStaleSnapshotSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ eligible: number; stale: number; never_materialized: number }>(
      `WITH eligible AS (
         SELECT t.seo_target_id
           FROM greenhouse_growth.seo_targets t
          WHERE t.status = 'active'
            AND EXISTS (
              SELECT 1 FROM greenhouse_client_portal.module_assignments ma
               WHERE ma.organization_id = t.organization_id
                 AND ma.module_key = 'seo_v2'
                 AND ma.effective_to IS NULL
                 AND ma.status IN ('active', 'pilot')
            )
       ),
       latest AS (
         SELECT DISTINCT ON (s.seo_target_id) s.seo_target_id, s.expires_at
           FROM greenhouse_growth.seo_work_queue_snapshots s
          ORDER BY s.seo_target_id, s.computed_at DESC
       )
       SELECT COUNT(*)::int                                                        AS eligible,
              COUNT(*) FILTER (WHERE l.expires_at IS NOT NULL AND l.expires_at < NOW())::int AS stale,
              COUNT(*) FILTER (WHERE l.expires_at IS NULL)::int                    AS never_materialized
         FROM eligible e
         LEFT JOIN latest l ON l.seo_target_id = e.seo_target_id`
    )

    const row = rows[0] ?? { eligible: 0, stale: 0, never_materialized: 0 }

    // Nunca materializado es peor que vencido: el segundo es un cron perdido, el primero
    // suele ser el flag prendido en un solo runtime — la bug class documentada del ledger.
    const severity: 'ok' | 'warning' | 'error' =
      row.never_materialized > 0 ? 'error' : row.stale > 0 ? 'warning' : 'ok'

    return {
      signalId: GROWTH_SEO_WORK_QUEUE_STALE_SNAPSHOT_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: 'getGrowthSeoWorkQueueStaleSnapshotSignal',
      label: 'Plan de trabajo SEO vencido o ausente',
      severity,
      summary:
        severity === 'error'
          ? `${row.never_materialized} sitio(s) con el módulo SEO activo NUNCA materializaron su cola. Suele significar que el flag está prendido en un solo runtime: sin el ops-worker no se escribe ningún snapshot.`
          : severity === 'warning'
            ? `${row.stale} sitio(s) tienen un plan vencido: el operador puede estar decidiendo sobre recomendaciones de ayer.`
            : 'Todos los sitios elegibles tienen un plan de trabajo vigente.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'targets_elegibles', value: String(row.eligible) },
        { kind: 'metric', label: 'plan_vencido', value: String(row.stale) },
        { kind: 'metric', label: 'nunca_materializado', value: String(row.never_materialized) }
      ]
    }
  } catch (error) {
    return unknownSignal(
      GROWTH_SEO_WORK_QUEUE_STALE_SNAPSHOT_SIGNAL_ID,
      'Plan de trabajo SEO vencido o ausente',
      'getGrowthSeoWorkQueueStaleSnapshotSignal',
      error,
      observedAt
    )
  }
}

// ─── 2. Origen degradado ────────────────────────────────────────────────────

export const GROWTH_SEO_WORK_QUEUE_ORIGIN_DEGRADED_SIGNAL_ID = 'growth.seo.work_queue.origin_degraded'

/**
 * Orígenes en `degraded`/`down` en el snapshot VIGENTE de cada target.
 *
 * 🔴 Es la señal que impide que un plan parcial se lea como completo. Un origen caído no
 * produce filas vacías ni ceros — sus filas simplemente NO EXISTEN, así que la pantalla se
 * ve perfectamente normal y el operador trabaja sobre una lista a la que le falta trabajo.
 * `down` es error; `degraded` es warning: lo primero es un motor que falló, lo segundo suele
 * ser una capacidad que esa organización no tiene encendida.
 */
export const getGrowthSeoWorkQueueOriginDegradedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ origin: string; state: string; targets: number }>(
      `WITH latest AS (
         SELECT DISTINCT ON (s.seo_target_id) s.seo_target_id, s.origin_health_json
           FROM greenhouse_growth.seo_work_queue_snapshots s
          ORDER BY s.seo_target_id, s.computed_at DESC
       ),
       health AS (
         SELECT l.seo_target_id,
                (entry ->> 'origin') AS origin,
                (entry ->> 'state')  AS state
           FROM latest l,
                LATERAL jsonb_array_elements(l.origin_health_json) AS entry
       )
       SELECT origin, state, COUNT(DISTINCT seo_target_id)::int AS targets
         FROM health
        WHERE state <> 'ok'
        GROUP BY origin, state
        ORDER BY state, origin`
    )

    const down = rows.filter(r => r.state === 'down')
    const degraded = rows.filter(r => r.state === 'degraded')

    const severity: 'ok' | 'warning' | 'error' =
      down.length > 0 ? 'error' : degraded.length > 0 ? 'warning' : 'ok'

    return {
      signalId: GROWTH_SEO_WORK_QUEUE_ORIGIN_DEGRADED_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: 'getGrowthSeoWorkQueueOriginDegradedSignal',
      label: 'Orígenes de la cola SEO degradados',
      severity,
      summary:
        severity === 'ok'
          ? 'Todos los orígenes de la cola reportan sano en los planes vigentes.'
          : `${rows.reduce((acc, r) => acc + r.targets, 0)} plan(es) vigentes traen orígenes fuera de "ok": ${rows
              .map(r => `${r.origin}=${r.state} (${r.targets})`)
              .join(', ')}. Al plan le FALTA trabajo, no es que no lo haya.`,
      observedAt,
      evidence: rows.map(r => ({
        kind: 'metric' as const,
        label: `${r.origin}_${r.state}`,
        value: String(r.targets)
      }))
    }
  } catch (error) {
    return unknownSignal(
      GROWTH_SEO_WORK_QUEUE_ORIGIN_DEGRADED_SIGNAL_ID,
      'Orígenes de la cola SEO degradados',
      'getGrowthSeoWorkQueueOriginDegradedSignal',
      error,
      observedAt
    )
  }
}

// ─── 3. Drift de versión del score ──────────────────────────────────────────

export const GROWTH_SEO_WORK_QUEUE_SCORE_VERSION_DRIFT_SIGNAL_ID = 'growth.seo.work_queue.score_version_drift'

/**
 * Snapshots vigentes calculados con una `priority_score_version` distinta de la activa.
 *
 * 🔴 Detecta el cambio de peso SIN bump — el modo de falla que mueve el ranking histórico en
 * silencio. Su complemento en CI es el test de huella congelada de `score-versions.ts`; esta
 * señal cubre el otro lado: una versión nueva desplegada cuyos snapshots todavía no se
 * rematerializaron, o sea planes vigentes que dicen una cosa y una config que dice otra.
 *
 * La versión activa se pasa como parámetro y NO se hardcodea en el SQL: hardcodearla haría
 * que la señal quedara verde por comparar contra ella misma después de un bump.
 */
export const getGrowthSeoWorkQueueScoreVersionDriftSignal = async (
  activeVersion?: string
): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const { ACTIVE_PRIORITY_SCORE_VERSION } = await import('@/lib/growth/seo/work-queue/score-versions')
    const expected = activeVersion ?? ACTIVE_PRIORITY_SCORE_VERSION

    const rows = await query<{ priority_score_version: string; targets: number }>(
      `WITH latest AS (
         SELECT DISTINCT ON (s.seo_target_id) s.seo_target_id, s.priority_score_version
           FROM greenhouse_growth.seo_work_queue_snapshots s
          ORDER BY s.seo_target_id, s.computed_at DESC
       )
       SELECT priority_score_version, COUNT(*)::int AS targets
         FROM latest
        WHERE priority_score_version <> $1
        GROUP BY priority_score_version`,
      [expected]
    )

    const drifted = rows.reduce((acc, r) => acc + r.targets, 0)

    return {
      signalId: GROWTH_SEO_WORK_QUEUE_SCORE_VERSION_DRIFT_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'data_quality',
      source: 'getGrowthSeoWorkQueueScoreVersionDriftSignal',
      label: 'Planes SEO con versión de score desactualizada',
      severity: drifted > 0 ? 'warning' : 'ok',
      summary:
        drifted > 0
          ? `${drifted} plan(es) vigentes se calcularon con una versión de score distinta de la activa (${expected}): ${rows
              .map(r => `${r.priority_score_version} (${r.targets})`)
              .join(', ')}. Rematerializa antes de comparar sus recomendaciones con las nuevas.`
          : `Todos los planes vigentes usan la versión de score activa (${expected}).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'version_activa', value: expected },
        { kind: 'metric', label: 'planes_con_drift', value: String(drifted) }
      ]
    }
  } catch (error) {
    return unknownSignal(
      GROWTH_SEO_WORK_QUEUE_SCORE_VERSION_DRIFT_SIGNAL_ID,
      'Planes SEO con versión de score desactualizada',
      'getGrowthSeoWorkQueueScoreVersionDriftSignal',
      error,
      observedAt
    )
  }
}
