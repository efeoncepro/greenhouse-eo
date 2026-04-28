#!/usr/bin/env tsx
/**
 * TASK-708b — Backfill retroactivo de cohortes A/B a external_cash_signals.
 * ==========================================================================
 *
 * Idempotente vía UNIQUE (source_system, source_event_id) en
 * `external_cash_signals`. Re-run safe.
 *
 * Uso:
 *   pnpm finance:task708b-backfill-signals             # dry-run (default)
 *   pnpm finance:task708b-backfill-signals --apply     # ejecuta
 *   pnpm finance:task708b-backfill-signals --apply --cohort A
 *   pnpm finance:task708b-backfill-signals --apply --cohort B
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import {
  backfillCohortAToSignals,
  backfillCohortBToSignals
} from '@/lib/finance/external-cash-signals'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const cohortIdx = args.indexOf('--cohort')
  const cohortFilter = cohortIdx >= 0 ? args[cohortIdx + 1]?.toUpperCase() : null

  const dryRun = !apply

  console.log(`[t708b:backfill] mode=${dryRun ? 'DRY-RUN' : 'APPLY'} cohort=${cohortFilter ?? 'ALL'}`)

  const runA = !cohortFilter || cohortFilter === 'A'
  const runB = !cohortFilter || cohortFilter === 'B'

  if (runA) {
    const result = await backfillCohortAToSignals({ dryRun })

    console.log(`[t708b:backfill:A] inspected=${result.inspected} created=${result.signalsCreated} alreadyExisted=${result.signalsAlreadyExisted} errors=${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log(`[t708b:backfill:A] first error:`, result.errors[0])
    }
  }

  if (runB) {
    const result = await backfillCohortBToSignals({ dryRun })

    console.log(`[t708b:backfill:B] inspected=${result.inspected} created=${result.signalsCreated} alreadyExisted=${result.signalsAlreadyExisted} errors=${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log(`[t708b:backfill:B] first error:`, result.errors[0])
    }
  }

  if (dryRun) {
    console.log('[t708b:backfill] DRY-RUN: no changes were applied. Re-run with --apply to materialize.')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[t708b:backfill] error:', error?.message ?? error)
    process.exit(1)
  })
