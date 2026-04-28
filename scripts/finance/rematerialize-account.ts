#!/usr/bin/env tsx
/**
 * Force re-materialization of account_balances rows for a single account
 * from a given date forward. Used after declaring a new OTB to rebuild
 * the chain cleanly from the anchor.
 *
 * Usage:
 *   pnpm tsx scripts/finance/rematerialize-account.ts <accountId> [fromDate] [toDate]
 *
 * Defaults:
 *   fromDate = active OTB.genesisDate (or accounts.opening_balance_date)
 *   toDate   = today (Santiago tz)
 *
 * The materializer with `force=true` overwrites any existing non-period-closed
 * rows. Period-closed rows (signed off accounting periods) are skipped.
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { rematerializeAccountBalancesFromDate } from '@/lib/finance/account-balances'
import { getActiveOpeningTrialBalance } from '@/lib/finance/account-opening-trial-balance'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const [accountId, fromArg, toArg] = process.argv.slice(2)

  if (!accountId) {
    console.error('Usage: rematerialize-account.ts <accountId> [fromDate] [toDate]')
    process.exit(1)
  }

  const otb = await getActiveOpeningTrialBalance(accountId)
  const today = new Date().toISOString().slice(0, 10)
  const fromDate = fromArg ?? otb?.genesisDate ?? today
  const toDate = toArg ?? today

  console.log(`[rematerialize] account=${accountId} from=${fromDate} to=${toDate} otb=${otb?.obtbId ?? 'none'}`)

  // First, delete any existing rows in the range (force=true overwrites but
  // doesn't delete; we want a clean slate from the anchor).
  const deleted = await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_finance.account_balances
     WHERE account_id = $1
       AND balance_date >= $2::date
       AND balance_date <= $3::date
       AND is_period_closed = FALSE
     RETURNING balance_date::text`,
    [accountId, fromDate, toDate]
  )

  console.log(`[rematerialize] cleared ${deleted.length} stale rows`)

  await rematerializeAccountBalancesFromDate({
    accountId,
    fromDate,
    toDate,
    force: true
  })

  // Verify
  const verify = await runGreenhousePostgresQuery<{
    earliest: string
    latest: string
    cnt: string
    last_closing: string
  }>(
    `SELECT
       MIN(balance_date)::text AS earliest,
       MAX(balance_date)::text AS latest,
       COUNT(*)::text AS cnt,
       (SELECT closing_balance::text FROM greenhouse_finance.account_balances WHERE account_id = $1 ORDER BY balance_date DESC LIMIT 1) AS last_closing
     FROM greenhouse_finance.account_balances
     WHERE account_id = $1`,
    [accountId]
  )

  console.log(`[rematerialize] DONE — rows=${verify[0]?.cnt} earliest=${verify[0]?.earliest} latest=${verify[0]?.latest} latest_closing=${verify[0]?.last_closing}`)
}

main().catch(err => {
  console.error('[rematerialize] FAILED:', err.message)
  console.error(err.stack)
  process.exit(1)
})
