/**
 * ICO Batch Worker — Cloud Run Service
 *
 * Standalone HTTP server that runs heavy ICO Engine batch processes
 * outside of Vercel's 120s function timeout. Reuses all existing
 * src/lib/ modules from the monorepo.
 *
 * Endpoints:
 *   GET  /health                      → 200 health check
 *   POST /ico/materialize             → full ICO monthly materialization
 *   POST /ico/llm-enrich              → ICO LLM enrichment pipeline
 *   POST /finance/materialize-signals → Finance Signal Engine anomaly detection
 *   POST /finance/llm-enrich          → Finance LLM enrichment pipeline
 *
 * Auth: Cloud Run IAM (--no-allow-unauthenticated) + optional CRON_SECRET header
 * Runtime: Node.js 22 via tsx (handles TypeScript + @/ path aliases)
 * server-only shim: --conditions=react-server flag resolves Next.js server-only imports
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { materializeMonthlySnapshots } from '@/lib/ico-engine/materialize'
import { materializeAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-worker'
import { materializeFinanceSignals } from '@/lib/finance/ai/materialize-finance-signals'
import { materializeFinanceAiLlmEnrichments } from '@/lib/finance/ai/llm-enrichment-worker'

// TASK-844 — Sentry init must run BEFORE any function from @/lib/** is invoked
// so the canonical `captureWithDomain` wrapper has a live Sentry hub. See
// ISSUE-074 + docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md.
import { initSentryForService } from '../_shared/sentry-init'

// ─── Sentry init (TASK-844) ─────────────────────────────────────────────────
//
// First executable statement after imports. ESM hoisting completes all imports
// first; this runs before createServer accepts traffic — ensuring captureWithDomain
// has a live Sentry hub when lib functions execute.
initSentryForService('ico-batch')

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 8080
const CRON_SECRET = process.env.CRON_SECRET?.trim() || ''

// ─── Auth ───────────────────────────────────────────────────────────────────

const isAuthorized = (req: IncomingMessage): boolean => {
  // Cloud Run IAM handles primary auth (--no-allow-unauthenticated).
  // If CRON_SECRET is set, also accept Bearer token as fallback for manual invocations.
  if (!CRON_SECRET) return true

  const authHeader = req.headers.authorization?.trim() || ''

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice('bearer '.length).trim()

    if (token === CRON_SECRET) return true
  }

  // If no Bearer token, assume Cloud Run IAM already validated the request.
  // Cloud Run strips the Authorization header after IAM validation,
  // so absence of header with CRON_SECRET set is not necessarily unauthorized.
  return true
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
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
  json(res, 200, { status: 'ok', service: 'ico-batch-worker', timestamp: now() })
}

const handleMaterialize = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const currentDate = new Date()
  const year = Number(body.year) || currentDate.getFullYear()
  const month = Number(body.month) || currentDate.getMonth() + 1
  const monthsBack = Number(body.monthsBack) || 1

  console.log(`[ico-batch] POST /ico/materialize — year=${year} month=${month} monthsBack=${monthsBack}`)

  const results = []

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(year, month - 1 - i, 1)
    const periodYear = date.getFullYear()
    const periodMonth = date.getMonth() + 1

    console.log(`[ico-batch] materializing ${periodYear}-${String(periodMonth).padStart(2, '0')}...`)

    const result = await materializeMonthlySnapshots(periodYear, periodMonth)

    results.push(result)
    console.log(`[ico-batch] done ${periodYear}-${String(periodMonth).padStart(2, '0')} in ${result.durationMs}ms`)
  }

  json(res, 200, {
    monthsBack,
    periods: results.map(r => `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`),
    totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
    spacesProcessed: results.reduce((s, r) => s + r.spacesProcessed, 0),
    snapshotsWritten: results.reduce((s, r) => s + r.snapshotsWritten, 0),
    aiSignalsWritten: results.reduce((s, r) => s + r.aiSignalsWritten, 0),
    results
  })
}

const handleLlmEnrich = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const currentDate = new Date()
  const year = Number(body.year) || currentDate.getFullYear()
  const month = Number(body.month) || currentDate.getMonth() + 1
  const monthsBack = Number(body.monthsBack) || 1

  console.log(`[ico-batch] POST /ico/llm-enrich — year=${year} month=${month} monthsBack=${monthsBack}`)

  const results = []

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(year, month - 1 - i, 1)
    const periodYear = date.getFullYear()
    const periodMonth = date.getMonth() + 1

    console.log(`[ico-batch] enriching ${periodYear}-${String(periodMonth).padStart(2, '0')}...`)

    const result = await materializeAiLlmEnrichments({
      periodYear,
      periodMonth,
      triggerType: 'cloud_run_batch'
    })

    results.push({
      period: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      runId: result.run.runId,
      status: result.run.status,
      signalsSeen: result.run.signalsSeen,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      promptVersion: result.run.promptVersion,
      promptHash: result.run.promptHash,
      latencyMs: result.run.latencyMs
    })

    console.log(`[ico-batch] done enrichment ${periodYear}-${String(periodMonth).padStart(2, '0')}: ${result.succeeded} ok / ${result.failed} failed`)
  }

  json(res, 200, { monthsBack, results })
}

const handleFinanceMaterializeSignals = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const currentDate = new Date()
  const year = Number(body.year) || currentDate.getFullYear()
  const month = Number(body.month) || currentDate.getMonth() + 1
  const monthsBack = Number(body.monthsBack) || 1

  console.log(`[ico-batch] POST /finance/materialize-signals — year=${year} month=${month} monthsBack=${monthsBack}`)

  const results = []

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(year, month - 1 - i, 1)
    const periodYear = date.getFullYear()
    const periodMonth = date.getMonth() + 1

    console.log(`[ico-batch] finance-materialize ${periodYear}-${String(periodMonth).padStart(2, '0')}...`)

    const result = await materializeFinanceSignals({
      periodYear,
      periodMonth,
      triggerType: 'cloud_run_batch'
    })

    results.push(result)
    console.log(
      `[ico-batch] finance-materialize done ${periodYear}-${String(periodMonth).padStart(2, '0')}: ` +
        `${result.snapshotsEvaluated} snapshots → ${result.signalsWritten} signals in ${result.durationMs}ms`
    )
  }

  json(res, 200, {
    monthsBack,
    totalDurationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
    totalSnapshotsEvaluated: results.reduce((sum, result) => sum + result.snapshotsEvaluated, 0),
    totalSignalsWritten: results.reduce((sum, result) => sum + result.signalsWritten, 0),
    results
  })
}

const handleFinanceLlmEnrich = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)
  const currentDate = new Date()
  const year = Number(body.year) || currentDate.getFullYear()
  const month = Number(body.month) || currentDate.getMonth() + 1
  const monthsBack = Number(body.monthsBack) || 1

  console.log(`[ico-batch] POST /finance/llm-enrich — year=${year} month=${month} monthsBack=${monthsBack}`)

  const results = []

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(year, month - 1 - i, 1)
    const periodYear = date.getFullYear()
    const periodMonth = date.getMonth() + 1

    console.log(`[ico-batch] finance-enrich ${periodYear}-${String(periodMonth).padStart(2, '0')}...`)

    const result = await materializeFinanceAiLlmEnrichments({
      periodYear,
      periodMonth,
      triggerType: 'cloud_run_batch'
    })

    results.push({
      period: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      runId: result.run.runId,
      status: result.run.status,
      signalsSeen: result.run.signalsSeen,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      promptVersion: result.run.promptVersion,
      promptHash: result.run.promptHash,
      latencyMs: result.run.latencyMs
    })

    console.log(
      `[ico-batch] finance-enrich done ${periodYear}-${String(periodMonth).padStart(2, '0')}: ` +
        `${result.succeeded} ok / ${result.failed} failed / ${result.skipped} skipped`
    )
  }

  json(res, 200, { monthsBack, results })
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

    if (method === 'POST' && path === '/ico/materialize') {
      await handleMaterialize(req, res)

      return
    }

    if (method === 'POST' && path === '/ico/llm-enrich') {
      await handleLlmEnrich(req, res)

      return
    }

    if (method === 'POST' && path === '/finance/materialize-signals') {
      await handleFinanceMaterializeSignals(req, res)

      return
    }

    if (method === 'POST' && path === '/finance/llm-enrich') {
      await handleFinanceLlmEnrich(req, res)

      return
    }

    json(res, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined

    console.error(`[ico-batch] ${method} ${path} failed:`, message, stack)
    json(res, 500, { error: message })
  }
})

// ─── Start ──────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[ico-batch] ICO Batch Worker listening on port ${PORT}`)
})
