#!/usr/bin/env tsx
// ============================================================
// Greenhouse — Reactive Backlog Backfill (TASK-379 Slice 5)
// ============================================================
// Drains the historical reactive backlog by invoking the V2
// consumer (`processReactiveEvents`) in a controlled loop.
//
// The V2 consumer already handles scope coalescing, circuit
// breaker integration, and the silent-skip elimination from
// ISSUE-046. This script simply exercises it iteratively so
// operators can drain a large backlog in one session with
// clear progress reporting.
//
// Usage:
//   pnpm reactive:backfill                         # full drain
//   pnpm reactive:backfill --dry-run               # one small iteration
//   pnpm reactive:backfill --domain=finance        # one domain only
//   pnpm reactive:backfill --max-iterations=20     # safety brake
//
// Environment:
//   Reads from .env.local via loadGreenhouseToolEnv() and uses
//   the 'ops' profile (canonical owner). Same prerequisites as
//   `pnpm migrate:up`: Cloud SQL Auth Proxy running locally on
//   port 15432 with GREENHOUSE_POSTGRES_HOST=127.0.0.1.
//
// This is an operator tool — it logs to stdout, does not emit
// Sentry events, does not record custom metrics. For routine
// drain work, rely on the Cloud Scheduler jobs hitting the
// ops-worker instead.
// ============================================================

import { createRequire } from 'node:module'

// Bypass the `server-only` runtime guard so this script can import the V2
// consumer (which lives behind `import 'server-only'`) under tsx. Same
// pattern used by the other backfill scripts in this directory.
const _require = createRequire(import.meta.url)
const _moduleCache = (_require('module') as { _cache: Record<string, unknown> })._cache

_moduleCache[_require.resolve('server-only')] = {
  id: 'server-only',
  exports: {},
  loaded: true
}

import {
  applyGreenhousePostgresProfile,
  loadGreenhouseToolEnv,
  type PostgresProfile
} from './lib/load-greenhouse-tool-env'

interface ParsedArgs {
  dryRun: boolean
  domain: string | null
  maxIterations: number
  batchSize: number
}

const DEFAULT_BATCH_SIZE = 1_000
const DEFAULT_DRY_RUN_BATCH_SIZE = 50
const DEFAULT_MAX_ITERATIONS = 100

const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = {
    dryRun: false,
    domain: null,
    maxIterations: DEFAULT_MAX_ITERATIONS,
    batchSize: DEFAULT_BATCH_SIZE
  }

  for (const raw of argv) {
    if (raw === '--dry-run') {
      args.dryRun = true
      args.batchSize = DEFAULT_DRY_RUN_BATCH_SIZE

      continue
    }

    if (raw.startsWith('--domain=')) {
      const value = raw.slice('--domain='.length).trim()

      args.domain = value.length > 0 ? value : null

      continue
    }

    if (raw.startsWith('--max-iterations=')) {
      const parsed = Number(raw.slice('--max-iterations='.length))

      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxIterations = Math.floor(parsed)
      }

      continue
    }

    if (raw.startsWith('--batch-size=')) {
      const parsed = Number(raw.slice('--batch-size='.length))

      if (Number.isFinite(parsed) && parsed > 0) {
        args.batchSize = Math.floor(parsed)
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
  const usage = [
    'Usage: pnpm reactive:backfill [options]',
    '',
    'Options:',
    '  --dry-run                Run a single iteration with a small batch (50) and exit.',
    '  --domain=<name>          Restrict drain to one projection domain.',
    '                           One of: organization|people|finance|notifications|delivery|cost_intelligence',
    '  --max-iterations=<n>     Safety cap on iterations. Default 100.',
    `  --batch-size=<n>         Override batch size. Default ${DEFAULT_BATCH_SIZE}.`,
    '  --help                   Print this message.'
  ].join('\n')

  console.log(usage)
}

const formatMs = (ms: number): string => {
  if (ms < 1_000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(2)}s`

  const minutes = Math.floor(ms / 60_000)
  const seconds = ((ms % 60_000) / 1_000).toFixed(1)

  return `${minutes}m${seconds}s`
}

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))

  // ── Bootstrap env/profile BEFORE importing runtime code so the
  // postgres client picks up the ops profile on first touch.
  loadGreenhouseToolEnv()

  const profile = (process.env.MIGRATE_PROFILE as PostgresProfile) || 'ops'

  console.log(`[backfill] Using postgres profile: ${profile}`)
  applyGreenhousePostgresProfile(profile)

  // Dynamic import so env is applied first.
  const { processReactiveEvents } = await import('@/lib/sync/reactive-consumer')
  const registry = await import('@/lib/sync/projection-registry')
  const { PROJECTION_DOMAINS } = registry

  type ProjectionDomain = (typeof registry.PROJECTION_DOMAINS)[number]

  const domain: ProjectionDomain | undefined = (() => {
    if (!args.domain) return undefined

    const match = (PROJECTION_DOMAINS as readonly string[]).find(d => d === args.domain)

    if (!match) {
      console.error(`[backfill] Unknown domain "${args.domain}". Expected one of: ${PROJECTION_DOMAINS.join(', ')}`)
      process.exit(1)
    }

    return match as ProjectionDomain
  })()

  console.log(
    `[backfill] Starting drain${domain ? ` (domain=${domain})` : ''}${args.dryRun ? ' [DRY RUN]' : ''}`
  )
  console.log(
    `[backfill] batchSize=${args.batchSize} maxIterations=${args.maxIterations}`
  )

  const runStartMs = Date.now()
  const maxIterations = args.dryRun ? 1 : args.maxIterations

  let iteration = 0
  let totalEventsFetched = 0
  let totalEventsAcknowledged = 0
  let totalScopesCoalesced = 0
  let totalProjectionsTriggered = 0
  let totalScopeGroupsFailed = 0
  let totalScopeGroupsBreakerSkipped = 0

  while (iteration < maxIterations) {
    iteration += 1
    const iterStartMs = Date.now()

    let result

    try {
      result = await processReactiveEvents({
        batchSize: args.batchSize,
        domain
      })
    } catch (error) {
      console.error(`[backfill] iter=${iteration} FAILED:`, error)
      process.exit(1)
    }

    const elapsed = Date.now() - iterStartMs

    totalEventsFetched += result.eventsFetched
    totalEventsAcknowledged += result.eventsAcknowledged
    totalScopesCoalesced += result.scopesCoalesced
    totalProjectionsTriggered += result.projectionsTriggered
    totalScopeGroupsFailed += result.scopeGroupsFailed
    totalScopeGroupsBreakerSkipped += result.scopeGroupsBreakerSkipped

    console.log(
      [
        `[backfill] iter=${iteration}`,
        `eventsFetched=${result.eventsFetched}`,
        `eventsAcknowledged=${result.eventsAcknowledged}`,
        `scopesCoalesced=${result.scopesCoalesced}`,
        `projectionsTriggered=${result.projectionsTriggered}`,
        `scopeGroupsFailed=${result.scopeGroupsFailed}`,
        `breakerSkipped=${result.scopeGroupsBreakerSkipped}`,
        `elapsed=${formatMs(elapsed)}`
      ].join(' ')
    )

    // Surface per-projection stats when something meaningful happened.
    const perProjectionNames = Object.keys(result.perProjection)

    if (perProjectionNames.length > 0 && result.scopesCoalesced > 0) {
      for (const name of perProjectionNames) {
        const stats = result.perProjection[name]

        console.log(
          `[backfill]   - ${name}: scopes=${stats.scopesCoalesced} events=${stats.eventsAcknowledged} ok=${stats.successes} fail=${stats.failures} breakerSkips=${stats.breakerSkips}`
        )
      }
    }

    if (result.eventsFetched === 0) {
      console.log('[backfill] Backlog drained — no more events to fetch.')
      break
    }

    if (args.dryRun) {
      console.log('[backfill] Dry run complete — stopping after 1 iteration.')
      break
    }
  }

  const totalElapsedMs = Date.now() - runStartMs

  const throughput =
    totalElapsedMs > 0 ? (totalEventsAcknowledged / (totalElapsedMs / 1_000)).toFixed(2) : '0.00'

  console.log('')
  console.log('[backfill] ─────────────────────── Summary ───────────────────────')
  console.log(`[backfill] Iterations ................ ${iteration}`)
  console.log(`[backfill] Total events fetched ...... ${totalEventsFetched}`)
  console.log(`[backfill] Total events acknowledged . ${totalEventsAcknowledged}`)
  console.log(`[backfill] Total scopes coalesced .... ${totalScopesCoalesced}`)
  console.log(`[backfill] Projections triggered ..... ${totalProjectionsTriggered}`)
  console.log(`[backfill] Scope groups failed ....... ${totalScopeGroupsFailed}`)
  console.log(`[backfill] Breaker-skipped groups .... ${totalScopeGroupsBreakerSkipped}`)
  console.log(`[backfill] Elapsed ................... ${formatMs(totalElapsedMs)}`)
  console.log(`[backfill] Throughput ................ ${throughput} events/sec`)

  if (iteration >= maxIterations && !args.dryRun) {
    console.warn(
      `[backfill] Reached max-iterations=${maxIterations} safety brake. Run again to continue draining.`
    )
  }

  process.exit(0)
}

main().catch(error => {
  console.error('[backfill] Unhandled error:', error)
  process.exit(1)
})
