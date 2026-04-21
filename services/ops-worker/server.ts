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
 *
 * Auth: Cloud Run IAM (--no-allow-unauthenticated) + optional CRON_SECRET header
 * Runtime: Node.js 22 via esbuild bundle (handles TypeScript + @/ path aliases)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { processReactiveEvents, ensureReactiveSchema, sweepAuditOnlyEvents } from '@/lib/sync/reactive-consumer'
import { claimOrphanedRefreshItems, markRefreshCompleted, markRefreshFailed } from '@/lib/sync/refresh-queue'
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
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { materializeAllAvailableVatPeriods, materializeVatLedgerForPeriod } from '@/lib/finance/vat-ledger'
import { runQuotationLifecycleSweep } from '@/lib/commercial-intelligence/renewal-lifecycle'
import { sendEmail } from '@/lib/email/delivery'
import { buildWeeklyDigest, resolveWeeklyDigestRecipients, WEEKLY_DIGEST_DEFAULT_LIMIT } from '@/lib/nexa/digest'

import { getReactiveQueueDepth, InvalidDomainError } from './reactive-queue-depth'

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
        await markRefreshFailed(orphan.queueId, `Projection "${orphan.projectionName}" not found in registry`, 0)
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
        const errorMsg = error instanceof Error ? error.message : String(error)

        await markRefreshFailed(orphan.queueId, errorMsg, projection.maxRetries ?? 2)
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
const handleNexaWeeklyDigest = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const limitCandidate = Number(body.limit)
  const limit = Number.isFinite(limitCandidate) ? limitCandidate : WEEKLY_DIGEST_DEFAULT_LIMIT

  console.log(`[ops-worker] POST /nexa/weekly-digest — limit=${limit}`)

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

    const recipients = await resolveWeeklyDigestRecipients()

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
      sourceEventId: `nexa-weekly-digest:${digest.window.startAt}:${digest.window.endAt}`,
      sourceEntity: 'nexa.weekly_digest'
    })

    console.log(
      `[ops-worker] /nexa/weekly-digest done — status=${result.status} recipients=${recipients.length} insights=${digest.totalInsights}`
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
