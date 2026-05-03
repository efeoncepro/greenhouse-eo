import 'server-only'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { fetchEntraUsersWithManagers } from '@/lib/entra/graph-client'
import { syncEntraProfiles } from '@/lib/entra/profile-sync'
import { createOrRenewSubscription } from '@/lib/entra/webhook-subscription'
import { processFailedEmailDeliveries } from '@/lib/email/delivery'
import { syncHubSpotCompanies } from '@/lib/hubspot/sync-hubspot-companies'
import { syncHubSpotCompanyLifecycles } from '@/lib/hubspot/sync-hubspot-company-lifecycle'
import { syncHubSpotDeals } from '@/lib/hubspot/sync-hubspot-deals'
import { syncHubSpotProductCatalog } from '@/lib/hubspot/sync-hubspot-products'
import { syncAllHubSpotQuotes } from '@/lib/hubspot/sync-hubspot-quotes'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'
import {
  listDueNotionSyncRecoveryRuns,
  runNotionSyncOrchestration
} from '@/lib/integrations/notion-sync-orchestration'
import {
  persistAutoMatchDecisions,
  scoreAutoMatches,
  type AutoMatchRow
} from '@/lib/finance/auto-match'
import {
  listReconciliationCandidatesByDateRangeFromPostgres,
  listUnmatchedStatementRowsByDateRangeFromPostgres,
  setReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { runEntraHierarchyGovernanceScan } from '@/lib/reporting-hierarchy/governance'
import { dispatchPendingWebhooks } from '@/lib/webhooks/dispatcher'

/**
 * TASK-775 Slice 7 — Orchestrators puros para los crons restantes.
 *
 * Cada función es la lógica completa que vivía inline en su respectivo handler
 * Vercel `route.ts`. Ahora es:
 *   - Reusable desde Vercel route.ts (fallback manual)
 *   - Reusable desde Cloud Run ops-worker (canónico)
 *
 * Convención: cada orchestrator devuelve `Record<string, unknown>` o
 * `{ skipped, reason }` para readiness gates. Errores siempre throw — el
 * caller (route.ts o wrapCronHandler) decide si captura.
 *
 * Single source of truth — cero duplicación de SQL/HTTP/iteration logic.
 */

// ─── Webhooks ────────────────────────────────────────────────────────────────

export const runWebhookDispatch = async (): Promise<Record<string, unknown>> => {
  try {
    const result = await dispatchPendingWebhooks()

    return { ...result }
  } catch (error) {
    await alertCronFailure('webhook-dispatch', error)
    throw error
  }
}

// ─── Email retry ─────────────────────────────────────────────────────────────

export const runEmailDeliveryRetry = async (): Promise<Record<string, unknown>> => {
  const result = await processFailedEmailDeliveries()

  return { ...result }
}

// ─── Entra ───────────────────────────────────────────────────────────────────

export const runEntraProfileSync = async (): Promise<Record<string, unknown>> => {
  const startMs = Date.now()
  const entraUsers = await fetchEntraUsersWithManagers()

  console.log(`[entra-profile-sync] Fetched ${entraUsers.length} users from Entra`)

  const result = await syncEntraProfiles(entraUsers)

  const hierarchyGovernance = await runEntraHierarchyGovernanceScan({
    triggeredBy: 'cron:entra-profile-sync',
    syncMode: 'poll',
    entraUsers
  })

  const durationMs = Date.now() - startMs

  console.log(
    `[entra-profile-sync] done processed=${result.processed} users_updated=${result.usersUpdated} profiles_created=${result.profilesCreated} profiles_linked=${result.profilesLinked} profiles_updated=${result.profilesUpdated} members_updated=${result.membersUpdated} avatars_synced=${result.avatarsSynced} skipped=${result.skipped} errors=${result.errors.length} duration=${durationMs}ms`
  )

  return { ...result, hierarchyGovernance, durationMs }
}

export const runEntraWebhookRenew = async (): Promise<Record<string, unknown>> => {
  const startMs = Date.now()
  const result = await createOrRenewSubscription()
  const durationMs = Date.now() - startMs

  console.log(
    `[entra-webhook-renew] ${result.action} subscription=${result.subscription.id} expires=${result.subscription.expirationDateTime} duration=${durationMs}ms`
  )

  return {
    action: result.action,
    subscriptionId: result.subscription.id,
    expirationDateTime: result.subscription.expirationDateTime,
    durationMs
  }
}

// ─── HubSpot ─────────────────────────────────────────────────────────────────

const checkHubspotReadiness = async (
  cronName: string
): Promise<{ ready: true } | { ready: false; reason: string }> => {
  try {
    const readiness = await checkIntegrationReadiness('hubspot')

    if (!readiness.ready) {
      console.log(`[${cronName}] Skipped: HubSpot upstream not ready — ${readiness.reason}`)

      return { ready: false, reason: readiness.reason ?? 'upstream_not_ready' }
    }

    return { ready: true }
  } catch (error) {
    console.warn(`[${cronName}] Readiness check failed, proceeding anyway:`, error)

    return { ready: true }
  }
}

export const runHubspotQuotesSync = async (): Promise<Record<string, unknown>> => {
  const readiness = await checkHubspotReadiness('hubspot-quotes-sync')

  if (!readiness.ready) {
    return { skipped: true, reason: readiness.reason }
  }

  const startMs = Date.now()
  const { organizations, results } = await syncAllHubSpotQuotes()

  const totalCreated = results.reduce((s, r) => s + r.created, 0)
  const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0)

  console.log(
    `[hubspot-quotes-sync] ${organizations} orgs, ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors, ${Date.now() - startMs}ms`
  )

  return {
    organizations,
    totalCreated,
    totalUpdated,
    totalErrors,
    durationMs: Date.now() - startMs,
    details: results.filter(r => r.created > 0 || r.updated > 0 || r.errors.length > 0)
  }
}

export const runHubspotCompanyLifecycleSync = async (): Promise<Record<string, unknown>> => {
  const readiness = await checkHubspotReadiness('hubspot-company-lifecycle-sync')

  if (!readiness.ready) {
    return { skipped: true, reason: readiness.reason }
  }

  const startMs = Date.now()
  const result = await syncHubSpotCompanyLifecycles()

  console.log(
    `[hubspot-company-lifecycle-sync] ${result.processed} companies, ${result.updated} updates, ${result.changed} changes, ${result.errors.length} errors, ${Date.now() - startMs}ms`
  )

  return { ...result, durationMs: Date.now() - startMs }
}

export const runHubspotCompaniesSync = async (
  options?: { dryRun?: boolean; fullResync?: boolean }
): Promise<Record<string, unknown>> => {
  const readiness = await checkHubspotReadiness('hubspot-companies-sync')

  if (!readiness.ready) {
    return { skipped: true, reason: readiness.reason }
  }

  const startMs = Date.now()

  const summary = await syncHubSpotCompanies({
    dryRun: options?.dryRun ?? false,
    fullResync: options?.fullResync ?? false
  })

  return { ...summary, durationMs: Date.now() - startMs }
}

export const runHubspotDealsSync = async (
  options?: { includeClosed?: boolean }
): Promise<Record<string, unknown>> => {
  const includeClosed = options?.includeClosed ?? true
  const startMs = Date.now()
  const summary = await syncHubSpotDeals({ includeClosed })

  console.log(
    `[hubspot-deals-sync] source=${summary.totalSourceDeals} created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} errors=${summary.errors.length} durationMs=${Date.now() - startMs}`
  )

  return {
    ...summary,
    durationMs: Date.now() - startMs,
    details: summary.results.filter(result => result.action !== 'skipped' || result.error)
  }
}

export const runHubspotProductsSync = async (): Promise<Record<string, unknown>> => {
  const readiness = await checkHubspotReadiness('hubspot-products-sync')

  if (!readiness.ready) {
    return { skipped: true, reason: readiness.reason }
  }

  const startMs = Date.now()
  const result = await syncHubSpotProductCatalog()

  console.log(
    `[hubspot-products-sync] ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors, ${Date.now() - startMs}ms`
  )

  return { ...result, durationMs: Date.now() - startMs }
}

// ─── Notion conformed recovery ──────────────────────────────────────────────

export const runNotionConformedRecovery = async (): Promise<Record<string, unknown>> => {
  try {
    const dueRetries = await listDueNotionSyncRecoveryRuns()

    if (dueRetries.length === 0) {
      return {
        processed: 0,
        message: 'No due Notion conformed retries',
        dueRetries: []
      }
    }

    const result = await runNotionSyncOrchestration({
      executionSource: 'scheduled_retry'
    })

    if (result.dataQualityMonitor?.executed === false) {
      await alertCronFailure(
        'notion-delivery-data-quality-post-sync-retry',
        result.dataQualityMonitor.error ?? 'Unknown post-sync retry data quality error',
        { syncRunId: result.syncRunId ?? 'unknown' }
      ).catch(() => {})
    }

    return { ...result, dueRetries }
  } catch (error) {
    await alertCronFailure('sync-conformed-recovery', error)
    throw error
  }
}

// ─── Reconciliation auto-match ──────────────────────────────────────────────

const RECONCILIATION_RECENT_WINDOW_DAYS = 7

export const runReconciliationAutoMatch = async (): Promise<Record<string, unknown>> => {
  const today = new Date()
  const toDate = today.toISOString().slice(0, 10)

  const fromDate = new Date(today.getTime() - RECONCILIATION_RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  try {
    const unmatched = await listUnmatchedStatementRowsByDateRangeFromPostgres({ fromDate, toDate })

    if (unmatched.length === 0) {
      return { matched: 0, suggested: 0, total: 0, window: { fromDate, toDate } }
    }

    const rowsByAccount = new Map<string, typeof unmatched>()

    for (const row of unmatched) {
      const list = rowsByAccount.get(row.account_id) ?? []

      list.push(row)
      rowsByAccount.set(row.account_id, list)
    }

    let totalApplied = 0
    let totalSuggested = 0
    let totalRows = 0

    for (const [accountId, accountRows] of rowsByAccount) {
      const { items: candidates } = await listReconciliationCandidatesByDateRangeFromPostgres({
        accountId,
        startDate: fromDate,
        endDate: toDate,
        type: 'all',
        limit: 400
      })

      const rows: AutoMatchRow[] = accountRows.map(row => ({
        rowId: row.row_id,
        transactionDate: row.transaction_date,
        description: row.description,
        reference: row.reference,
        amount: row.amount
      }))

      totalRows += rows.length

      const rowPeriodMap = new Map<string, string>(accountRows.map(row => [row.row_id, row.period_id]))
      const scoring = scoreAutoMatches({ unmatchedRows: rows, candidates })

      const { applied, suggested } = await persistAutoMatchDecisions({
        decisions: scoring.decisions,
        rowPeriodMap,
        actorUserId: null,
        callbacks: {
          updateStatementRow: async input => {
            await updateStatementRowMatchInPostgres(input.rowId, input.periodId, {
              matchStatus: input.matchStatus,
              matchedType: input.matchedType,
              matchedId: input.matchedId,
              matchedPaymentId: input.matchedPaymentId,
              matchedSettlementLegId: input.matchedSettlementLegId,
              matchConfidence: input.matchConfidence,
              matchedByUserId: input.matchedByUserId
            })
          },
          setReconciliationLink: async input => {
            await setReconciliationLinkInPostgres({
              matchedType: input.matchedType,
              matchedId: input.matchedId,
              matchedPaymentId: input.matchedPaymentId,
              matchedSettlementLegId: input.matchedSettlementLegId,
              rowId: input.rowId,
              matchedBy: input.matchedBy
            })
          }
        }
      })

      totalApplied += applied
      totalSuggested += suggested
    }

    console.log(
      `[reconciliation-auto-match] ${fromDate}..${toDate}: accounts=${rowsByAccount.size} applied=${totalApplied} suggested=${totalSuggested} total=${totalRows}`
    )

    return {
      matched: totalApplied,
      suggested: totalSuggested,
      unmatched: totalRows - totalApplied - totalSuggested,
      total: totalRows,
      accounts: Array.from(rowsByAccount.keys()),
      window: { fromDate, toDate }
    }
  } catch (error) {
    await alertCronFailure('reconciliation-auto-match', error)
    throw error
  }
}
