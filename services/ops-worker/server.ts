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
 *   POST /cost-attribution/materialize → Materialize commercial cost attribution + client economics
 *
 * Auth: Cloud Run IAM (--no-allow-unauthenticated) + optional CRON_SECRET header
 * Runtime: Node.js 22 via esbuild bundle (handles TypeScript + @/ path aliases)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { processReactiveEvents, ensureReactiveSchema } from '@/lib/sync/reactive-consumer'
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
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'

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
    const orphans = await claimOrphanedRefreshItems(batchSize, staleMinutes)

    if (orphans.length === 0) {
      await writeReactiveRunComplete({
        runId,
        result: { runId, eventsProcessed: 0, eventsFailed: 0, projectionsTriggered: 0, actions: [], durationMs: Date.now() - recoverStartMs }
      })

      json(res, 200, { runId, recovered: 0, failed: 0, message: 'No orphaned projections found' })

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
        runId,
        eventsProcessed: recovered,
        eventsFailed: failed,
        projectionsTriggered: orphans.length,
        actions: details.map(d => `${d.projectionName}:${d.status}`),
        durationMs: recoverDurationMs
      },
      status: failed > 0 && recovered > 0 ? 'partial' : failed > 0 ? 'failed' : 'succeeded'
    })

    console.log(
      `[ops-worker] /reactive/recover done — ${recovered} recovered, ${failed} failed out of ${orphans.length} orphans`
    )

    json(res, 200, { runId, recovered, failed, total: orphans.length, details })
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

    if (method === 'POST' && path === '/cost-attribution/materialize') {
      await handleCostAttributionMaterialize(req, res)

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
