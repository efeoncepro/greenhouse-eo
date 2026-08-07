import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1304 — Detector de tasks OnPage colgadas (`seo.audit.stuck_tasks`).
 *
 * Un run en `running` es normal durante el crawl; uno viejo es una task zombie. Matriz:
 * steady = 0 runs colgados. `running` ≥ 6h → warning (crawl legítimamente lento o task
 * colgada — la signal avisa temprano; el collect da el veredicto `failed` a las 24h).
 * `running` ≥ 30h → error: el collect debió degradarlo a `failed` a las 24h, así que un
 * run vivo a las 30h significa que el PROPIO collect no está corriendo (scheduler
 * pausado, worker caído o flag OFF con runs en vuelo).
 *
 * Date-math: `started_at`/`created_at` son TIMESTAMPTZ — la comparación es de
 * intervalos, nunca EXTRACT(EPOCH FROM DATE-DATE) (gate TASK-893).
 */
export const SEO_AUDIT_STUCK_TASKS_SIGNAL_ID = 'seo.audit.stuck_tasks'

export const SEO_AUDIT_STUCK_WARN_HOURS = 6
export const SEO_AUDIT_STUCK_ERROR_HOURS = 30

const QUERY_SQL = `
  SELECT
    r.audit_run_id,
    r.seo_target_id,
    (NOW() - COALESCE(r.started_at, r.created_at)) >= ($1::int * INTERVAL '1 hour') AS is_warn,
    (NOW() - COALESCE(r.started_at, r.created_at)) >= ($2::int * INTERVAL '1 hour') AS is_error
  FROM greenhouse_growth.seo_site_audit_runs r
  WHERE r.status = 'running'
`

type StuckRow = {
  audit_run_id: string
  seo_target_id: string
  is_warn: boolean
  is_error: boolean
}

export const getSeoAuditStuckTasksSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<StuckRow>(QUERY_SQL, [SEO_AUDIT_STUCK_WARN_HOURS, SEO_AUDIT_STUCK_ERROR_HOURS])

    const running = rows.length
    const zombies = rows.filter(row => row.is_error).length
    const stuck = rows.filter(row => row.is_warn && !row.is_error).length

    const severity: 'ok' | 'warning' | 'error' | 'unknown' =
      zombies > 0 ? 'error' : stuck > 0 ? 'warning' : 'ok'

    const summary =
      severity === 'ok'
        ? running > 0
          ? `${running} audit(s) OnPage en curso dentro de la ventana normal.`
          : 'Sin audits OnPage en vuelo.'
        : zombies > 0
          ? `${zombies} run(s) de audit siguen en running pasadas ${SEO_AUDIT_STUCK_ERROR_HOURS}h — el collect debió degradarlos a failed a las ${24}h: revisar el scheduler ops-seo-audit-collect / worker / flag.`
          : `${stuck} run(s) de audit llevan más de ${SEO_AUDIT_STUCK_WARN_HOURS}h en running (task OnPage lenta o colgada; el collect degrada a failed a las 24h).`

    return {
      signalId: SEO_AUDIT_STUCK_TASKS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoAuditStuckTasksSignal',
      label: 'Tasks OnPage de site audit colgadas',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `seo_site_audit_runs en running — edad vs umbrales ${SEO_AUDIT_STUCK_WARN_HOURS}h/${SEO_AUDIT_STUCK_ERROR_HOURS}h`
        },
        { kind: 'metric', label: 'running', value: String(running) },
        { kind: 'metric', label: 'stuck', value: String(stuck) },
        { kind: 'metric', label: 'zombies', value: String(zombies) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_audit_stuck_tasks' }
    })

    return {
      signalId: SEO_AUDIT_STUCK_TASKS_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoAuditStuckTasksSignal',
      label: 'Tasks OnPage de site audit colgadas',
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
