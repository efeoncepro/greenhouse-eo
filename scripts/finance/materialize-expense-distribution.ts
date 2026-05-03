#!/usr/bin/env tsx
/**
 * TASK-777 — materialize canonical expense distribution for one period.
 *
 * Uso:
 *   pnpm finance:materialize-expense-distribution --period 202604
 *   pnpm finance:materialize-expense-distribution --year 2026 --month 4
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { materializeExpenseDistributionPeriod } from '@/lib/finance/expense-distribution/materialize-period'

interface CliArgs {
  year: number | null
  month: number | null
}

const parseArgs = (): CliArgs => {
  const args: CliArgs = { year: null, month: null }
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--period') {
      const period = argv[++i] ?? ''
      const match = period.match(/^(\d{4})(\d{2})$/)

      if (match) {
        args.year = Number(match[1])
        args.month = Number(match[2])
      }
    } else if (arg === '--year') {
      args.year = Number(argv[++i])
    } else if (arg === '--month') {
      args.month = Number(argv[++i])
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: pnpm finance:materialize-expense-distribution --period YYYYMM')
      process.exit(0)
    }
  }

  if (!args.year || !args.month || args.month < 1 || args.month > 12) {
    console.error('Usage: pnpm finance:materialize-expense-distribution --period YYYYMM')
    process.exit(1)
  }

  return args
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()

  console.log(`[expense-distribution] materializing ${args.year}-${String(args.month).padStart(2, '0')}`)

  const result = await materializeExpenseDistributionPeriod({
    year: args.year as number,
    month: args.month as number
  })

  console.table([result])
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
