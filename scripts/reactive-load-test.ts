#!/usr/bin/env tsx
// ============================================================
// Greenhouse — Reactive Pipeline Synthetic Load Test (TASK-379)
// ============================================================
// Publishes N synthetic outbox events, drains them through the
// V2 reactive consumer (bypassing Cloud Run to keep the test
// self-contained), and reports drain time, throughput, and
// per-projection latency statistics.
//
// Usage:
//   pnpm reactive:load-test --events=1000
//   pnpm reactive:load-test --events=5000 --burst
//   pnpm reactive:load-test --events=500 --steady --event-type=provider.tooling_snapshot.period_materialized
//
// Environment:
//   Same prerequisites as pnpm migrate:up — Cloud SQL Auth
//   Proxy running locally, ops profile credentials in .env.local.
//   WARNING: this hits a real Postgres instance. Always run
//   against a staging or ephemeral database, never prod.
//
// Safety:
//   - Every synthetic event is keyed `loadtest-<runId>-<i>` so
//     it is trivially distinguishable from real traffic.
//   - The script cleans up its events via a DELETE ... LIKE
//     pattern at the end, even on failure (finally block).
// ============================================================

import { randomUUID } from 'node:crypto'

import {
  applyGreenhousePostgresProfile,
  loadGreenhouseToolEnv,
  type PostgresProfile
} from './lib/load-greenhouse-tool-env'

interface ParsedArgs {
  events: number
  eventType: string
  mode: 'burst' | 'steady'
  batchSize: number
  maxIterations: number
  steadySeconds: number
  skipCleanup: boolean
}

const DEFAULT_EVENTS = 1_000
const DEFAULT_EVENT_TYPE = 'provider.tooling_snapshot.period_materialized'
const DEFAULT_BATCH_SIZE = 500
const DEFAULT_MAX_ITERATIONS = 200
const DEFAULT_STEADY_SECONDS = 60

const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = {
    events: DEFAULT_EVENTS,
    eventType: DEFAULT_EVENT_TYPE,
    mode: 'burst',
    batchSize: DEFAULT_BATCH_SIZE,
    maxIterations: DEFAULT_MAX_ITERATIONS,
    steadySeconds: DEFAULT_STEADY_SECONDS,
    skipCleanup: false
  }

  for (const raw of argv) {
    if (raw === '--burst') {
      args.mode = 'burst'
      continue
    }

    if (raw === '--steady') {
      args.mode = 'steady'
      continue
    }

    if (raw === '--skip-cleanup') {
      args.skipCleanup = true
      continue
    }

    if (raw.startsWith('--events=')) {
      const parsed = Number(raw.slice('--events='.length))

      if (Number.isFinite(parsed) && parsed > 0) {
        args.events = Math.floor(parsed)
      }

      continue
    }

    if (raw.startsWith('--event-type=')) {
      const value = raw.slice('--event-type='.length).trim()

      if (value) args.eventType = value

      continue
    }

    if (raw.startsWith('--batch-size=')) {
      const parsed = Number(raw.slice('--batch-size='.length))

      if (Number.isFinite(parsed) && parsed > 0) {
        args.batchSize = Math.floor(parsed)
      }

      continue
    }

    if (raw.startsWith('--max-iterations=')) {
      const parsed = Number(raw.slice('--max-iterations='.length))

      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxIterations = Math.floor(parsed)
      }

      continue
    }

    if (raw.startsWith('--steady-seconds=')) {
      const parsed = Number(raw.slice('--steady-seconds='.length))

      if (Number.isFinite(parsed) && parsed > 0) {
        args.steadySeconds = Math.floor(parsed)
      }

      continue
    }

    if (raw === '--help' || raw === '-h') {
      printUsage()
      process.exit(0)
    }
  }

  return args
}

const printUsage = (): void => {
  console.log(
    [
      'Usage: pnpm reactive:load-test [options]',
      '',
      'Options:',
      `  --events=<n>             Number of synthetic events to publish. Default ${DEFAULT_EVENTS}.`,
      `  --event-type=<name>      Outbox event_type to publish. Default ${DEFAULT_EVENT_TYPE}.`,
      '  --burst                  Publish all events at once (default).',
      '  --steady                 Publish evenly over --steady-seconds.',
      `  --steady-seconds=<n>     Duration of steady publish. Default ${DEFAULT_STEADY_SECONDS}.`,
      `  --batch-size=<n>         Consumer batch size. Default ${DEFAULT_BATCH_SIZE}.`,
      `  --max-iterations=<n>     Consumer drain safety cap. Default ${DEFAULT_MAX_ITERATIONS}.`,
      '  --skip-cleanup           Leave synthetic events in place (useful for debugging).',
      '  --help                   Print this message.'
    ].join('\n')
  )
}

const formatMs = (ms: number): string => {
  if (ms < 1_000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(2)}s`

  const minutes = Math.floor(ms / 60_000)
  const seconds = ((ms % 60_000) / 1_000).toFixed(1)

  return `${minutes}m${seconds}s`
}

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const rank = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)

  if (lower === upper) return sorted[lower]

  const weight = rank - lower

  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))

  loadGreenhouseToolEnv()

  const profile = (process.env.MIGRATE_PROFILE as PostgresProfile) || 'ops'

  console.log(`[load-test] Using postgres profile: ${profile}`)
  applyGreenhousePostgresProfile(profile)

  const { publishOutboxEvent } = await import('@/lib/sync/publish-event')
  const { processReactiveEvents } = await import('@/lib/sync/reactive-consumer')
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const runId = randomUUID().slice(0, 8)
  const eventIdPrefix = `loadtest-${runId}-`
  const periodId = `loadtest-${runId}`

  console.log(
    `[load-test] runId=${runId} events=${args.events} eventType=${args.eventType} mode=${args.mode}`
  )

  // Also mark the events with the prefix in aggregate_id so the cleanup
  // DELETE has a cheap predicate. The event_id is the canonical marker.
  const publishStartMs = Date.now()

  try {
    if (args.mode === 'burst') {
      for (let i = 0; i < args.events; i += 1) {
        await publishOutboxEvent({
          aggregateType: 'provider_tooling_snapshot',
          aggregateId: `${eventIdPrefix}${i}`,
          eventType: args.eventType,
          payload: {
            schemaVersion: 2,
            periodId,
            snapshotCount: 1,
            _loadTest: true,
            _runId: runId,
            _sequence: i
          }
        })
      }
    } else {
      // Steady state: publish evenly over --steady-seconds.
      const totalMs = args.steadySeconds * 1_000
      const intervalMs = totalMs / Math.max(1, args.events)

      for (let i = 0; i < args.events; i += 1) {
        const scheduledAt = publishStartMs + intervalMs * i
        const waitMs = scheduledAt - Date.now()

        if (waitMs > 0) {
          await new Promise(resolve => setTimeout(resolve, waitMs))
        }

        await publishOutboxEvent({
          aggregateType: 'provider_tooling_snapshot',
          aggregateId: `${eventIdPrefix}${i}`,
          eventType: args.eventType,
          payload: {
            schemaVersion: 2,
            periodId,
            snapshotCount: 1,
            _loadTest: true,
            _runId: runId,
            _sequence: i
          }
        })
      }
    }

    const publishDurationMs = Date.now() - publishStartMs

    console.log(
      `[load-test] Published ${args.events} events in ${formatMs(publishDurationMs)} (${(args.events / (publishDurationMs / 1_000)).toFixed(2)} evt/sec)`
    )

    // ── Mark them published so the consumer picks them up ────────
    // publishOutboxEvent defaults to status='pending'; the reactive
    // consumer only reads status='published'. We fast-forward with
    // a single UPDATE scoped by our prefix.
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_sync.outbox_events
         SET status = 'published', published_at = CURRENT_TIMESTAMP
       WHERE aggregate_id LIKE $1
         AND event_type = $2`,
      [`${eventIdPrefix}%`, args.eventType]
    )

    // ── Drain phase ───────────────────────────────────────────────
    const drainStartMs = Date.now()
    const perScopeLatenciesMs: Record<string, number[]> = {}

    let totalAcknowledged = 0
    let totalScopes = 0
    let iterations = 0

    while (iterations < args.maxIterations) {
      iterations += 1

      const result = await processReactiveEvents({ batchSize: args.batchSize })

      totalAcknowledged += result.eventsAcknowledged
      totalScopes += result.scopesCoalesced

      for (const [projectionName, stats] of Object.entries(result.perProjection)) {
        if (stats.scopesCoalesced === 0) continue

        const avgLatency = stats.totalLatencyMs / Math.max(1, stats.scopesCoalesced)

        if (!perScopeLatenciesMs[projectionName]) perScopeLatenciesMs[projectionName] = []

        for (let s = 0; s < stats.scopesCoalesced; s += 1) {
          perScopeLatenciesMs[projectionName].push(avgLatency)
        }
      }

      console.log(
        `[load-test] drain iter=${iterations} fetched=${result.eventsFetched} acked=${result.eventsAcknowledged} scopes=${result.scopesCoalesced} failed=${result.scopeGroupsFailed} breakerSkips=${result.scopeGroupsBreakerSkipped}`
      )

      if (result.eventsFetched === 0) {
        console.log('[load-test] Queue drained.')
        break
      }
    }

    const drainDurationMs = Date.now() - drainStartMs

    const throughput =
      drainDurationMs > 0 ? totalAcknowledged / (drainDurationMs / 1_000) : 0

    // ── Report ────────────────────────────────────────────────────
    console.log('')
    console.log('[load-test] ─────────────────────── Summary ───────────────────────')
    console.log(`[load-test] Run ID .................... ${runId}`)
    console.log(`[load-test] Events published .......... ${args.events}`)
    console.log(`[load-test] Publish mode .............. ${args.mode}`)
    console.log(`[load-test] Publish duration .......... ${formatMs(publishDurationMs)}`)
    console.log(`[load-test] Drain iterations .......... ${iterations}`)
    console.log(`[load-test] Events acknowledged ....... ${totalAcknowledged}`)
    console.log(`[load-test] Scopes coalesced .......... ${totalScopes}`)
    console.log(`[load-test] Drain duration ............ ${formatMs(drainDurationMs)}`)
    console.log(`[load-test] Throughput ................ ${throughput.toFixed(2)} evt/sec`)

    if (Object.keys(perScopeLatenciesMs).length > 0) {
      console.log('[load-test] Per-projection scope latency:')

      for (const [projectionName, latencies] of Object.entries(perScopeLatenciesMs)) {
        const p50 = percentile(latencies, 50)
        const p95 = percentile(latencies, 95)

        console.log(
          `[load-test]   - ${projectionName}: scopes=${latencies.length} p50=${formatMs(p50)} p95=${formatMs(p95)}`
        )
      }
    }

    if (iterations >= args.maxIterations && totalAcknowledged < args.events) {
      console.warn(
        `[load-test] WARNING: hit maxIterations=${args.maxIterations} without draining fully (${totalAcknowledged}/${args.events} acknowledged).`
      )
    }
  } finally {
    if (!args.skipCleanup) {
      console.log('')
      console.log('[load-test] Cleaning up synthetic events...')

      const deleted = await runGreenhousePostgresQuery<{ count: string }>(
        `WITH d AS (
           DELETE FROM greenhouse_sync.outbox_events
            WHERE aggregate_id LIKE $1
           RETURNING 1
         )
         SELECT COUNT(*)::text AS count FROM d`,
        [`${eventIdPrefix}%`]
      )

      const deletedLog = await runGreenhousePostgresQuery<{ count: string }>(
        `WITH d AS (
           DELETE FROM greenhouse_sync.outbox_reactive_log
            WHERE event_id IN (
              SELECT event_id FROM greenhouse_sync.outbox_events
               WHERE aggregate_id LIKE $1
            )
           RETURNING 1
         )
         SELECT COUNT(*)::text AS count FROM d`,
        [`${eventIdPrefix}%`]
      )

      console.log(
        `[load-test] Deleted ${deleted[0]?.count ?? 0} outbox events, ${deletedLog[0]?.count ?? 0} reactive log entries.`
      )
    } else {
      console.log('[load-test] Skipping cleanup (--skip-cleanup set).')
    }
  }

  process.exit(0)
}

main().catch(error => {
  console.error('[load-test] Unhandled error:', error)
  process.exit(1)
})
