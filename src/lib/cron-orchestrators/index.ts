import 'server-only'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { fetchEntraUsersWithManagers } from '@/lib/entra/graph-client'
import { syncEntraProfiles } from '@/lib/entra/profile-sync'
import { createOrRenewSubscription } from '@/lib/entra/webhook-subscription'
import { processFailedEmailDeliveries } from '@/lib/email/delivery'
import { buildMetricTrustMapFromRow, serializeMetricTrustMap } from '@/lib/ico-engine/metric-trust-policy'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
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

// ─── HubSpot p_services (0-162) safety-net pull (TASK-813 Slice 5) ──────────
//
// Cron diario que llama a syncAllOrganizationServices como safety net cuando
// el webhook hubspot-services pierde events (HubSpot retries exhausted, handler
// bug). Categoría `prod_only` per TASK-775 — no async-critical porque webhook
// es path canónico real-time. Schedule: 0 6 * * * America/Santiago.
export const runHubspotServicesSync = async (): Promise<Record<string, unknown>> => {
  const readiness = await checkHubspotReadiness('hubspot-services-sync')

  if (!readiness.ready) {
    return { skipped: true, reason: readiness.reason }
  }

  const startMs = Date.now()
  const { syncAllOrganizationServices } = await import('@/lib/services/service-sync')

  const result = await syncAllOrganizationServices({
    createMissingSpace: false,
    createdBySource: 'ops-worker:hubspot-services-sync'
  })

  const totals = result.results.reduce(
    (acc, r) => {
      acc.created += r.created
      acc.updated += r.updated
      acc.skipped += r.skipped
      acc.errors += r.errors.length

      return acc
    },
    { created: 0, updated: 0, skipped: 0, errors: 0 }
  )

  console.log(
    `[hubspot-services-sync] ${result.organizations} clients, ${totals.created} created, ${totals.updated} updated, ${totals.skipped} skipped, ${totals.errors} errors, ${Date.now() - startMs}ms`
  )

  return {
    organizations: result.organizations,
    ...totals,
    durationMs: Date.now() - startMs
  }
}

// ─── ICO member sync (BQ ico_engine.metrics_by_member → PG greenhouse_serving) ─

interface IcoMemberMetricsRow {
  member_id: string
  period_year: number
  period_month: number
  rpa_avg: number | null
  rpa_median: number | null
  otd_pct: number | null
  ftr_pct: number | null
  cycle_time_avg_days: number | null
  cycle_time_variance?: number | null
  throughput_count: number | null
  pipeline_velocity: number | null
  stuck_asset_count: number | null
  stuck_asset_pct: number | null
  total_tasks: number | null
  completed_tasks: number | null
  active_tasks: number | null
  on_time_count: number | null
  late_drop_count: number | null
  overdue_count: number | null
  carry_over_count: number | null
  overdue_carried_forward_count: number | null
  rpa_eligible_task_count?: number | null
  rpa_missing_task_count?: number | null
  rpa_non_positive_task_count?: number | null
}

const toIcoNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : null
  }

  if (typeof v === 'object' && v !== null && 'value' in v) return toIcoNum((v as { value: unknown }).value)

  return null
}

export const runIcoMemberSync = async (): Promise<Record<string, unknown>> => {
  try {
    const readiness = await checkIntegrationReadiness('notion')

    if (!readiness.ready) {
      console.log(`[ico-member-sync] Skipped: Notion upstream not ready — ${readiness.reason}`)

      return { skipped: true, reason: readiness.reason ?? 'upstream_not_ready' }
    }
  } catch (error) {
    console.warn('[ico-member-sync] Readiness check failed, proceeding anyway:', error)
  }

  const startMs = Date.now()
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const now = new Date()
  const periods: Array<{ year: number; month: number }> = []

  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)

    periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  let totalUpserted = 0

  for (const { year, month } of periods) {
    const [rows] = await bigQuery.query({
      query: `SELECT *
              FROM \`${projectId}.ico_engine.metrics_by_member\`
              WHERE period_year = @year AND period_month = @month`,
      params: { year, month }
    })

    for (const raw of rows as IcoMemberMetricsRow[]) {
      const metricTrustJson = serializeMetricTrustMap(
        buildMetricTrustMapFromRow(raw as unknown as Parameters<typeof buildMetricTrustMapFromRow>[0])
      )

      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_serving.ico_member_metrics (
          member_id, period_year, period_month,
          rpa_avg, rpa_median, otd_pct, ftr_pct,
          cycle_time_avg_days, throughput_count, pipeline_velocity,
          stuck_asset_count, stuck_asset_pct,
          total_tasks, completed_tasks, active_tasks,
          on_time_count, late_drop_count, overdue_count, carry_over_count, overdue_carried_forward_count,
          metric_trust_json,
          materialized_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, NOW())
        ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
          rpa_avg = EXCLUDED.rpa_avg,
          rpa_median = EXCLUDED.rpa_median,
          otd_pct = EXCLUDED.otd_pct,
          ftr_pct = EXCLUDED.ftr_pct,
          cycle_time_avg_days = EXCLUDED.cycle_time_avg_days,
          throughput_count = EXCLUDED.throughput_count,
          pipeline_velocity = EXCLUDED.pipeline_velocity,
          stuck_asset_count = EXCLUDED.stuck_asset_count,
          stuck_asset_pct = EXCLUDED.stuck_asset_pct,
          total_tasks = EXCLUDED.total_tasks,
          completed_tasks = EXCLUDED.completed_tasks,
          active_tasks = EXCLUDED.active_tasks,
          on_time_count = EXCLUDED.on_time_count,
          late_drop_count = EXCLUDED.late_drop_count,
          overdue_count = EXCLUDED.overdue_count,
          carry_over_count = EXCLUDED.carry_over_count,
          overdue_carried_forward_count = EXCLUDED.overdue_carried_forward_count,
          metric_trust_json = EXCLUDED.metric_trust_json,
          materialized_at = NOW()`,
        [
          raw.member_id, raw.period_year, raw.period_month,
          toIcoNum(raw.rpa_avg), toIcoNum(raw.rpa_median), toIcoNum(raw.otd_pct), toIcoNum(raw.ftr_pct),
          toIcoNum(raw.cycle_time_avg_days), toIcoNum(raw.throughput_count), toIcoNum(raw.pipeline_velocity),
          toIcoNum(raw.stuck_asset_count), toIcoNum(raw.stuck_asset_pct),
          toIcoNum(raw.total_tasks), toIcoNum(raw.completed_tasks), toIcoNum(raw.active_tasks),
          toIcoNum(raw.on_time_count), toIcoNum(raw.late_drop_count), toIcoNum(raw.overdue_count),
          toIcoNum(raw.carry_over_count), toIcoNum(raw.overdue_carried_forward_count),
          metricTrustJson
        ]
      )
      totalUpserted++
    }
  }

  const durationMs = Date.now() - startMs

  console.log(`[ico-member-sync] ${totalUpserted} rows upserted across ${periods.length} periods in ${durationMs}ms`)

  return {
    upserted: totalUpserted,
    periods: periods.map(p => `${p.year}-${String(p.month).padStart(2, '0')}`),
    durationMs
  }
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
