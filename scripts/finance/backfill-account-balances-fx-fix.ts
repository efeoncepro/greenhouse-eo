#!/usr/bin/env tsx
/**
 * TASK-842 — Thin wrapper over the canonical account_balances FX drift
 * remediation command.
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
 * Idempotente: usa el mismo planner/executor que ops-worker y registra cada
 * intento en `greenhouse_sync.source_sync_runs`.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/backfill-account-balances-fx-fix.ts \
 *     --account-id=santander-corp-clp \
 *     --from-date=2026-04-01 \
 *     [--to-date=2026-05-03] \
 *     [--dry-run | --apply]
 *
 * Para identificar accounts afectados, primero consultar el reliability signal:
 *   pnpm staging:request '/api/admin/reliability' | grep account_balances
 */

import process from 'node:process'

import { closeGreenhousePostgres } from '@/lib/db'
import {
  remediateAccountBalancesFxDrift,
  type FxDriftRemediationPolicy
} from '@/lib/finance/account-balances-fx-drift-remediation'

interface CliOptions {
  accountId: string
  fromDate: string
  toDate?: string
  dryRun: boolean
  json: boolean
  policy: FxDriftRemediationPolicy
  maxRows?: number
  maxAccounts?: number
  maxAbsDriftClp?: string
  evidenceGuard: 'block_on_reconciled_drift' | 'warn_only' | 'off'
}

const parseValue = (args: string[], name: string) => {
  const raw = args.find(a => a.startsWith(`--${name}=`))

  return raw?.split('=').slice(1).join('=').trim()
}

const parseNumberValue = (args: string[], name: string) => {
  const raw = parseValue(args, name)
  const parsed = raw ? Number(raw) : undefined

  return Number.isFinite(parsed) ? parsed : undefined
}

const parsePolicy = (raw: string | undefined, evidenceGuard: CliOptions['evidenceGuard']): FxDriftRemediationPolicy => {
  if (
    raw === 'detect_only' ||
    raw === 'auto_open_periods' ||
    raw === 'known_bug_class_restatement' ||
    raw === 'strict_no_restatement'
  ) {
    return raw
  }

  return evidenceGuard === 'warn_only' ? 'known_bug_class_restatement' : 'auto_open_periods'
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || !args.includes('--apply')
  const json = args.includes('--json')

  const accountId = parseValue(args, 'account-id')
  const fromDate = parseValue(args, 'from-date')
  const toDate = parseValue(args, 'to-date')
  const evidenceGuardRaw = parseValue(args, 'evidence-guard') ?? 'block_on_reconciled_drift'

  if (!accountId) {
    console.error('ERROR: --account-id=<id> es requerido')
    console.error('  Ejemplo: --account-id=santander-corp-clp')
    process.exit(1)
  }

  if (!fromDate) {
    console.error('ERROR: --from-date=YYYY-MM-DD es requerido (anchor para rematerialización)')
    process.exit(1)
  }

  if (!['block_on_reconciled_drift', 'warn_only', 'off'].includes(evidenceGuardRaw)) {
    console.error(`ERROR: --evidence-guard debe ser 'block_on_reconciled_drift'|'warn_only'|'off', recibido: ${evidenceGuardRaw}`)
    console.error('  Default: block_on_reconciled_drift (canónico, respeta snapshots reconciliation aceptados).')
    console.error('  Use warn_only/off SOLO en recovery one-time post-bug-fix donde el snapshot quedo obsoleto.')
    process.exit(1)
  }

  const evidenceGuard = evidenceGuardRaw as CliOptions['evidenceGuard']

  if (evidenceGuard === 'off') {
    console.error('ERROR: --evidence-guard=off ya no es soportado por este wrapper TASK-842.')
    console.error('  Usa policy/evidence guard auditables: block_on_reconciled_drift o warn_only para bug class conocido.')
    process.exit(1)
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    console.error(`ERROR: --from-date debe ser YYYY-MM-DD, recibido: ${fromDate}`)
    process.exit(1)
  }

  if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    console.error(`ERROR: --to-date debe ser YYYY-MM-DD, recibido: ${toDate}`)
    process.exit(1)
  }

  return {
    accountId,
    fromDate,
    toDate,
    dryRun,
    json,
    evidenceGuard,
    policy: parsePolicy(parseValue(args, 'policy'), evidenceGuard),
    maxRows: parseNumberValue(args, 'max-rows'),
    maxAccounts: parseNumberValue(args, 'max-accounts'),
    maxAbsDriftClp: parseValue(args, 'max-abs-drift-clp')
  }
}

const main = async () => {
  const opts = parseArgs()

  console.log('--- TASK-842 — account_balances FX drift remediation wrapper ---')
  console.log(`  account_id:      ${opts.accountId}`)
  console.log(`  from_date:       ${opts.fromDate}`)
  console.log(`  to_date:         ${opts.toDate ?? 'today'}`)
  console.log(`  policy:          ${opts.policy}`)
  console.log(`  evidence_guard:  ${opts.evidenceGuard}`)
  console.log(`  mode:            ${opts.dryRun ? 'DRY-RUN (no writes)' : 'LIVE (rematerializa account_balances)'}`)
  console.log('')

  if (opts.evidenceGuard !== 'block_on_reconciled_drift') {
    console.log(`⚠️  evidenceGuard=${opts.evidenceGuard} declarado explicitamente.`)
    console.log('   Esto bypass el guardrail TASK-721 que protege snapshots reconciliation aceptados.')
    console.log('   Usar SOLO en recovery one-time post-bug-fix donde el snapshot quedo obsoleto.')
    console.log('   El snapshot original se preserva intacto como audit historico.')
    console.log('')
  }

  if (opts.dryRun) {
    console.log('Dry-run: NO se ejecuta rematerializacion. Para ejecutar live, re-correr con --apply.')
    console.log('')
  }

  const startMs = Date.now()

  try {
    const result = await remediateAccountBalancesFxDrift({
      accountId: opts.accountId,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      policy: opts.policy,
      dryRun: opts.dryRun,
      maxRows: opts.maxRows ?? 25,
      maxAccounts: opts.maxAccounts ?? 1,
      maxAbsDriftClp: opts.maxAbsDriftClp,
      triggeredBy: 'manual_cli'
    })

    const durationMs = Date.now() - startMs

    if (opts.json) {
      console.log(JSON.stringify({ ...result, durationMs }, null, 2))

      return
    }

    console.log(`Status: ${result.status}`)
    console.log(`  syncRunId:             ${result.syncRunId}`)
    console.log(`  driftRowsSeen:         ${result.driftRowsSeen}`)
    console.log(`  driftRowsRemediated:   ${result.driftRowsRemediated}`)
    console.log(`  driftRowsBlocked:      ${result.driftRowsBlocked}`)
    console.log(`  accountsRematerialized:${result.accountsRematerialized}`)
    console.log(`  residualDriftCount:    ${result.residualDriftCount}`)
    console.log(`  duration:              ${durationMs}ms`)

    for (const run of result.runs) {
      console.log(`  run: ${run.accountId} ${run.fromDate}..${run.toDate} days=${run.daysMaterialized ?? 0} closing=${run.finalClosingBalance ?? 'n/a'} evidenceGuard=${run.evidenceGuardMode ?? 'n/a'}`)
    }

    console.log('')
    console.log('Verificar finance.account_balances.fx_drift signal post-deploy:')
    console.log('  pnpm staging:request /api/admin/reliability')
  } catch (error) {
    console.error('✗ Backfill fallo:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
  .catch(err => {
    console.error('Unhandled error:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => undefined)
  })
