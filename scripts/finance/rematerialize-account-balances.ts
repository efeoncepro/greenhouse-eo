#!/usr/bin/env tsx
/**
 * CLI — Rematerialize account_balances from a known opening (TASK-702).
 *
 * Uso típico:
 *
 *   pnpm finance:rematerialize-balances \
 *     --account santander-clp --opening 5703909 --seed-date 2026-02-28
 *
 *   pnpm finance:rematerialize-balances --all --as-of 2026-04-27
 *
 * Por defecto (--all sin overrides) usa los openings derivados de cartola al
 * 28/02/2026:
 *   santander-clp        $5.703.909
 *   santander-usd-usd    USD 2.591,94
 *   global66             $380
 *   santander-corp-clp   $268.442 deuda  (seed 2026-04-05 — TC arranca 06/04
 *                                         con saldo inicial visible en cartola)
 *
 * Idempotente: re-correr produce los mismos snapshots dado el mismo ledger.
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { rematerializeAccountBalanceRange, getCurrentAccountBalances } from '@/lib/finance/account-balances-rematerialize'

interface AccountSeed {
  accountId: string
  seedDate: string
  openingBalance: number
}

const DEFAULT_SEEDS: AccountSeed[] = [
  { accountId: 'santander-clp',           seedDate: '2026-02-28', openingBalance: 5703909 },
  { accountId: 'santander-usd-usd',       seedDate: '2026-02-28', openingBalance: 2591.94 },
  { accountId: 'global66-clp',            seedDate: '2026-02-28', openingBalance: 380 },
  { accountId: 'santander-corp-clp',      seedDate: '2026-04-05', openingBalance: 268442 },
  { accountId: 'sha-cca-julio-reyes-clp', seedDate: '2026-02-28', openingBalance: 0 }
]

interface CliArgs {
  all: boolean
  account: string | null
  opening: number | null
  seedDate: string | null
  endDate: string | null
}

const parseArgs = (): CliArgs => {
  const args: CliArgs = {
    all: false,
    account: null,
    opening: null,
    seedDate: null,
    endDate: null
  }

  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]

    if (a === '--all') args.all = true
    else if (a === '--account') args.account = argv[++i] ?? null
    else if (a === '--opening') args.opening = parseFloat(argv[++i] ?? '')
    else if (a === '--seed-date') args.seedDate = argv[++i] ?? null
    else if (a === '--as-of' || a === '--end-date') args.endDate = argv[++i] ?? null
    else if (a === '--help' || a === '-h') {
      console.log('Usage: tsx scripts/finance/rematerialize-account-balances.ts (--all | --account <id> --opening <n> --seed-date YYYY-MM-DD) [--as-of YYYY-MM-DD]')
      process.exit(0)
    }
  }

  if (!args.all && !args.account) {
    console.error('Specify --all or --account <id>.')
    process.exit(1)
  }

  return args
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()

  const seeds: AccountSeed[] = args.all
    ? DEFAULT_SEEDS
    : [{
        accountId: args.account as string,
        seedDate: args.seedDate ?? '2026-02-28',
        openingBalance: args.opening ?? 0
      }]

  const endDate = args.endDate ?? new Date().toISOString().slice(0, 10)

  console.log(`[rematerialize] target endDate=${endDate}`)
  console.log(`[rematerialize] accounts: ${seeds.map(s => s.accountId).join(', ')}\n`)

  for (const seed of seeds) {
    console.log(`[rematerialize] ${seed.accountId}: seed ${seed.seedDate} = ${seed.openingBalance}`)

    try {
      const result = await rematerializeAccountBalanceRange({
        accountId: seed.accountId,
        seedDate: seed.seedDate,
        openingBalance: seed.openingBalance,
        endDate
      })

      console.log(
        `[rematerialize] ${seed.accountId}: closing ${result.endDate} = ${result.finalClosingBalance.toFixed(2)} ` +
          `(materialized ${result.daysMaterialized} days, skipped ${result.closedDaysSkipped} closed)`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      console.error(`[rematerialize] ${seed.accountId} FAILED: ${message}`)
      process.exitCode = 1
    }
  }

  console.log('\n[rematerialize] Final state:')
  const balances = await getCurrentAccountBalances(endDate)

  console.table(
    balances.map(b => ({
      account_id: b.account_id,
      bank_name: b.bank_name,
      currency: b.currency,
      balance_date: b.balance_date,
      closing: b.closing_balance,
      closed: b.is_period_closed
    }))
  )
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
