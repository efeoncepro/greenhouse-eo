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

export interface GscDailyBatchOrgOutcome {
  organizationId: string
  status: 'materialized' | 'degraded' | 'failed'
  rowsWritten: number
  truncated: boolean
  errorCode: string | null
}

export interface GscDailyBatchResult {
  captureDate: string
  orgs: number
  materialized: number
  degraded: number
  failed: number
  rowsWritten: number
  truncatedOrgs: number
  outcomes: GscDailyBatchOrgOutcome[]
}

/**
 * Fecha objetivo por defecto: **ayer** en `America/Santiago`.
 *
 * Ayer y no hoy porque GSC no publica el día en curso; pedirlo devolvería un día
 * incompleto y grabaría una medición engañosa. El re-run posterior del mismo día corrige
 * el consolidado tardío de Google gracias al UPSERT idempotente.
 */
export const resolveDefaultCaptureDate = (at?: Date): string => {
  const now = at ?? new Date()
  const parts = getSantiagoDateParts(now)

  // El helper canónico devuelve null ante una fecha no parseable. Acá `now` siempre es
  // un Date válido, pero se degrada explícito en vez de asumirlo: una fecha mal resuelta
  // escribiría la serie en el día equivocado, que es peor que no escribirla.
  if (!parts) {
    throw new Error('resolveDefaultCaptureDate: no se pudo resolver la fecha en America/Santiago')
  }

  // Date.UTC + setUTCDate(-1) evita el bug de restar 86_400_000 ms, que se equivoca en
  // los cambios de horario de verano de Chile.
  const yesterday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))

  yesterday.setUTCDate(yesterday.getUTCDate() - 1)

  return yesterday.toISOString().slice(0, 10)
}

/**
 * Materializa un día para todas las orgs con conexión GSC activa.
 *
 * Per-org resilience: una org que falla se registra y el batch continúa. Un token
 * revocado de un cliente NUNCA puede impedir que se capture la serie de los demás —
 * y esa serie no se puede reconstruir después.
 */
export const runGscDailySnapshotBatch = async (
  options: { captureDate?: string; maxOrgs?: number } = {}
): Promise<GscDailyBatchResult> => {
  const captureDate = options.captureDate ?? resolveDefaultCaptureDate()
  const allOrgs = await listActiveSearchConsoleOrganizations()
  const orgs = typeof options.maxOrgs === 'number' && options.maxOrgs > 0 ? allOrgs.slice(0, options.maxOrgs) : allOrgs

  const outcomes: GscDailyBatchOrgOutcome[] = []

  for (const org of orgs) {
    try {
      const result = await materializeGscDailySnapshot(org.organizationId, captureDate)

      if (result.ok) {
        outcomes.push({
          organizationId: org.organizationId,
          status: 'materialized',
          rowsWritten: result.rowsWritten,
          truncated: result.truncated,
          errorCode: null
        })
      } else {
        outcomes.push({
          organizationId: org.organizationId,
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
        status: 'failed',
        rowsWritten: 0,
        truncated: false,
        errorCode: 'unexpected_error'
      })
    }
  }

  return {
    captureDate,
    orgs: orgs.length,
    materialized: outcomes.filter(outcome => outcome.status === 'materialized').length,
    degraded: outcomes.filter(outcome => outcome.status === 'degraded').length,
    failed: outcomes.filter(outcome => outcome.status === 'failed').length,
    rowsWritten: outcomes.reduce((total, outcome) => total + outcome.rowsWritten, 0),
    truncatedOrgs: outcomes.filter(outcome => outcome.truncated).length,
    outcomes
  }
}
