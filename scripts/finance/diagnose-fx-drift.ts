#!/usr/bin/env tsx
/**
 * Operator tool — list account_balances FX drift using the canonical
 * TASK-842 reader/planner. Non-destructive: SELECT + remediation plan only.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/diagnose-fx-drift.ts
 */
import { config } from 'dotenv'

import { closeGreenhousePostgres } from '@/lib/db'
import { planAccountBalancesFxDriftRemediation } from '@/lib/finance/account-balances-fx-drift-remediation'

config({ path: '.env.local' })

const parseArg = (name: string) => {
  const raw = process.argv.slice(2).find(arg => arg.startsWith(`--${name}=`))

  return raw?.split('=').slice(1).join('=').trim()
}

const parseNumberArg = (name: string) => {
  const raw = parseArg(name)
  const parsed = raw ? Number(raw) : undefined

  return Number.isFinite(parsed) ? parsed : undefined
}

const main = async () => {
  console.log('\n--- account_balances FX drift detail (ultimos 90 dias) ---\n')

  const plan = await planAccountBalancesFxDriftRemediation({
    policy: 'detect_only',
    dryRun: true,
    accountId: parseArg('account-id'),
    fromDate: parseArg('from-date'),
    toDate: parseArg('to-date'),
    windowDays: parseNumberArg('window-days'),
    maxRows: parseNumberArg('max-rows') ?? 100
  })

  if (plan.decisions.length === 0) {
    console.log('OK: Sin drift detectado. Steady state.')

    return
  }

  console.log(`${plan.decisions.length} account_balance${plan.decisions.length === 1 ? '' : 's'} con drift activo:\n`)

  for (const decision of plan.decisions) {
    const evidence = decision.evidence as Record<string, unknown>

    console.log(`  account: ${decision.accountId} (${decision.accountName})`)
    console.log(`  date:    ${decision.balanceDate}`)
    console.log(`  decision: ${decision.decision}`)
    console.log(`  reason:   ${decision.reason}`)
    console.log(`  persisted: in=${String(evidence.persistedInflowsClp)} out=${String(evidence.persistedOutflowsClp)} closing=${String(evidence.persistedClosingBalanceClp)}`)
    console.log(`  expected:  in=${String(evidence.expectedInflowsClp)} out=${String(evidence.expectedOutflowsClp)} closing=${String(evidence.expectedClosingBalanceClp)}`)
    console.log(`  drift_clp: ${decision.driftClp}`)
    console.log(`  recovery:  pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/backfill-account-balances-fx-fix.ts --account-id=${decision.accountId} --from-date=${decision.balanceDate} --apply`)
    console.log('')
  }

  if (plan.overflow.rows || plan.overflow.accounts) {
    console.log('WARN: El plan excede limites bounded. Usa filtros o aumenta limites explicitamente.')
  }
}

main()
  .catch(error => {
    console.error('error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => undefined)
  })
