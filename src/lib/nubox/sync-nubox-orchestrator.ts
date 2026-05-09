import 'server-only'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'

import { syncNuboxToConformed } from './sync-nubox-conformed'
import { syncNuboxToPostgres } from './sync-nubox-to-postgres'
import { syncNuboxToRaw } from './sync-nubox-raw'
import { syncNuboxQuotesHot } from './sync-nubox-quotes-hot'

/**
 * TASK-775 Slice 3 — Orchestrator canónico nubox-sync (3 fases).
 *
 * Fase A: Fetch desde Nubox API → BigQuery raw
 * Fase B: Transform raw → conformed con identity resolution
 * Fase C: Project conformed → PostgreSQL operational tables
 *
 * Cada fase tiene try/catch independiente (best-effort downstream): si la fase
 * A falla, B y C se intentan igual con el último estado que tengan. Cada falla
 * emite Slack alert via `alertCronFailure(...)`. Equivalente al handler Vercel
 * original que vivía en `src/app/api/cron/nubox-sync/route.ts`.
 *
 * Reusable desde:
 *   - Vercel cron (legacy fallback): `src/app/api/cron/nubox-sync/route.ts`
 *   - Cloud Run ops-worker (canónico): `services/ops-worker/server.ts`
 */

export interface NuboxSyncOrchestratorResult {
  status: 'succeeded' | 'partial' | 'failed' | 'skipped'
  skipped?: boolean
  reason?: string
  raw?: unknown
  conformed?: unknown
  postgres?: unknown
  phaseStatuses?: {
    raw: 'succeeded' | 'partial' | 'failed' | 'unknown'
    conformed: 'succeeded' | 'failed' | 'unknown'
    postgres: 'succeeded' | 'failed' | 'unknown'
  }
}

type NuboxRawPhaseStatus = NonNullable<NuboxSyncOrchestratorResult['phaseStatuses']>['raw']

const hasErrorShape = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>

  if (typeof record.error === 'string' && record.error.length > 0) {
    return true
  }

  if (Array.isArray(record.errors) && record.errors.length > 0) {
    return true
  }

  return record.status === 'failed' || record.status === 'partial'
}

const getRawPhaseStatus = (value: unknown): NuboxRawPhaseStatus => {
  if (!value || typeof value !== 'object') return 'unknown'

  const status = (value as Record<string, unknown>).status

  return status === 'succeeded' || status === 'partial' || status === 'failed' ? status : hasErrorShape(value) ? 'failed' : 'succeeded'
}

const getSimplePhaseStatus = (value: unknown): 'succeeded' | 'failed' | 'unknown' => {
  if (value === undefined) return 'unknown'

  return hasErrorShape(value) ? 'failed' : 'succeeded'
}

export const runNuboxSyncOrchestration = async (): Promise<NuboxSyncOrchestratorResult> => {
  try {
    const readiness = await checkIntegrationReadiness('nubox')

    if (!readiness.ready) {
      console.log(`[nubox-sync] Skipped: Nubox upstream not ready — ${readiness.reason}`)

      return { status: 'skipped', skipped: true, reason: readiness.reason }
    }
  } catch (error) {
    console.warn('[nubox-sync] Readiness check failed, proceeding anyway:', error)
  }

  const results: NuboxSyncOrchestratorResult = { status: 'failed' }

  try {
    results.raw = await syncNuboxToRaw()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox raw sync failed:', error)
    await alertCronFailure('nubox-sync/raw', error)
    results.raw = { error: message }
  }

  try {
    results.conformed = await syncNuboxToConformed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox conformed sync failed:', error)
    await alertCronFailure('nubox-sync/conformed', error)
    results.conformed = { error: message }
  }

  try {
    results.postgres = await syncNuboxToPostgres()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nubox postgres projection failed:', error)
    await alertCronFailure('nubox-sync/postgres', error)
    results.postgres = { error: message }
  }

  const phaseStatuses = {
    raw: getRawPhaseStatus(results.raw),
    conformed: getSimplePhaseStatus(results.conformed),
    postgres: getSimplePhaseStatus(results.postgres)
  }

  const failedCount = Object.values(phaseStatuses).filter(status => status === 'failed').length
  const unknownCount = Object.values(phaseStatuses).filter(status => status === 'unknown').length

  results.phaseStatuses = phaseStatuses

  if (failedCount === 0 && unknownCount === 0 && phaseStatuses.raw === 'succeeded') {
    results.status = 'succeeded'
  } else if (failedCount === 3 || (phaseStatuses.raw === 'failed' && phaseStatuses.conformed === 'failed' && phaseStatuses.postgres === 'failed')) {
    results.status = 'failed'
  } else {
    results.status = 'partial'
  }

  return results
}

/**
 * Orchestrator pure-pass-through del hot path de quotes (1 fase).
 * Wrapper consistente con `runNuboxSyncOrchestration` para que el ops-worker
 * tenga single shape de invocación.
 */
export const runNuboxQuotesHotSync = async (
  options?: { periods?: string[] }
): Promise<{ skipped?: boolean; reason?: string } | Awaited<ReturnType<typeof syncNuboxQuotesHot>>> => {
  try {
    const readiness = await checkIntegrationReadiness('nubox')

    if (!readiness.ready) {
      console.log(`[nubox-quotes-hot-sync] Skipped: Nubox upstream not ready — ${readiness.reason}`)

      return { skipped: true, reason: readiness.reason }
    }
  } catch (error) {
    console.warn('[nubox-quotes-hot-sync] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const result = await syncNuboxQuotesHot({ periods: options?.periods })

    console.log(
      `[nubox-quotes-hot-sync] sales=${result.salesFetched} quoteSales=${result.quoteSalesFetched} created=${result.quotesCreated} updated=${result.quotesUpdated} skipped=${result.quotesSkipped} durationMs=${result.durationMs}`
    )

    return result
  } catch (error) {
    console.error('[nubox-quotes-hot-sync] Cron failed:', error)
    await alertCronFailure('nubox-quotes-hot-sync', error)
    throw error
  }
}
