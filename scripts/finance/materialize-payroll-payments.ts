#!/usr/bin/env tsx
/**
 * Materialize payroll payments for a closed period (TASK-702 PR-C CLI).
 *
 * Idempotente. Por cada `payroll_entries` activa del período, crea un
 * `expense_payment` anclado a `payroll_entry_id` + `member_id` +
 * `payroll_period_id`. Dispara outbox event para que cost_attribution +
 * client_economics se re-materialicen.
 *
 * Uso:
 *   pnpm payroll:materialize-payments \
 *     --period 202603 --account santander-clp --date 2026-04-15
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { materializePayrollPaymentsFromPeriod } from '@/lib/payroll/materialize-payments-from-period'

interface CliArgs {
  periodId: string | null
  accountId: string | null
  paymentDate: string | null
}

const parseArgs = (): CliArgs => {
  const a: CliArgs = { periodId: null, accountId: null, paymentDate: null }
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--period') a.periodId = argv[++i]
    else if (argv[i] === '--account') a.accountId = argv[++i]
    else if (argv[i] === '--date') a.paymentDate = argv[++i]
  }

  if (!a.periodId || !a.accountId || !a.paymentDate) {
    console.error('Usage: pnpm payroll:materialize-payments --period <periodId> --account <accountId> --date YYYY-MM-DD')
    process.exit(1)
  }

  return a
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()

  console.log(`[payroll:materialize] period=${args.periodId} account=${args.accountId} date=${args.paymentDate}`)

  const result = await materializePayrollPaymentsFromPeriod({
    periodId: args.periodId as string,
    paymentAccountId: args.accountId as string,
    paymentDate: args.paymentDate as string,
    actorUserId: 'task-702-pr-c'
  })

  console.log('[payroll:materialize] result:')
  console.table([result])
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
