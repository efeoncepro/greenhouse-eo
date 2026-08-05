/**
 * TASK-1302 — Batch diario de materialización GSC (Cloud Scheduler → ops-worker).
 *
 * Vive acá y no dentro del handler HTTP para que sea testeable y reusable (el handler
 * del worker queda fino, igual que `drainPendingGraderRuns` en el grader).
 *
 * Cloud Scheduler y NO Vercel cron: Vercel sólo ejecuta crons en deploys de Production,
 * así que en staging el materializer sería invisible y la serie arrancaría con un hueco
 * (CLAUDE.md §Outbox publisher canónico).
 */

import 'server-only'

import { getSantiagoDateParts } from '@/lib/calendar/business-time'
import { listActiveSearchConsoleOrganizations } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'

import { materializeGscDailySnapshot } from './gsc-daily-materializer'

/**
 * Ventana móvil por defecto. 5 días cubre con holgura el lag típico de publicación de
 * GSC (~2 días, sin garantía) más la consolidación tardía de los días ya capturados.
 */
const DEFAULT_LOOKBACK_DAYS = 5

export interface GscDailyBatchOrgOutcome {
  organizationId: string
  captureDate: string
  status: 'materialized' | 'degraded' | 'failed'
  rowsWritten: number
  truncated: boolean
  errorCode: string | null
}

export interface GscDailyBatchResult {
  captureDates: string[]
  orgs: number
  materialized: number
  degraded: number
  failed: number
  rowsWritten: number
  truncatedOrgs: number
  outcomes: GscDailyBatchOrgOutcome[]
}

/**
 * Ventana por defecto: **una ventana móvil de días recientes**, no un solo día.
 *
 * ⚠️ Medido en vivo el 2026-08-05 durante el rollout: **GSC no publica D-1**. La consulta
 * a D-1 responde `ok` con CERO filas y recién D-2 trae datos. Un job que materializara
 * sólo "ayer" escribiría un día vacío cada vez y **nunca volvería a buscarlo** cuando el
 * dato llegara — la serie quedaría permanentemente vacía, con el batch reportando éxito.
 *
 * Rematerializar una ventana en cada corrida resuelve dos cosas con el mismo mecanismo:
 * absorbe el lag de publicación (que Google no garantiza y varía) y corrige el
 * consolidado tardío (~48h) de los días ya capturados. Es seguro por construcción porque
 * el UPSERT es idempotente por `(org, capture_date, query, page)`.
 */
export const resolveDefaultCaptureWindow = (lookbackDays = DEFAULT_LOOKBACK_DAYS, at?: Date): string[] => {
  const parts = getSantiagoDateParts(at ?? new Date())

  // El helper canónico devuelve null ante una fecha no parseable. Se degrada explícito en
  // vez de asumirlo: una fecha mal resuelta escribiría la serie en el día equivocado, que
  // es peor que no escribirla.
  if (!parts) {
    throw new Error('resolveDefaultCaptureWindow: no se pudo resolver la fecha en America/Santiago')
  }

  const days: string[] = []

  for (let back = 1; back <= Math.max(1, lookbackDays); back += 1) {
    // Date.UTC + setUTCDate evita el bug de restar 86_400_000 ms, que se equivoca en los
    // cambios de horario de verano de Chile.
    const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))

    day.setUTCDate(day.getUTCDate() - back)
    days.push(day.toISOString().slice(0, 10))
  }

  return days
}

/**
 * Materializa un día para todas las orgs con conexión GSC activa.
 *
 * Per-org resilience: una org que falla se registra y el batch continúa. Un token
 * revocado de un cliente NUNCA puede impedir que se capture la serie de los demás —
 * y esa serie no se puede reconstruir después.
 */
export const runGscDailySnapshotBatch = async (
  options: { captureDate?: string; lookbackDays?: number; maxOrgs?: number } = {}
): Promise<GscDailyBatchResult> => {
  // `captureDate` explícito ⇒ un solo día (re-materialización puntual). Sin él, la ventana
  // móvil, que es lo que corre a diario.
  const captureDates = options.captureDate
    ? [options.captureDate]
    : resolveDefaultCaptureWindow(options.lookbackDays)

  const allOrgs = await listActiveSearchConsoleOrganizations()
  const orgs = typeof options.maxOrgs === 'number' && options.maxOrgs > 0 ? allOrgs.slice(0, options.maxOrgs) : allOrgs

  const outcomes: GscDailyBatchOrgOutcome[] = []

  for (const org of orgs) {
    for (const captureDate of captureDates) {
      try {
        const result = await materializeGscDailySnapshot(org.organizationId, captureDate)

        if (result.ok) {
          outcomes.push({
            organizationId: org.organizationId,
            captureDate,
            status: 'materialized',
            rowsWritten: result.rowsWritten,
            truncated: result.truncated,
            errorCode: null
          })
        } else {
          outcomes.push({
            organizationId: org.organizationId,
            captureDate,
            status: 'degraded',
            rowsWritten: 0,
            truncated: false,
            errorCode: result.errorCode
          })
        }
      } catch (error) {
        captureWithDomain(error, 'growth', {
          tags: { source: 'seo_gsc_daily_batch' },
          extra: { organizationId: org.organizationId, captureDate }
        })

        outcomes.push({
          organizationId: org.organizationId,
          captureDate,
          status: 'failed',
          rowsWritten: 0,
          truncated: false,
          errorCode: 'unexpected_error'
        })
      }
    }
  }

  return {
    captureDates,
    orgs: orgs.length,
    materialized: outcomes.filter(outcome => outcome.status === 'materialized').length,
    degraded: outcomes.filter(outcome => outcome.status === 'degraded').length,
    failed: outcomes.filter(outcome => outcome.status === 'failed').length,
    rowsWritten: outcomes.reduce((total, outcome) => total + outcome.rowsWritten, 0),
    truncatedOrgs: outcomes.filter(outcome => outcome.truncated).length,
    outcomes
  }
}
