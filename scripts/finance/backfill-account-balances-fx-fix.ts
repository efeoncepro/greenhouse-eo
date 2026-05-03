#!/usr/bin/env tsx
/**
 * TASK-774 Slice 5 — Backfill rematerializacion account_balances post-fix FX.
 *
 * Recovery del bug detectado 2026-05-03 (Figma EXP-202604-008):
 * `materializeAccountBalance` sumaba `payment.amount` (currency original) en
 * lugar de `payment.amount_clp` (FX-resolved) cuando el payment esta en moneda
 * extranjera y la cuenta es CLP. Caso real: balance Santander Corp post-pago
 * Figma USD $92.9 mostraba +$92.9 en lugar de +$83,773.5 (delta $83,680).
 *
 * Slice 2 corrigio el path canonico (consume VIEWs TASK-766
 * `expense_payments_normalized` + `income_payments_normalized` + COALESCE
 * inline para `settlement_legs.amount_clp`). Pero los `account_balances` ya
 * materializados con el bug NO se auto-corrigen — necesitan rematerializacion
 * explicita.
 *
 * **El cron diario `ops-finance-rematerialize-balances`** ya rematerializa los
 * ultimos 7 dias automaticamente. Este script SOLO se necesita para:
 *   1. Histórico mas alla de 7 dias (caso Figma 2026-05-03 va en ventana
 *      pero futuros casos podrian estar fuera).
 *   2. Verificación manual de cuentas especificas que el reliability signal
 *      `finance.account_balances.fx_drift` reporte > 0.
 *
 * Idempotente: `rematerializeAccountBalanceRange` con `seedMode='active_otb'`
 * usa OTB canonico TASK-703 como anchor; recompute desde transactions ledger
 * actualizado. Re-correr el script es safe.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/backfill-account-balances-fx-fix.ts \
 *     --account-id=santander-corp-clp \
 *     --from-date=2026-04-01 \
 *     [--to-date=2026-05-03] \
 *     [--dry-run]
 *
 * Para identificar accounts afectados, primero consultar el reliability signal:
 *   pnpm staging:request '/api/admin/reliability' | grep account_balances
 */

import process from 'node:process'

import { rematerializeAccountBalanceRange } from '@/lib/finance/account-balances-rematerialize'

interface CliOptions {
  accountId: string
  fromDate: string
  toDate?: string
  dryRun: boolean
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const accountIdArg = args.find(a => a.startsWith('--account-id='))
  const fromDateArg = args.find(a => a.startsWith('--from-date='))
  const toDateArg = args.find(a => a.startsWith('--to-date='))

  if (!accountIdArg) {
    console.error('ERROR: --account-id=<id> es requerido')
    console.error('  Ejemplo: --account-id=santander-corp-clp')
    process.exit(1)
  }

  if (!fromDateArg) {
    console.error('ERROR: --from-date=YYYY-MM-DD es requerido (anchor para rematerialización)')
    process.exit(1)
  }

  const accountId = accountIdArg.split('=')[1].trim()
  const fromDate = fromDateArg.split('=')[1].trim()
  const toDate = toDateArg?.split('=')[1].trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    console.error(`ERROR: --from-date debe ser YYYY-MM-DD, recibido: ${fromDate}`)
    process.exit(1)
  }

  if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    console.error(`ERROR: --to-date debe ser YYYY-MM-DD, recibido: ${toDate}`)
    process.exit(1)
  }

  return { accountId, fromDate, toDate, dryRun }
}

const main = async () => {
  const opts = parseArgs()

  console.log('─── TASK-774 Slice 5 — backfill account_balances FX fix ───')
  console.log(`  account_id:  ${opts.accountId}`)
  console.log(`  from_date:   ${opts.fromDate}`)
  console.log(`  to_date:     ${opts.toDate ?? 'today'}`)
  console.log(`  mode:        ${opts.dryRun ? 'DRY-RUN (no writes)' : 'LIVE (rematerializa account_balances)'}`)
  console.log('')

  if (opts.dryRun) {
    console.log('Dry-run: NO se ejecuta rematerializeAccountBalanceRange.')
    console.log('Para ejecutar live, re-correr sin --dry-run.')
    process.exit(0)
  }

  const startMs = Date.now()

  try {
    const result = await rematerializeAccountBalanceRange({
      accountId: opts.accountId,
      seedDate: opts.fromDate,
      openingBalance: 0,
      endDate: opts.toDate,
      seedMode: 'active_otb'
    })

    const durationMs = Date.now() - startMs

    console.log('✓ Rematerializacion completa')
    console.log(`  daysMaterialized:     ${result.daysMaterialized}`)
    console.log(`  closedDaysSkipped:    ${result.closedDaysSkipped}`)
    console.log(`  finalClosingBalance:  ${result.finalClosingBalance}`)
    console.log(`  duration:             ${durationMs}ms`)
    console.log('')
    console.log('Verificar finance.account_balances.fx_drift signal post-deploy:')
    console.log('  pnpm staging:request /api/admin/reliability')
  } catch (error) {
    console.error('✗ Backfill fallo:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
