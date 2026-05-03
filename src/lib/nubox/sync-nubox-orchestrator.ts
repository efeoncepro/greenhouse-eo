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
  skipped?: boolean
  reason?: string
  raw?: unknown
  conformed?: unknown
  postgres?: unknown
}

export const runNuboxSyncOrchestration = async (): Promise<NuboxSyncOrchestratorResult> => {
  try {
    const readiness = await checkIntegrationReadiness('nubox')

    if (!readiness.ready) {
      console.log(`[nubox-sync] Skipped: Nubox upstream not ready — ${readiness.reason}`)

      return { skipped: true, reason: readiness.reason }
    }
  } catch (error) {
    console.warn('[nubox-sync] Readiness check failed, proceeding anyway:', error)
  }

  const results: NuboxSyncOrchestratorResult = {}

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
