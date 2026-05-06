/**
 * Ops Worker — Cloud Run Service
 *
 * Standalone HTTP server that runs reactive projection consumers and
 * projection-recovery outside Vercel's serverless timeout.
 * Reuses all existing src/lib/ modules from the monorepo.
 *
 * Endpoints:
 *   GET  /health                    → 200 health check
 *   POST /reactive/process          → Process all reactive events (replaces outbox-react cron)
 *   POST /reactive/process-domain   → Process domain-scoped reactive events (replaces outbox-react-delivery cron)
 *   POST /reactive/recover          → Recover orphaned projection queue items (replaces projection-recovery cron)
 *   GET  /reactive/queue-depth      → Queue depth + oldest-event lag, optionally filtered by ?domain=<x>
 *   POST /cost-attribution/materialize → Materialize commercial cost attribution + client economics
 *   POST /vat-ledger/materialize       → Materialize Chile VAT ledger + monthly position
 *   POST /party-lifecycle/sweep        → Daily sweep: active_client → inactive on stale parties (TASK-542)
 *   POST /quotation-lifecycle/sweep    → Daily sweep: expire overdue quotes + emit renewal_due events (TASK-351)
 *   POST /batch-email-send             → Send a transactional email via the Greenhouse delivery pipeline
 *   POST /nexa/weekly-digest           → Send the weekly Nexa executive digest via email
 *   POST /reliability-ai-watch         → Reliability AI Observer (TASK-638): Gemini watcher over RCP overview
 *   POST /cloud-cost-ai-watch          → Cloud cost FinOps AI + deterministic alert sweep (TASK-769)
 *   POST /notion-conformed/sync        → Notion BQ raw → conformed → PG cycle (replaces Vercel /api/cron/sync-conformed)
 *   POST /outbox/publish-batch         → Outbox PG → BQ raw publisher with state machine (TASK-773, replaces Vercel /api/cron/outbox-publish)
 *   POST /email-deliverability-monitor → Bounce/complaint rate monitor (TASK-775, replaces Vercel /api/cron/email-deliverability-monitor)
 *   POST /nubox/balance-sync           → Nubox balances → PG + divergence outbox (TASK-775, replaces Vercel /api/cron/nubox-balance-sync)
 *   POST /nubox/sync                   → 3-fase raw→conformed→postgres (TASK-775, replaces Vercel /api/cron/nubox-sync)
 *   POST /nubox/quotes-hot-sync        → Quotes hot path period-scoped (TASK-775, replaces Vercel /api/cron/nubox-quotes-hot-sync)
 *   POST /webhook-dispatch             → Outbound webhooks dispatcher (TASK-775, replaces Vercel /api/cron/webhook-dispatch)
 *   POST /email-delivery-retry         → Failed email retry (TASK-775, replaces Vercel /api/cron/email-delivery-retry)
 *   POST /entra/profile-sync           → Entra users + manager sync (TASK-775, replaces Vercel /api/cron/entra-profile-sync)
 *   POST /entra/webhook-renew          → Entra webhook subscription renew (TASK-775, replaces Vercel /api/cron/entra-webhook-renew)
 *   POST /hubspot/quotes-sync          → HubSpot quotes sync (TASK-775, replaces Vercel /api/cron/hubspot-quotes-sync)
 *   POST /hubspot/company-lifecycle-sync → HubSpot lifecycle sync (TASK-775)
 *   POST /hubspot/companies-sync       → HubSpot companies sync (TASK-775)
 *   POST /hubspot/deals-sync           → HubSpot deals sync (TASK-775)
 *   POST /hubspot/products-sync        → HubSpot products sync (TASK-775)
 *   POST /notion-conformed/recovery    → Notion conformed retry due runs (TASK-775, replaces Vercel /api/cron/sync-conformed-recovery)
 *   POST /reconciliation/auto-match    → Continuous bank statement auto-match (TASK-775, replaces Vercel /api/cron/reconciliation-auto-match)
 *   POST /ico/member-sync              → ICO member metrics BQ → PG (TASK-775, replaces Vercel /api/cron/ico-member-sync)
 *
 * Auth: Cloud Run IAM (--no-allow-unauthenticated) + optional CRON_SECRET header
 * Runtime: Node.js 22 via esbuild bundle (handles TypeScript + @/ path aliases)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { processReactiveEvents, ensureReactiveSchema, sweepAuditOnlyEvents } from '@/lib/sync/reactive-consumer'
import { publishPendingOutboxEvents, OUTBOX_MAX_PUBLISH_ATTEMPTS } from '@/lib/sync/outbox-consumer'
import { claimOrphanedRefreshItems, markRefreshCompleted, markRefreshFailed } from '@/lib/sync/refresh-queue'
import { classifyReactiveError } from '@/lib/sync/reactive-error-classification'
import { getRegisteredProjections } from '@/lib/sync/projection-registry'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'
import {
  generateReactiveRunId,
  writeReactiveRunStart,
  writeReactiveRunComplete,
  writeReactiveRunFailure
} from '@/lib/sync/reactive-run-tracker'
import {
  materializeCommercialCostAttributionForPeriod,
  materializeAllAvailablePeriods
} from '@/lib/commercial-cost-attribution/member-period-attribution'
import { runPartyLifecycleInactivitySweep } from '@/lib/commercial/party'
import { runNotionSyncOrchestration } from '@/lib/integrations/notion-sync-orchestration'
import { syncBqConformedToPostgres } from '@/lib/sync/sync-bq-conformed-to-postgres'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { materializeAllAvailableVatPeriods, materializeVatLedgerForPeriod } from '@/lib/finance/vat-ledger'
import { rematerializeAccountBalanceRange } from '@/lib/finance/account-balances-rematerialize'
import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'
import { captureMessageWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { runQuotationLifecycleSweep } from '@/lib/commercial-intelligence/renewal-lifecycle'
import { sendEmail } from '@/lib/email/delivery'
import { runEmailDeliverabilityMonitor } from '@/lib/email/deliverability-monitor'
import { runNuboxBalanceSync } from '@/lib/nubox/sync-nubox-balances'
import {
  runNuboxQuotesHotSync,
  runNuboxSyncOrchestration
} from '@/lib/nubox/sync-nubox-orchestrator'
import {
  runEmailDeliveryRetry,
  runEntraProfileSync,
  runEntraWebhookRenew,
  runHubspotCompaniesSync,
  runHubspotCompanyLifecycleSync,
  runHubspotDealsSync,
  runHubspotProductsSync,
  runHubspotQuotesSync,
  runHubspotServicesSync,
  runIcoMemberSync,
  runNotionConformedRecovery,
  runReconciliationAutoMatch,
  runWebhookDispatch
} from '@/lib/cron-orchestrators'
import { buildWeeklyDigest, resolveWeeklyDigestRecipients, WEEKLY_DIGEST_DEFAULT_LIMIT } from '@/lib/nexa/digest'

import { getCurrentAuthReadiness } from '@/lib/auth-secrets'
import { probeNextAuthSecretRoundTrip } from '@/lib/auth/readiness'

import { getReactiveQueueDepth, InvalidDomainError } from './reactive-queue-depth'
import { runProductCatalogDriftDetectJob } from './product-catalog-drift-detect'
import { runProductCatalogReconcileV2Job } from './product-catalog-reconcile-v2'
import { wrapCronHandler } from './cron-handler-wrapper'

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 8080
const CRON_SECRET = process.env.CRON_SECRET?.trim() || ''

// ─── Auth ───────────────────────────────────────────────────────────────────

import { checkAuthorization } from './auth'

const isAuthorized = (req: IncomingMessage): boolean =>
  checkAuthorization(req.headers.authorization, CRON_SECRET)

// ─── Helpers ────────────────────────────────────────────────────────────────

const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise(resolve => {
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim()

        resolve(text ? (JSON.parse(text) as Record<string, unknown>) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })

const json = (res: ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const now = () => new Date().toISOString()

// ─── Route Handlers ─────────────────────────────────────────────────────────

const handleHealth = (_req: IncomingMessage, res: ServerResponse) => {
  json(res, 200, { status: 'ok', service: 'ops-worker', timestamp: now() })
}

/**
 * POST /reactive/process
 * Replaces: /api/cron/outbox-react
 * Processes all reactive events in the outbox (all domains).
 */
const handleReactiveProcess = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const batchSize = Number(body.batchSize) || 50
  const runId = generateReactiveRunId()

  console.log(`[ops-worker] POST /reactive/process — runId=${runId} batchSize=${batchSize}`)

  await writeReactiveRunStart({
    runId,
    triggeredBy: 'ops_worker',
    sourceObjectType: 'reactive_events',
    notes: `all domains, batchSize=${batchSize}`
  })

  try {
    await ensureReactiveSchema()
    ensureProjectionsRegistered()

    const result = await processReactiveEvents({ batchSize })

    await writeReactiveRunComplete({ runId, result })

    console.log(
      `[ops-worker] /reactive/process done — ${result.eventsProcessed} processed, ${result.eventsFailed} failed, ${result.projectionsTriggered} projections, ${result.durationMs}ms`
    )

    json(res, 200, {
      ...result,
      runId
    })
  } catch (error) {
    await writeReactiveRunFailure({ runId, error })

    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error(`[ops-worker] /reactive/process failed:`, message)
    json(res, 502, { runId, error: message })
  }
}

/**
 * POST /reactive/process-domain
 * Replaces: /api/cron/outbox-react-delivery
 * Processes reactive events for a specific domain (defaults to 'delivery').
 */
const handleReactiveProcessDomain = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  const domain = (typeof body.domain === 'string' ? body.domain : 'delivery') as
    | 'delivery'
    | 'organization'
    | 'people'
    | 'finance'
    | 'notifications'
    | 'cost_intelligence'

  const batchSize = Number(body.batchSize) || 50
  const runId = generateReactiveRunId()

  console.log(`[ops-worker] POST /reactive/process-domain — runId=${runId} domain=${domain} batchSize=${batchSize}`)

  await writeReactiveRunStart({
    runId,
    triggeredBy: 'ops_worker',
    sourceObjectType: `reactive_events_${domain}`,
    notes: `domain=${domain}, batchSize=${batchSize}`
  })

  try {
    await ensureReactiveSchema()
    ensureProjectionsRegistered()

    const result = await processReactiveEvents({ domain, batchSize })

    await writeReactiveRunComplete({ runId, result })

    console.log(
      `[ops-worker] /reactive/process-domain[${domain}] done — ${result.eventsProcessed} processed, ${result.eventsFailed} failed, ${result.projectionsTriggered} projections, ${result.durationMs}ms`
    )

    json(res, 200, {
      ...result,
      runId,
      domain
    })
  } catch (error) {
    await writeReactiveRunFailure({ runId, error })

    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error(`[ops-worker] /reactive/process-domain[${domain}] failed:`, message)
    json(res, 502, { runId, domain, error: message })
  }
}

/**
 * POST /reactive/recover
 * Replaces: /api/cron/projection-recovery
 * Recovers orphaned items in projection_refresh_queue.
 */
const handleReactiveRecover = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const batchSize = Number(body.batchSize) || 10
  const staleMinutes = Number(body.staleMinutes) || 30
  const runId = generateReactiveRunId()

  console.log(
    `[ops-worker] POST /reactive/recover — runId=${runId} batchSize=${batchSize} staleMinutes=${staleMinutes}`
  )

  await writeReactiveRunStart({
    runId,
    triggeredBy: 'ops_worker',
    sourceObjectType: 'projection_recovery',
    notes: `recovery, batchSize=${batchSize}, staleMinutes=${staleMinutes}`
  })

  try {
    ensureProjectionsRegistered()

    const recoverStartMs = Date.now()

    // Audit-only sweep first: bulk-mark events whose type has zero
    // registered projection handlers as no-op:audit-only so they stop
    // accumulating in the raw outbox table. Always runs regardless of
    // whether there are orphaned queue items.
    let auditSweptCount = 0

    try {
      const sweep = await sweepAuditOnlyEvents({ batchSize: 1000 })

      auditSweptCount = sweep.eventsSwept

      if (auditSweptCount > 0) {
        console.log(
          `[ops-worker] /reactive/recover audit-only sweep — runId=${sweep.runId} swept=${auditSweptCount} ${sweep.durationMs}ms`
        )
      }
    } catch (sweepError) {
      console.error(
        '[ops-worker] /reactive/recover audit-only sweep failed (non-fatal):',
        sweepError instanceof Error ? sweepError.message : sweepError
      )
    }

    const orphans = await claimOrphanedRefreshItems(batchSize, staleMinutes)

    if (orphans.length === 0) {
      await writeReactiveRunComplete({
        runId,
        result: { eventsProcessed: auditSweptCount, eventsFailed: 0, projectionsTriggered: 0, durationMs: Date.now() - recoverStartMs }
      })

      json(res, 200, {
        runId,
        recovered: 0,
        failed: 0,
        auditOnlySwept: auditSweptCount,
        message:
          auditSweptCount > 0
            ? `No orphaned projections — swept ${auditSweptCount} audit-only events`
            : 'No orphaned projections found'
      })

      return
    }

    const projections = getRegisteredProjections()
    let recovered = 0
    let failed = 0
    const details: Array<{ queueId: string; projectionName: string; status: string }> = []

    for (const orphan of orphans) {
      const projection = projections.find(p => p.name === orphan.projectionName)

      if (!projection) {
        const classified = classifyReactiveError(`Projection "${orphan.projectionName}" not found in registry`)

        await markRefreshFailed(orphan.queueId, classified.formattedMessage, 0, {
          errorClass: classified.category,
          errorFamily: classified.family,
          isInfrastructureFault: classified.isInfrastructure
        })
        failed++
        details.push({ queueId: orphan.queueId, projectionName: orphan.projectionName, status: 'unknown_projection' })
        continue
      }

      try {
        const scope = { entityType: orphan.entityType, entityId: orphan.entityId }

        await projection.refresh(scope, {})
        await markRefreshCompleted(orphan.queueId)
        recovered++
        details.push({ queueId: orphan.queueId, projectionName: orphan.projectionName, status: 'recovered' })
      } catch (error) {
        const classified = classifyReactiveError(error)

        await markRefreshFailed(orphan.queueId, classified.formattedMessage, projection.maxRetries ?? 2, {
          errorClass: classified.category,
          errorFamily: classified.family,
          isInfrastructureFault: classified.isInfrastructure
        })
        failed++
        details.push({ queueId: orphan.queueId, projectionName: orphan.projectionName, status: 'failed' })
      }
    }

    const recoverDurationMs = Date.now() - recoverStartMs

    await writeReactiveRunComplete({
      runId,
      result: {
        eventsProcessed: recovered + auditSweptCount,
        eventsFailed: failed,
        projectionsTriggered: orphans.length,
        durationMs: recoverDurationMs
      },
      status: failed > 0 && recovered > 0 ? 'partial' : failed > 0 ? 'failed' : 'succeeded'
    })

    console.log(
      `[ops-worker] /reactive/recover done — ${recovered} recovered, ${failed} failed out of ${orphans.length} orphans, ${auditSweptCount} audit-only swept`
    )

    json(res, 200, { runId, recovered, failed, total: orphans.length, auditOnlySwept: auditSweptCount, details })
  } catch (error) {
    await writeReactiveRunFailure({ runId, error })

    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error(`[ops-worker] /reactive/recover failed:`, message)
    json(res, 502, { runId, error: message })
  }
}

/**
 * POST /cost-attribution/materialize
 * Materializes commercial cost attribution for one period or all periods.
 * Runs the heavy VIEW queries that timeout on Vercel serverless.
 * Optionally recomputes client_economics snapshots after materialization.
 *
 * Body:
 *   { year?: number, month?: number, recomputeEconomics?: boolean }
 *   - If year+month provided: single period
 *   - If omitted: all periods with data
 *   - recomputeEconomics defaults to true
 */
const handleCostAttributionMaterialize = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const year = typeof body.year === 'number' ? body.year : undefined
  const month = typeof body.month === 'number' ? body.month : undefined
  const recomputeEconomics = body.recomputeEconomics !== false

  const startMs = Date.now()

  console.log(`[ops-worker] POST /cost-attribution/materialize — year=${year ?? 'all'} month=${month ?? 'all'} recompute=${recomputeEconomics}`)

  try {
    let result: { periods: number; totalAllocations: number; economicsRecomputed: number }

    if (year && month) {
      const { replaced } = await materializeCommercialCostAttributionForPeriod(
        year, month, 'ops-worker-trigger'
      )

      let economicsRecomputed = 0

      if (recomputeEconomics && replaced > 0) {
        const snapshots = await computeClientEconomicsSnapshots(year, month, 'ops-worker-cost-attribution-refresh')

        economicsRecomputed = snapshots.length
      }

      result = { periods: 1, totalAllocations: replaced, economicsRecomputed }
    } else {
      const { periods, totalAllocations } = await materializeAllAvailablePeriods('ops-worker-trigger-all')

      let economicsRecomputed = 0

      if (recomputeEconomics && totalAllocations > 0) {
        const currYear = new Date().getFullYear()
        const currMonth = new Date().getMonth() + 1
        const prevDate = new Date(currYear, currMonth - 2, 1)

        const [curr, prev] = await Promise.all([
          computeClientEconomicsSnapshots(currYear, currMonth, 'ops-worker-cost-attribution-refresh'),
          computeClientEconomicsSnapshots(prevDate.getFullYear(), prevDate.getMonth() + 1, 'ops-worker-cost-attribution-refresh-prev')
        ])

        economicsRecomputed = curr.length + prev.length
      }

      result = { periods, totalAllocations, economicsRecomputed }
    }

    const durationMs = Date.now() - startMs

    console.log(
      `[ops-worker] /cost-attribution/materialize done — ${result.periods} periods, ${result.totalAllocations} allocations, ${result.economicsRecomputed} economics refreshed, ${durationMs}ms`
    )

    json(res, 200, { ...result, durationMs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /cost-attribution/materialize failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /vat-ledger/materialize
 * Materializes Chile VAT ledger entries + monthly VAT position.
 *
 * Body:
 *   { year?: number, month?: number }
 *   - If year+month provided: single period
 *   - If omitted: all periods with source fiscal data
 */
const handleVatLedgerMaterialize = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const year = typeof body.year === 'number' ? body.year : undefined
  const month = typeof body.month === 'number' ? body.month : undefined
  const startMs = Date.now()

  console.log(`[ops-worker] POST /vat-ledger/materialize — year=${year ?? 'all'} month=${month ?? 'all'}`)

  try {
    if (year && month) {
      const summary = await materializeVatLedgerForPeriod(year, month, 'ops-worker-trigger')

      json(res, 200, {
        periods: 1,
        summaries: [summary],
        durationMs: Date.now() - startMs
      })

      return
    }

    const result = await materializeAllAvailableVatPeriods('ops-worker-trigger-all')

    json(res, 200, {
      ...result,
      durationMs: Date.now() - startMs
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /vat-ledger/materialize failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /party-lifecycle/sweep
 * TASK-542: daily inactivity sweep for commercial parties.
 */
const handlePartyLifecycleSweep = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const dryRun = body.dryRun !== false
  const limit = typeof body.limit === 'number' ? body.limit : undefined
  const inactivityMonths = typeof body.inactivityMonths === 'number' ? body.inactivityMonths : undefined
  const startMs = Date.now()

  console.log(
    `[ops-worker] POST /party-lifecycle/sweep — dryRun=${dryRun} limit=${limit ?? 'default'} inactivityMonths=${inactivityMonths ?? 6}`
  )

  try {
    const result = await runPartyLifecycleInactivitySweep({
      dryRun,
      limit,
      inactivityMonths
    })

    json(res, 200, {
      ...result,
      durationMs: Date.now() - startMs
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /party-lifecycle/sweep failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /product-catalog/drift-detect
 * TASK-548: nightly product catalog drift detect against HubSpot Products.
 */
const handleProductCatalogDriftDetect = async (_req: IncomingMessage, res: ServerResponse) => {
  console.log('[ops-worker] POST /product-catalog/drift-detect')

  try {
    const result = await runProductCatalogDriftDetectJob()

    console.log(
      `[ops-worker] /product-catalog/drift-detect done — status=${result.status} conflicts=${result.conflictsDetected} autoHealed=${result.autoHealed} ${result.durationMs}ms`
    )

    json(res, 200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /product-catalog/drift-detect failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /product-catalog/reconcile-v2
 * TASK-605 Slice 6: weekly reconcile against HubSpot catalog with v2
 * drift classifier (pending_overwrite / manual_drift / error) + Slack
 * alert when (manual_drift + error) > threshold. Scheduled via Cloud
 * Scheduler (weekly Monday 06:00 America/Santiago).
 */
const handleProductCatalogReconcileV2 = async (_req: IncomingMessage, res: ServerResponse) => {
  console.log('[ops-worker] POST /product-catalog/reconcile-v2')

  try {
    const summary = await runProductCatalogReconcileV2Job()

    console.log(
      `[ops-worker] /product-catalog/reconcile-v2 done — matched=${summary.matched} withDrift=${summary.productsWithDrift} pending=${summary.pendingOverwriteTotal} manual=${summary.manualDriftTotal} error=${summary.errorTotal} alert=${summary.alertFired} ${summary.durationMs}ms`
    )

    json(res, 200, summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /product-catalog/reconcile-v2 failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /quotation-lifecycle/sweep
 * TASK-351: Daily quotation lifecycle sweep.
 * - Flips quotations past `expiry_date` to `status='expired'` + emits `commercial.quotation.expired`.
 * - Emits `commercial.quotation.renewal_due` for open quotes inside the lookahead window,
 *   deduplicated by the `quotation_renewal_reminders` cadence table.
 */
const handleQuotationLifecycleSweep = async (_req: IncomingMessage, res: ServerResponse) => {
  const startMs = Date.now()

  console.log('[ops-worker] POST /quotation-lifecycle/sweep')

  try {
    const result = await runQuotationLifecycleSweep()
    const durationMs = Date.now() - startMs

    console.log(
      `[ops-worker] /quotation-lifecycle/sweep done — expired=${result.expiredCount} renewalDue=${result.renewalDueCount} processed=${result.quotationsProcessed} ${durationMs}ms`
    )

    json(res, 200, { ...result, durationMs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /quotation-lifecycle/sweep failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * GET /reactive/queue-depth
 * Returns the number of outbox events still pending reactive processing for a
 * domain (or across all domains if `domain` is omitted), plus the oldest event
 * age and a top-10 breakdown by event_type. Used by ops dashboards and Cloud
 * Monitoring alerting policies.
 */
const handleReactiveQueueDepth = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const domainParam = url.searchParams.get('domain')

  try {
    ensureProjectionsRegistered()

    const result = await getReactiveQueueDepth(domainParam ?? undefined)

    json(res, 200, result)
  } catch (error) {
    if (error instanceof InvalidDomainError) {
      json(res, 400, { error: error.message, validDomains: error.validDomains })

      return
    }

    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /reactive/queue-depth failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /batch-email-send
 * Sends a transactional email via the Greenhouse email delivery pipeline.
 * Accepts the same shape as SendEmailInput (see src/lib/email/types.ts).
 *
 * Body:
 *   {
 *     emailType: EmailType,
 *     domain: EmailDomain,
 *     recipients: EmailRecipient[],
 *     context: Record<string, unknown>,
 *     attachments?: EmailAttachment[],
 *     sourceEventId?: string,
 *     sourceEntity?: string,
 *     actorEmail?: string,
 *     priority?: string   // informational only — not part of SendEmailInput
 *   }
 */
const handleBatchEmailSend = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  const {
    emailType,
    domain,
    recipients,
    context,
    attachments,
    sourceEventId,
    sourceEntity,
    actorEmail
  } = body

  console.log(`[ops-worker] POST /batch-email-send — emailType=${String(emailType)} domain=${String(domain)} recipients=${Array.isArray(recipients) ? recipients.length : 0}`)

  try {
    const result = await sendEmail({
      emailType: emailType as Parameters<typeof sendEmail>[0]['emailType'],
      domain: domain as Parameters<typeof sendEmail>[0]['domain'],
      recipients: recipients as Parameters<typeof sendEmail>[0]['recipients'],
      context: (context ?? {}) as Record<string, unknown>,
      attachments: attachments as Parameters<typeof sendEmail>[0]['attachments'],
      sourceEventId: typeof sourceEventId === 'string' ? sourceEventId : undefined,
      sourceEntity: typeof sourceEntity === 'string' ? sourceEntity : undefined,
      actorEmail: typeof actorEmail === 'string' ? actorEmail : undefined
    })

    console.log(`[ops-worker] /batch-email-send done — deliveryId=${result.deliveryId} status=${result.status}`)

    json(res, 200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /batch-email-send failed:', message)
    json(res, 502, { error: message })
  }
}

/**
 * POST /nexa/weekly-digest
 * Builds and sends the ICO-first Nexa executive digest to internal leadership.
 */
/**
 * Parse opcional de recipients_override desde body. Acepta:
 *   - Array de strings: ["a@b.com", "c@d.com"]
 *   - Array de objetos: [{email, name?, userId?}]
 * Devuelve EmailRecipient[] válido o null si no hay override.
 */
const parseRecipientsOverride = (raw: unknown): Array<{ email: string; name?: string; userId?: string }> | null => {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const out: Array<{ email: string; name?: string; userId?: string }> = []

  for (const entry of raw) {
    if (typeof entry === 'string' && entry.trim()) {
      out.push({ email: entry.trim() })
    } else if (entry && typeof entry === 'object' && 'email' in entry) {
      const email = typeof entry.email === 'string' ? entry.email.trim() : ''

      if (!email) continue

      const name = 'name' in entry && typeof entry.name === 'string' ? entry.name : undefined
      const userId = 'userId' in entry && typeof entry.userId === 'string' ? entry.userId : undefined

      out.push({ email, ...(name ? { name } : {}), ...(userId ? { userId } : {}) })
    }
  }

  return out.length > 0 ? out : null
}

const handleNexaWeeklyDigest = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const limitCandidate = Number(body.limit)
  const limit = Number.isFinite(limitCandidate) ? limitCandidate : WEEKLY_DIGEST_DEFAULT_LIMIT

  // TASK-598 Slice 6.5: dry-run y recipients_override para testing seguro
  // antes del envío real. `dryRun=true` construye el digest pero no envía
  // email — útil para validar output en staging. `recipients_override`
  // permite dirigir el envío a un recipient de test específico.
  const dryRun = body.dryRun === true
  const recipientsOverride = parseRecipientsOverride(body.recipients_override ?? body.recipientsOverride)

  console.log(
    `[ops-worker] POST /nexa/weekly-digest — limit=${limit} dryRun=${dryRun} override=${recipientsOverride ? recipientsOverride.length : 'none'}`
  )

  try {
    const digest = await buildWeeklyDigest({ limit })

    if (digest.totalInsights === 0 || digest.spaces.length === 0) {
      json(res, 200, {
        ok: true,
        skipped: true,
        reason: 'no_weekly_insights',
        digest
      })

      return
    }

    if (dryRun) {
      // No envía, devuelve el digest completo para inspección.
      json(res, 200, {
        ok: true,
        dryRun: true,
        digest,
        skipped: true,
        reason: 'dry_run_no_send'
      })

      return
    }

    const recipients = recipientsOverride ?? (await resolveWeeklyDigestRecipients())

    if (recipients.length === 0) {
      json(res, 200, {
        ok: true,
        skipped: true,
        reason: 'no_weekly_digest_recipients',
        digest
      })

      return
    }

    const result = await sendEmail({
      emailType: 'weekly_executive_digest',
      domain: 'delivery',
      recipients,
      context: digest,
      sourceEventId: `nexa-weekly-digest:${digest.window.startAt}:${digest.window.endAt}${recipientsOverride ? ':override' : ''}`,
      sourceEntity: 'nexa.weekly_digest'
    })

    console.log(
      `[ops-worker] /nexa/weekly-digest done — status=${result.status} recipients=${recipients.length} insights=${digest.totalInsights} override=${recipientsOverride ? 'true' : 'false'}`
    )

    json(res, 200, {
      ok: result.status === 'sent',
      digest,
      recipientsResolved: recipients.length,
      result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /nexa/weekly-digest failed:', message)
    json(res, 502, { error: message })
  }
}

/**
 * POST /reliability-ai-watch
 * TASK-638 — AI Observer del Reliability Control Plane.
 *
 * Lee `getReliabilityOverview()` (snapshot canónico), llama Gemini Flash via
 * Vertex AI con prompt determinista, persiste observations dedupeadas por
 * fingerprint en `greenhouse_ai.reliability_ai_observations`.
 *
 * Hosted aquí (NO en Vercel cron) porque:
 *  - Gemini + DB writes pueden exceder 60s en corner cases
 *  - WIF nativo en Cloud Run (no rotar ADC en Vercel)
 *  - Cloud Logging captura prompt + respuesta para audit
 *  - Cloud Scheduler retries automáticos con backoff
 *
 * Kill-switch: `RELIABILITY_AI_OBSERVER_ENABLED=true`. Default OFF (costo cero
 * hasta activación explícita).
 *
 * Cloud Scheduler job recomendado: cada 1h (`0 *\/1 * * *`) timezone
 * `America/Santiago`. Frecuencia conservadora porque dedup por fingerprint
 * descarta repetidos — pero cada llamada cuesta tokens, sin importar dedup.
 */
const handleReliabilityAiWatch = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  const triggeredBy = (typeof body.triggeredBy === 'string' ? body.triggeredBy : 'cloud_scheduler') as
    | 'cron'
    | 'manual'
    | 'cloud_scheduler'

  const force = body.force === true

  console.log(`[ops-worker] POST /reliability-ai-watch — triggeredBy=${triggeredBy} force=${force}`)

  try {
    /**
     * Lazy import: el runner pulls a heavy tree (`getReliabilityOverview` →
     * cloud/observability/billing/notion/sentry helpers). Si lo importamos
     * top-level, cualquier evaluacion side-effect en esa cadena puede
     * romper el boot del worker. Importarlo aqui aisla el costo al request.
     */
    const { runReliabilityAiObserver } = await import('@/lib/reliability/ai/runner')
    const result = await runReliabilityAiObserver({ triggeredBy, force })

    if (result.summary.skippedReason) {
      console.log(
        `[ops-worker] /reliability-ai-watch skipped — sweepRunId=${result.summary.sweepRunId} reason="${result.summary.skippedReason}"`
      )
    } else {
      console.log(
        `[ops-worker] /reliability-ai-watch done — sweepRunId=${result.summary.sweepRunId} evaluated=${result.summary.observationsEvaluated} persisted=${result.summary.observationsPersisted} skipped=${result.summary.observationsSkipped} ${result.summary.durationMs}ms model=${result.summary.model}`
      )
    }

    json(res, 200, result.summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /reliability-ai-watch failed:', message)
    json(res, 502, { error: message })
  }
}

/**
 * POST /cloud-cost-ai-watch
 * TASK-769 — deterministic GCP Billing Export alert sweep + optional AI FinOps copilot.
 *
 * The deterministic sweep always runs first and is the only source of alert
 * severity. The AI copilot is opt-in (`CLOUD_COST_AI_COPILOT_ENABLED=true`) and
 * degrades to a skipped summary when disabled, unconfigured or deduped.
 */
const handleCloudCostAiWatch = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  const triggeredBy = (typeof body.triggeredBy === 'string' ? body.triggeredBy : 'cloud_scheduler') as
    | 'cron'
    | 'manual'
    | 'cloud_scheduler'

  const force = body.force === true
  const dryRun = body.dryRun === true

  console.log(`[ops-worker] POST /cloud-cost-ai-watch — triggeredBy=${triggeredBy} force=${force} dryRun=${dryRun}`)

  try {
    const [{ runCloudCostAlertSweep }, { runCloudCostAiCopilot }] = await Promise.all([
      import('@/lib/cloud/gcp-billing-alerts'),
      import('@/lib/cloud/finops-ai/runner')
    ])

    const alertSummary = await runCloudCostAlertSweep({ dryRun })
    const aiResult = await runCloudCostAiCopilot({ triggeredBy, force })

    console.log(
      `[ops-worker] /cloud-cost-ai-watch done — alerts=${alertSummary.alertsDispatched}/${alertSummary.alertsEligible} aiPersisted=${aiResult.summary.observationsPersisted} aiSkipped=${aiResult.summary.skippedReason ?? 'none'}`
    )

    json(res, 200, {
      alertSummary,
      aiSummary: aiResult.summary
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /cloud-cost-ai-watch failed:', message)
    json(res, 502, { error: message })
  }
}

/**
 * POST /finance/rematerialize-balances (TASK-702 Slice 7).
 *
 * Re-materializes account_balances daily snapshots for the trailing 7 days
 * across all active accounts. Idempotente: re-runs producen los mismos
 * snapshots dado el mismo ledger.
 *
 * Cloud Run is the canonical home for this — Vercel crons are too short and
 * flaky for the per-day loop across 5 accounts.
 *
 * Body: { lookbackDays?: number, accountIds?: string[] }
 */
const handleFinanceRematerializeBalances = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const lookbackDays = typeof body.lookbackDays === 'number' && body.lookbackDays > 0 ? body.lookbackDays : 7
  const overrideAccountIds = Array.isArray(body.accountIds) ? body.accountIds.map(String) : null
  const startMs = Date.now()

  console.log(`[ops-worker] POST /finance/rematerialize-balances lookback=${lookbackDays}d`)

  try {
    // Pull active accounts + their last known closing as opening seed
    const accounts = await runGreenhousePostgresQuery<{ account_id: string; opening_balance: string; opening_balance_date: string | null }>(
      `SELECT account_id, opening_balance::text, opening_balance_date::text
       FROM greenhouse_finance.accounts
       WHERE is_active = TRUE${overrideAccountIds ? ' AND account_id = ANY($1::text[])' : ''}`,
      overrideAccountIds ? [overrideAccountIds] : []
    )

    const today = new Date()
    const seedDate = new Date(today.getTime() - lookbackDays * 86_400_000).toISOString().slice(0, 10)
    const endDate = today.toISOString().slice(0, 10)

    const results: Array<{ accountId: string; days: number; closing: number }> = []

    for (const acct of accounts) {
      const protectedSeed = await runGreenhousePostgresQuery<{
        balance_date: string
        closing_balance: string
        snapshot_id: string
        drift_status: string
      }>(
        `SELECT
           s.snapshot_at::date::text AS balance_date,
           CASE
             WHEN s.drift_status = 'accepted' THEN s.pg_closing_balance
             ELSE s.bank_closing_balance
           END::text AS closing_balance,
           s.snapshot_id,
           s.drift_status
         FROM greenhouse_finance.account_reconciliation_snapshots s
         WHERE s.account_id = $1
           AND s.drift_status IN ('accepted', 'reconciled')
           AND s.snapshot_at::date BETWEEN $2::date AND $3::date
         ORDER BY s.snapshot_at DESC, s.created_at DESC
         LIMIT 1`,
        [acct.account_id, seedDate, endDate]
      )

      let effectiveSeedDate = seedDate
      let opening: number
      let preserveSeedRow = false

      if (protectedSeed.length > 0) {
        effectiveSeedDate = protectedSeed[0].balance_date
        opening = Number(protectedSeed[0].closing_balance)
        preserveSeedRow = true
      } else {
        // Use the previous day's closing as the seed for this rematerialize.
        const seedRow = await runGreenhousePostgresQuery<{ closing_balance: string }>(
          `SELECT closing_balance::text
           FROM greenhouse_finance.account_balances
           WHERE account_id = $1 AND balance_date <= $2::date
           ORDER BY balance_date DESC LIMIT 1`,
          [acct.account_id, seedDate]
        )

        opening = seedRow.length > 0 ? Number(seedRow[0].closing_balance) : Number(acct.opening_balance ?? 0)
      }

      try {
        const r = await rematerializeAccountBalanceRange({
          accountId: acct.account_id,
          seedDate: effectiveSeedDate,
          openingBalance: opening,
          endDate,
          seedMode: 'explicit',
          preserveSeedRow
        })

        results.push({ accountId: r.accountId, days: r.daysMaterialized, closing: r.finalClosingBalance })

        // TASK-705 — refresh monthly read model para todos los meses tocados.
        // Idempotente; cada (accountId, year, month) resulta en UPSERT atomico.
        const startD = new Date(`${r.seedDate}T00:00:00Z`)
        const endD = new Date(`${endDate}T00:00:00Z`)
        const startYM = startD.getUTCFullYear() * 12 + startD.getUTCMonth()
        const endYM = endD.getUTCFullYear() * 12 + endD.getUTCMonth()

        for (let ym = startYM; ym <= endYM; ym++) {
          const year = Math.floor(ym / 12)
          const month = (ym % 12) + 1

          try {
            const probe = await runGreenhousePostgresQuery<{ ok: number } & Record<string, unknown>>(
              `SELECT 1 AS ok FROM greenhouse_finance.account_balances WHERE account_id = $1
                 AND EXTRACT(YEAR FROM balance_date)::int = $2
                 AND EXTRACT(MONTH FROM balance_date)::int = $3 LIMIT 1`,
              [acct.account_id, year, month]
            )

            if (probe.length > 0) {
              await runGreenhousePostgresQuery(
                `INSERT INTO greenhouse_finance.account_balances_monthly (
                   balance_id, account_id, space_id, balance_year, balance_month, currency,
                   opening_balance, closing_balance, closing_balance_clp,
                   period_inflows, period_outflows,
                   fx_gain_loss_clp, fx_gain_loss_realized_clp, fx_gain_loss_translation_clp,
                   transaction_count, last_transaction_at, computed_at
                 )
                 WITH buckets AS (
                   SELECT * FROM greenhouse_finance.account_balances
                   WHERE account_id = $1
                     AND EXTRACT(YEAR FROM balance_date)::int = $2
                     AND EXTRACT(MONTH FROM balance_date)::int = $3
                 ),
                 o AS (SELECT opening_balance FROM buckets ORDER BY balance_date ASC LIMIT 1),
                 c AS (SELECT space_id, currency, closing_balance, closing_balance_clp FROM buckets ORDER BY balance_date DESC LIMIT 1),
                 s AS (SELECT SUM(period_inflows)::numeric AS pi, SUM(period_outflows)::numeric AS po,
                              SUM(fx_gain_loss_clp)::numeric AS fxa, SUM(fx_gain_loss_realized_clp)::numeric AS fxr,
                              SUM(fx_gain_loss_translation_clp)::numeric AS fxt, SUM(transaction_count)::int AS tc,
                              MAX(last_transaction_at) AS lta FROM buckets)
                 SELECT $4, $1, c.space_id, $2, $3, c.currency, o.opening_balance, c.closing_balance,
                        c.closing_balance_clp, s.pi, s.po, s.fxa, s.fxr, s.fxt, s.tc, s.lta, NOW()
                 FROM c, o, s
                 ON CONFLICT (account_id, balance_year, balance_month) DO UPDATE
                 SET space_id = EXCLUDED.space_id, currency = EXCLUDED.currency,
                     opening_balance = EXCLUDED.opening_balance, closing_balance = EXCLUDED.closing_balance,
                     closing_balance_clp = EXCLUDED.closing_balance_clp,
                     period_inflows = EXCLUDED.period_inflows, period_outflows = EXCLUDED.period_outflows,
                     fx_gain_loss_clp = EXCLUDED.fx_gain_loss_clp,
                     fx_gain_loss_realized_clp = EXCLUDED.fx_gain_loss_realized_clp,
                     fx_gain_loss_translation_clp = EXCLUDED.fx_gain_loss_translation_clp,
                     transaction_count = EXCLUDED.transaction_count,
                     last_transaction_at = EXCLUDED.last_transaction_at,
                     computed_at = NOW()`,
                [acct.account_id, year, month, `acctbal-mo-${acct.account_id}-${year}-${String(month).padStart(2, '0')}`]
              )
            }
          } catch {
            // Mes-failure no aborta el resto; idempotente.
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)

        console.warn(`[ops-worker] rematerialize ${acct.account_id} failed: ${message}`)
        results.push({ accountId: acct.account_id, days: 0, closing: -1 })
      }
    }

    const durationMs = Date.now() - startMs

    console.log(`[ops-worker] /finance/rematerialize-balances done — ${results.length} accounts, ${durationMs}ms`)

    json(res, 200, { accounts: results.length, lookbackDays, seedDate, endDate, results, durationMs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /finance/rematerialize-balances failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /finance/ledger-health-check (TASK-702 Slice 7).
 *
 * Daily health probe. Calls getFinanceLedgerHealth() which checks 4 drift
 * dimensions (settlement_reconciliation, phantoms, balance_freshness,
 * unanchored_expenses) and emits a Sentry message tagged `domain=finance`
 * when drift is detected — surfaces in the Reliability dashboard via
 * `RELIABILITY_REGISTRY[finance].incidentDomainTag` cascade.
 */
const handleFinanceLedgerHealthCheck = async (_req: IncomingMessage, res: ServerResponse) => {
  const startMs = Date.now()

  console.log('[ops-worker] POST /finance/ledger-health-check')

  try {
    const health = await getFinanceLedgerHealth()
    const durationMs = Date.now() - startMs

    if (!health.healthy) {
      captureMessageWithDomain(
        `Finance ledger drift detected on daily probe (settlement=${health.settlementDrift.driftedIncomesCount}, phantoms=${health.phantoms.incomePhantomsCount + health.phantoms.expensePhantomsCount}, stale_balances=${health.balanceFreshness.accountsWithStaleBalances.length}, unanchored=${health.unanchoredExpenses.count}).`,
        'finance',
        {
          level: 'warning',
          tags: { source: 'finance_ledger_drift_daily_cron' },
          extra: {
            settlementDriftCount: health.settlementDrift.driftedIncomesCount,
            phantomsCount: health.phantoms.incomePhantomsCount + health.phantoms.expensePhantomsCount,
            staleBalancesCount: health.balanceFreshness.accountsWithStaleBalances.length,
            unanchoredExpensesCount: health.unanchoredExpenses.count
          },
          fingerprint: ['finance-ledger-drift-daily']
        }
      )
    }

    console.log(`[ops-worker] /finance/ledger-health-check done — healthy=${health.healthy} ${durationMs}ms`)

    json(res, 200, { ...health, durationMs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[ops-worker] /finance/ledger-health-check failed:', message)
    json(res, 500, { error: message })
  }
}

/**
 * POST /notion-conformed/sync
 *
 * Canonical Cloud Run path for the daily Notion BQ-raw → BQ-conformed →
 * PostgreSQL projection cycle. Triggered by Cloud Scheduler at 07:20 UTC
 * (matching the Vercel cron schedule that this replaces). The Vercel cron
 * `/api/cron/sync-conformed` stays available as a manual-trigger fallback.
 *
 * Why ops-worker over Vercel cron for this:
 *   - 60-min Cloud Run timeout vs Vercel's 800s (and historical flakiness
 *     on long Vercel cron jobs).
 *   - Cloud Scheduler has built-in retry with exponential backoff
 *     (`maxRetryAttempts`, `minBackoffDuration`, `maxBackoffDuration`).
 *   - OIDC-authed invocation, no shared CRON_SECRET to rotate.
 *   - Co-located in `us-east4` with the Cloud SQL instance — sub-millisecond
 *     latency on the PG projection step.
 *   - Cloud Logging native, observable in `Cloud Run > ops-worker > Logs`.
 *
 * Body (optional): `{ "executionSource": "scheduled_primary" | "scheduled_retry" | "manual_admin" }`
 *   - default `scheduled_primary` (full daily run)
 */
// ─── /outbox/publish-batch ──────────────────────────────────────────────────
//
// TASK-773 Slice 2 — Outbox publisher migrado de Vercel cron a ops-worker.
// Movía outbox events de greenhouse_sync.outbox_events (Postgres) a
// greenhouse_raw.postgres_outbox_events (BigQuery) y marcaba publish status
// con state machine canónica (pending → publishing → published/failed/dead_letter).
//
// El reactive consumer (/reactive/process-domain) filtra por status='published'
// — sin este publisher, todos los outbox events quedan invisibles. Por eso
// migra de Vercel (que solo corre crons en producción) a Cloud Scheduler
// (que corre por proyecto GCP, igual en staging y prod).
//
// Body opcional: {batchSize?: number, maxRetries?: number}
// Defaults: batchSize=100, maxRetries=OUTBOX_MAX_PUBLISH_ATTEMPTS (5).
const handleOutboxPublishBatch = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  const batchSize = typeof body.batchSize === 'number' && body.batchSize > 0
    ? Math.min(1000, Math.floor(body.batchSize))
    : 100

  const maxRetries = typeof body.maxRetries === 'number' && body.maxRetries > 0
    ? Math.floor(body.maxRetries)
    : OUTBOX_MAX_PUBLISH_ATTEMPTS

  console.log(`[ops-worker] POST /outbox/publish-batch — batchSize=${batchSize} maxRetries=${maxRetries}`)

  try {
    const result = await publishPendingOutboxEvents({ batchSize, maxRetries })

    console.log(
      `[ops-worker] /outbox/publish-batch done — runId=${result.runId} ` +
      `read=${result.eventsRead} published=${result.eventsPublished} ` +
      `failed=${result.eventsFailed} deadLetter=${result.eventsDeadLetter} ` +
      `${result.durationMs}ms`
    )

    json(res, 200, {
      ok: true,
      runId: result.runId,
      eventsRead: result.eventsRead,
      eventsPublished: result.eventsPublished,
      eventsFailed: result.eventsFailed,
      eventsDeadLetter: result.eventsDeadLetter,
      durationMs: result.durationMs
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown outbox publish error'

    console.error('[ops-worker] /outbox/publish-batch failed:', message)
    json(res, 502, { error: message })
  }
}

// ─── /email-deliverability-monitor ──────────────────────────────────────────
//
// TASK-775 Slice 2 — Email deliverability monitor migrado de Vercel cron a
// ops-worker. Computa bounce rate y complaint rate de los últimos 7 días, emite
// outbox events `email.deliverability.alert` si excede thresholds Gmail.
//
// Razón de migración: Vercel custom env (staging) NO ejecuta crons — el monitor
// nunca disparaba alerts en staging, y el equipo perdía visibilidad de drift
// durante QA. Cloud Scheduler corre por proyecto GCP, igual en cualquier env.
//
// Inaugura el helper canónico `wrapCronHandler` (TASK-775 Slice 1) — centraliza
// runId, audit log, captureWithDomain('sync'), redact errors, 502 sanitizado.
const handleEmailDeliverabilityMonitor = wrapCronHandler({
  name: 'email-deliverability-monitor',
  domain: 'sync',
  run: async (): Promise<Record<string, unknown>> => {
    const result = await runEmailDeliverabilityMonitor()

    return { ...result }
  }
})

// ─── /nubox/* ───────────────────────────────────────────────────────────────
//
// TASK-775 Slice 3 — Nubox sync crons migrados de Vercel a Cloud Scheduler.
// Razón: Vercel custom env (staging) NO ejecuta crons → balances Nubox quedaban
// stale en staging para QA, divergencias nunca emitían outbox events. Cloud
// Scheduler corre por proyecto GCP, igual en cualquier env.
//
// 3 endpoints:
//   POST /nubox/balance-sync     → balances PG income/expenses + outbox divergence
//   POST /nubox/sync             → 3-fase raw → conformed → postgres
//   POST /nubox/quotes-hot-sync  → quotes hot path (period-scoped quotes)

const handleNuboxBalanceSync = wrapCronHandler({
  name: 'nubox-balance-sync',
  domain: 'sync',
  run: async (): Promise<Record<string, unknown>> => {
    const result = await runNuboxBalanceSync()

    return { ...result }
  }
})

const handleNuboxSync = wrapCronHandler({
  name: 'nubox-sync',
  domain: 'sync',
  run: async (): Promise<Record<string, unknown>> => {
    const result = await runNuboxSyncOrchestration()

    return { ...result }
  }
})

const handleNuboxQuotesHotSync = wrapCronHandler({
  name: 'nubox-quotes-hot-sync',
  domain: 'sync',
  run: async (body): Promise<Record<string, unknown>> => {
    const periods = Array.isArray(body.periods)
      ? body.periods.filter((p): p is string => typeof p === 'string')
      : undefined

    const result = await runNuboxQuotesHotSync({ periods })

    return { ...result }
  }
})

// ─── /webhook-dispatch ──────────────────────────────────────────────────────
//
// TASK-775 Slice 7 — Webhook outbound dispatcher migrado de Vercel a Cloud Run.
const handleWebhookDispatch = wrapCronHandler({
  name: 'webhook-dispatch',
  domain: 'sync',
  run: async (): Promise<Record<string, unknown>> => runWebhookDispatch()
})

// ─── /email-delivery-retry ──────────────────────────────────────────────────
//
// TASK-775 Slice 7 — Email delivery retry migrado de Vercel a Cloud Run.
const handleEmailDeliveryRetry = wrapCronHandler({
  name: 'email-delivery-retry',
  domain: 'sync',
  run: async (): Promise<Record<string, unknown>> => runEmailDeliveryRetry()
})

// ─── /entra/* ───────────────────────────────────────────────────────────────
//
// TASK-775 Slice 7 — Entra crons migrados a Cloud Run.
const handleEntraProfileSync = wrapCronHandler({
  name: 'entra-profile-sync',
  domain: 'identity',
  run: async (): Promise<Record<string, unknown>> => runEntraProfileSync()
})

const handleEntraWebhookRenew = wrapCronHandler({
  name: 'entra-webhook-renew',
  domain: 'identity',
  run: async (): Promise<Record<string, unknown>> => runEntraWebhookRenew()
})

// ─── /hubspot/* ─────────────────────────────────────────────────────────────
//
// TASK-775 Slice 7 — Lane HubSpot completo migrado a Cloud Run.
const handleHubspotQuotesSync = wrapCronHandler({
  name: 'hubspot-quotes-sync',
  domain: 'integrations.hubspot',
  run: async (): Promise<Record<string, unknown>> => runHubspotQuotesSync()
})

const handleHubspotCompanyLifecycleSync = wrapCronHandler({
  name: 'hubspot-company-lifecycle-sync',
  domain: 'integrations.hubspot',
  run: async (): Promise<Record<string, unknown>> => runHubspotCompanyLifecycleSync()
})

const handleHubspotCompaniesSync = wrapCronHandler({
  name: 'hubspot-companies-sync',
  domain: 'integrations.hubspot',
  run: async (body): Promise<Record<string, unknown>> => runHubspotCompaniesSync({
    dryRun: typeof body.dryRun === 'boolean' ? body.dryRun : false,
    fullResync: typeof body.fullResync === 'boolean' ? body.fullResync : false
  })
})

const handleHubspotDealsSync = wrapCronHandler({
  name: 'hubspot-deals-sync',
  domain: 'integrations.hubspot',
  run: async (body): Promise<Record<string, unknown>> => runHubspotDealsSync({
    includeClosed: typeof body.includeClosed === 'boolean' ? body.includeClosed : true
  })
})

const handleHubspotProductsSync = wrapCronHandler({
  name: 'hubspot-products-sync',
  domain: 'integrations.hubspot',
  run: async (): Promise<Record<string, unknown>> => runHubspotProductsSync()
})

// TASK-813 Slice 5 — HubSpot p_services (0-162) safety-net cron diario.
// Path canónico real-time: webhook hubspot-services. Este cron es fallback
// cuando webhook pierde events (retries exhausted, handler bug).
const handleHubspotServicesSync = wrapCronHandler({
  name: 'hubspot-services-sync',
  domain: 'integrations.hubspot',
  run: async (): Promise<Record<string, unknown>> => runHubspotServicesSync()
})

// ─── /notion-conformed/recovery ─────────────────────────────────────────────
//
// TASK-775 Slice 7 — Notion conformed recovery migrado a Cloud Run.
const handleNotionConformedRecovery = wrapCronHandler({
  name: 'notion-conformed-recovery',
  domain: 'integrations.notion',
  run: async (): Promise<Record<string, unknown>> => runNotionConformedRecovery()
})

// ─── /reconciliation/auto-match ─────────────────────────────────────────────
//
// TASK-775 Slice 7 — Reconciliation auto-match migrado a Cloud Run.
const handleReconciliationAutoMatch = wrapCronHandler({
  name: 'reconciliation-auto-match',
  domain: 'finance',
  run: async (): Promise<Record<string, unknown>> => runReconciliationAutoMatch()
})

// ─── /ico/member-sync ───────────────────────────────────────────────────────
//
// TASK-775 Slice 9 — ICO member sync migrado a Cloud Run. Async-critical:
// alimenta `/people/[id]/ico` que QA usa en staging para validar métricas
// individuales. Si queda stale en staging, QA cree que el motor está roto.
const handleIcoMemberSync = wrapCronHandler({
  name: 'ico-member-sync',
  domain: 'delivery',
  run: async (): Promise<Record<string, unknown>> => runIcoMemberSync()
})

const handleNotionConformedSync = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const rawSource = typeof body.executionSource === 'string' ? body.executionSource.trim() : 'scheduled_primary'

  const executionSource = (
    rawSource === 'scheduled_retry' || rawSource === 'manual_admin'
      ? rawSource
      : 'scheduled_primary'
  ) as 'scheduled_primary' | 'scheduled_retry' | 'manual_admin'

  console.log(`[ops-worker] POST /notion-conformed/sync — executionSource=${executionSource}`)

  try {
    // Step 1: BQ-side cycle (raw → conformed). May skip if BQ conformed is
    // already current — that's fine, Step 2 still runs unconditionally.
    const orchestrationResult = await runNotionSyncOrchestration({ executionSource })

    // Step 2: PG-side projection (BQ conformed → Postgres). UNCONDITIONAL —
    // closes the historical gap where the orchestrator skipped on
    // "BQ already current" but PG was 24+ days stale because no scheduled
    // process drained BQ-conformed → PG independently. This step always runs
    // so PG stays in sync regardless of what happened upstream.
    let pgProjectionResult: Awaited<ReturnType<typeof syncBqConformedToPostgres>> | null = null
    let pgProjectionError: string | null = null

    try {
      pgProjectionResult = await syncBqConformedToPostgres({
        syncRunId: orchestrationResult.syncRunId ?? `pg-drain-${Date.now()}`,
        targetSpaceIds: null, // null = all active spaces
        replaceMissingForSpaces: true
      })

      console.log(
        `[ops-worker] PG drain from BQ: read=${pgProjectionResult.bqProjectsRead}p/${pgProjectionResult.bqSprintsRead}s/${pgProjectionResult.bqTasksRead}t, ` +
        `written=${pgProjectionResult.pgProjectsWritten}p/${pgProjectionResult.pgSprintsWritten}s/${pgProjectionResult.pgTasksWritten}t, ` +
        `deleted=${pgProjectionResult.pgProjectsMarkedDeleted}p/${pgProjectionResult.pgSprintsMarkedDeleted}s/${pgProjectionResult.pgTasksMarkedDeleted}t, ` +
        `${pgProjectionResult.durationMs}ms`
      )
    } catch (err) {
      pgProjectionError = err instanceof Error ? err.message : String(err)
      console.error('[ops-worker] PG drain failed (non-blocking):', pgProjectionError)
    }

    json(res, 200, {
      ok: true,
      orchestrator: 'cloud_run',
      executionSource,
      orchestration: orchestrationResult,
      pgProjection: pgProjectionResult,
      pgProjectionError
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync orchestration error'

    console.error('[ops-worker] /notion-conformed/sync failed:', message)
    json(res, 502, { error: message })
  }
}

// ─── /smoke/identity-auth-providers ──────────────────────────────────────────
//
// TASK-742 Capa 6 — Synthetic monitor for the auth provider stack.
// Persists a row in greenhouse_sync.smoke_lane_runs with lane_key
// 'identity.auth.providers'. Reliability dashboard consumes this to roll up
// SSO health into the Identity subsystem. Must run from outside Vercel to
// avoid measuring the same runtime that may be itself broken.
//
// Probes (each with 5s timeout):
//   - GET https://greenhouse.efeoncepro.com/api/auth/health → expect status='ready'
//   - HEAD Microsoft OIDC discovery endpoint → expect 200
//   - In-process JWT sign+verify roundtrip with NEXTAUTH_SECRET
//
// Exit codes via JSON response:
//   200 + status='passed'  → all probes succeeded
//   200 + status='failed'  → at least one probe failed (smoke registered, alerts fire)
//   502                     → smoke run itself failed (PG insert, etc.)
const handleIdentityAuthSmoke = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })

    return
  }

  const portalUrl = (process.env.GREENHOUSE_PORTAL_BASE_URL || 'https://greenhouse.efeoncepro.com').replace(/\/$/u, '')
  const microsoftOidcUrl = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration'
  const startedAt = new Date()

  type ProbeResult = { name: string; passed: boolean; durationMs: number; reason?: string }
  const probes: ProbeResult[] = []

  const fetchWithTimeout = async (url: string, init: RequestInit, ms: number) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)

    try {
      return await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' })
    } finally {
      clearTimeout(timer)
    }
  }

  // Probe 1 — portal /api/auth/health
  {
    const t = Date.now()

    try {
      const response = await fetchWithTimeout(`${portalUrl}/api/auth/health`, { method: 'GET' }, 5_000)

      if (!response.ok) {
        probes.push({ name: 'portal_auth_health', passed: false, durationMs: Date.now() - t, reason: `HTTP ${response.status}` })
      } else {
        const body = (await response.json().catch(() => null)) as { overallStatus?: string } | null
        const overallStatus = body?.overallStatus

        probes.push({
          name: 'portal_auth_health',
          passed: overallStatus === 'ready',
          durationMs: Date.now() - t,
          reason: overallStatus !== 'ready' ? `overallStatus=${overallStatus ?? 'missing'}` : undefined
        })
      }
    } catch (error) {
      probes.push({
        name: 'portal_auth_health',
        passed: false,
        durationMs: Date.now() - t,
        reason: error instanceof Error ? error.message : 'unknown_error'
      })
    }
  }

  // Probe 2 — Microsoft OIDC discovery
  {
    const t = Date.now()

    try {
      const response = await fetchWithTimeout(microsoftOidcUrl, { method: 'GET' }, 5_000)

      probes.push({
        name: 'microsoft_oidc_discovery',
        passed: response.ok,
        durationMs: Date.now() - t,
        reason: response.ok ? undefined : `HTTP ${response.status}`
      })
    } catch (error) {
      probes.push({
        name: 'microsoft_oidc_discovery',
        passed: false,
        durationMs: Date.now() - t,
        reason: error instanceof Error ? error.message : 'unknown_error'
      })
    }
  }

  // Probe 2b — Azure /authorize endpoint with the real client_id.
  //
  // This is the smoking-gun probe: it catches the exact failure mode of the
  // 2026-04-30 incident (signInAudience flipped from multi-tenant to single-
  // tenant). When the App is correctly multi-tenant, /common/oauth2/v2.0/authorize
  // returns HTTP 200 with the "Sign in to your account" page (Azure renders the
  // login UI). When the App is single-tenant accessed via /common/, Azure
  // responds with HTTP 200 but the body contains AADSTS50194 / AADSTS9002313
  // and a different page title.
  //
  // Detects 4 distinct failure modes without browser automation:
  //   - App deleted / client_id wrong  → AADSTS700016
  //   - Multi-tenant misconfiguration  → AADSTS50194 / AADSTS9002313
  //   - Redirect URI not registered    → AADSTS50011
  //   - Tenant-restricted              → AADSTS500011
  {
    const t = Date.now()
    const clientId = (process.env.AZURE_AD_CLIENT_ID || '').trim()
    const redirect = `${portalUrl}/api/auth/callback/azure-ad`

    const url =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirect)}` +
      `&scope=openid` +
      `&response_mode=query` +
      `&state=ops-worker-smoke`

    if (!clientId) {
      probes.push({ name: 'azure_authorize_endpoint', passed: false, durationMs: 0, reason: 'AZURE_AD_CLIENT_ID unset' })
    } else {
      try {
        const response = await fetchWithTimeout(url, { method: 'GET' }, 5_000)
        const text = await response.text().catch(() => '')
        const aadstsMatch = text.match(/AADSTS\d+/)
        const passed = response.ok && !aadstsMatch && /sign in to your account/i.test(text)

        probes.push({
          name: 'azure_authorize_endpoint',
          passed,
          durationMs: Date.now() - t,
          reason: passed
            ? undefined
            : aadstsMatch
              ? `Azure rejected authorize: ${aadstsMatch[0]}`
              : `unexpected response (HTTP ${response.status})`
        })
      } catch (error) {
        probes.push({
          name: 'azure_authorize_endpoint',
          passed: false,
          durationMs: Date.now() - t,
          reason: error instanceof Error ? error.message : 'unknown_error'
        })
      }
    }
  }

  // Probe 3 — in-process readiness snapshot (uses ops-worker's own secrets)
  {
    const t = Date.now()

    try {
      const snap = await getCurrentAuthReadiness()

      probes.push({
        name: 'in_process_readiness',
        passed: snap.overallStatus === 'ready',
        durationMs: Date.now() - t,
        reason: snap.overallStatus !== 'ready' ? `overallStatus=${snap.overallStatus}` : undefined
      })
    } catch (error) {
      probes.push({
        name: 'in_process_readiness',
        passed: false,
        durationMs: Date.now() - t,
        reason: error instanceof Error ? error.message : 'unknown_error'
      })
    }
  }

  // Probe 4 — JWT sign+verify roundtrip with NEXTAUTH_SECRET
  {
    const t = Date.now()
    const secret = process.env.NEXTAUTH_SECRET?.trim() || null

    if (!secret) {
      probes.push({ name: 'jwt_self_test', passed: false, durationMs: Date.now() - t, reason: 'NEXTAUTH_SECRET unset' })
    } else {
      const ok = await probeNextAuthSecretRoundTrip(secret)

      probes.push({
        name: 'jwt_self_test',
        passed: ok,
        durationMs: Date.now() - t,
        reason: ok ? undefined : 'sign+verify roundtrip failed'
      })
    }
  }

  const finishedAt = new Date()
  const allPassed = probes.every(p => p.passed)
  const status: 'passed' | 'failed' = allPassed ? 'passed' : 'failed'
  const totalTests = probes.length
  const passedTests = probes.filter(p => p.passed).length
  const failedTests = totalTests - passedTests

  const smokeRunId = `smoke-identity-auth-${Date.now().toString(36)}`
  const commitSha = (process.env.K_REVISION || process.env.GIT_COMMIT || 'unknown').slice(0, 40)
  const branch = process.env.K_SERVICE || 'ops-worker'

  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.smoke_lane_runs (
         smoke_lane_run_id, lane_key, commit_sha, branch, workflow_run_url,
         status, started_at, finished_at, duration_ms,
         total_tests, passed_tests, failed_tests, skipped_tests, summary_json
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9,
               $10, $11, $12, $13, $14::jsonb)`,
      [
        smokeRunId,
        'identity.auth.providers',
        commitSha,
        branch,
        null,
        status,
        startedAt.toISOString(),
        finishedAt.toISOString(),
        finishedAt.getTime() - startedAt.getTime(),
        totalTests,
        passedTests,
        failedTests,
        0,
        JSON.stringify({ probes })
      ]
    )

    if (status === 'failed') {
      captureMessageWithDomain(
        `identity.auth.providers smoke failed: ${probes.filter(p => !p.passed).map(p => p.name).join(', ')}`,
        'identity',
        { level: 'error', extra: { probes } }
      )
    }

    json(res, 200, { smokeRunId, status, totalTests, passedTests, failedTests, probes })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'

    console.error('[ops-worker] /smoke/identity-auth-providers failed to persist:', message)
    json(res, 502, { error: message, probes })
  }
}

// ─── Router ─────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const method = req.method?.toUpperCase() || 'GET'
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const path = url.pathname

  if (!isAuthorized(req)) {
    json(res, 401, { error: 'Unauthorized' })

    return
  }

  try {
    if (method === 'GET' && path === '/health') {
      handleHealth(req, res)

      return
    }

    if (method === 'POST' && path === '/reactive/process') {
      await handleReactiveProcess(req, res)

      return
    }

    if (method === 'POST' && path === '/reactive/process-domain') {
      await handleReactiveProcessDomain(req, res)

      return
    }

    if (method === 'POST' && path === '/reactive/recover') {
      await handleReactiveRecover(req, res)

      return
    }

    if (method === 'GET' && path === '/reactive/queue-depth') {
      await handleReactiveQueueDepth(req, res)

      return
    }

    if (method === 'POST' && path === '/cost-attribution/materialize') {
      await handleCostAttributionMaterialize(req, res)

      return
    }

    if (method === 'POST' && path === '/vat-ledger/materialize') {
      await handleVatLedgerMaterialize(req, res)

      return
    }

    if (method === 'POST' && path === '/party-lifecycle/sweep') {
      await handlePartyLifecycleSweep(req, res)

      return
    }

    if (method === 'POST' && path === '/product-catalog/drift-detect') {
      await handleProductCatalogDriftDetect(req, res)

      return
    }

    if (method === 'POST' && path === '/product-catalog/reconcile-v2') {
      await handleProductCatalogReconcileV2(req, res)

      return
    }

    if (method === 'POST' && path === '/quotation-lifecycle/sweep') {
      await handleQuotationLifecycleSweep(req, res)

      return
    }

    if (method === 'POST' && path === '/batch-email-send') {
      await handleBatchEmailSend(req, res)

      return
    }

    if (method === 'POST' && path === '/nexa/weekly-digest') {
      await handleNexaWeeklyDigest(req, res)

      return
    }

    if (method === 'POST' && path === '/notion-conformed/sync') {
      await handleNotionConformedSync(req, res)

      return
    }

    if (method === 'POST' && path === '/outbox/publish-batch') {
      await handleOutboxPublishBatch(req, res)

      return
    }

    if (method === 'POST' && path === '/email-deliverability-monitor') {
      await handleEmailDeliverabilityMonitor(req, res)

      return
    }

    if (method === 'POST' && path === '/nubox/balance-sync') {
      await handleNuboxBalanceSync(req, res)

      return
    }

    if (method === 'POST' && path === '/nubox/sync') {
      await handleNuboxSync(req, res)

      return
    }

    if (method === 'POST' && path === '/nubox/quotes-hot-sync') {
      await handleNuboxQuotesHotSync(req, res)

      return
    }

    if (method === 'POST' && path === '/webhook-dispatch') {
      await handleWebhookDispatch(req, res)

      return
    }

    if (method === 'POST' && path === '/email-delivery-retry') {
      await handleEmailDeliveryRetry(req, res)

      return
    }

    if (method === 'POST' && path === '/entra/profile-sync') {
      await handleEntraProfileSync(req, res)

      return
    }

    if (method === 'POST' && path === '/entra/webhook-renew') {
      await handleEntraWebhookRenew(req, res)

      return
    }

    if (method === 'POST' && path === '/hubspot/quotes-sync') {
      await handleHubspotQuotesSync(req, res)

      return
    }

    if (method === 'POST' && path === '/hubspot/company-lifecycle-sync') {
      await handleHubspotCompanyLifecycleSync(req, res)

      return
    }

    if (method === 'POST' && path === '/hubspot/companies-sync') {
      await handleHubspotCompaniesSync(req, res)

      return
    }

    if (method === 'POST' && path === '/hubspot/deals-sync') {
      await handleHubspotDealsSync(req, res)

      return
    }

    if (method === 'POST' && path === '/hubspot/services-sync') {
      await handleHubspotServicesSync(req, res)

      return
    }

    if (method === 'POST' && path === '/hubspot/products-sync') {
      await handleHubspotProductsSync(req, res)

      return
    }

    if (method === 'POST' && path === '/notion-conformed/recovery') {
      await handleNotionConformedRecovery(req, res)

      return
    }

    if (method === 'POST' && path === '/reconciliation/auto-match') {
      await handleReconciliationAutoMatch(req, res)

      return
    }

    if (method === 'POST' && path === '/ico/member-sync') {
      await handleIcoMemberSync(req, res)

      return
    }

    if (method === 'POST' && path === '/smoke/identity-auth-providers') {
      await handleIdentityAuthSmoke(req, res)

      return
    }

    if (method === 'POST' && path === '/reliability-ai-watch') {
      await handleReliabilityAiWatch(req, res)

      return
    }

    if (method === 'POST' && path === '/cloud-cost-ai-watch') {
      await handleCloudCostAiWatch(req, res)

      return
    }

    if (method === 'POST' && path === '/finance/rematerialize-balances') {
      await handleFinanceRematerializeBalances(req, res)

      return
    }

    if (method === 'POST' && path === '/finance/ledger-health-check') {
      await handleFinanceLedgerHealthCheck(req, res)

      return
    }

    json(res, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined

    console.error(`[ops-worker] ${method} ${path} failed:`, message, stack)
    json(res, 500, { error: message })
  }
})

server.listen(PORT, () => {
  console.log(`[ops-worker] listening on :${PORT}`)
})
