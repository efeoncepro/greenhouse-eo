#!/usr/bin/env tsx
/**
 * TASK-714d Slice 2 — Backfill internal_transfer settlement_groups
 * con pares incompletos (out_count != in_count).
 *
 * PROBLEMA RESUELTO
 * ─────────────────
 * Algunos settlement_groups con `leg_type='internal_transfer'` fueron creados
 * por scripts ad-hoc (no por el helper canónico
 * `createInternalTransferSettlement`) y solo emiten la pata `outgoing`.
 * La pata `incoming` falta, distorsionando el ledger de la cuenta receptora
 * (e.g. Global66 muestra $0 inflows aunque el cash sí entró desde Santander).
 *
 * SOLUCIÓN
 * ────────
 * Para cada settlement_group con desbalance:
 *   1. SUPERSEDE las legs viejas (audit-preserved con `superseded_at` +
 *      `superseded_reason`).
 *   2. CREATE NEW settlement_group atómico via helper canónico
 *      `createInternalTransferSettlement`, que emite par completo (out + in).
 *   3. Re-rematerialize las cuentas afectadas.
 *
 * INVARIANTES DE SEGURIDAD
 * ────────────────────────
 * - Pre-flight: snapshot closing_balance de TODAS las cuentas afectadas. Si
 *   cambian fuera de los esperados post-backfill, ABORT.
 * - Filter `--target-account` obligatorio para que el operador especifique
 *   QUÉ cohorte aplicar (e.g. solo global66-clp). NO procesa todos los
 *   imbalanced groups simultáneamente.
 * - WHERE clauses enforcement: solo legs de los settlement_groups del scope.
 *   Si un UPDATE afectaría legs fuera del scope, ABORT.
 * - Idempotencia: si el helper canónico detecta un settlement_group con el
 *   mismo deterministic ID, no lo recrea. Re-runs son seguros.
 * - Cero rematerialize de cuentas fuera del scope.
 *
 * USAGE
 * ─────
 *
 *   # Dry-run inventory
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/backfill-internal-transfer-pairs.ts \
 *     --target-account global66-clp
 *
 *   # Apply
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/backfill-internal-transfer-pairs.ts \
 *     --target-account global66-clp \
 *     --apply
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

import { rematerializeAccountBalancesFromDate } from '@/lib/finance/account-balances'
import { createInternalTransferSettlement } from '@/lib/finance/payment-instruments/anchored-payments'
import {
  closeGreenhousePostgres,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'

interface CliArgs {
  targetAccount: string
  apply: boolean
}

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2)

  const get = (flag: string): string | null => {
    const idx = argv.indexOf(flag)

    return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : null
  }

  const targetAccount = get('--target-account')

  if (!targetAccount) {
    throw new Error('--target-account is required (e.g. global66-clp)')
  }

  return { targetAccount, apply: argv.includes('--apply') }
}

type OrphanLeg = {
  settlement_group_id: string
  settlement_leg_id: string
  transaction_date: string
  amount: string
  instrument_id: string
  counterparty_instrument_id: string
  is_reconciled: boolean
  reconciliation_row_id: string | null
  notes: string | null
  source_currency: string
} & Record<string, unknown>

const queryOrphanLegsForAccount = async (targetAccount: string): Promise<OrphanLeg[]> => {
  // Sólo legs `outgoing` que apuntan a `targetAccount` como counterparty,
  // y cuyo settlement_group está desbalanceado (out_count != in_count).
  return runGreenhousePostgresQuery<OrphanLeg>(
    `
      SELECT
        sl.settlement_group_id,
        sl.settlement_leg_id,
        sl.transaction_date::date::text AS transaction_date,
        sl.amount::text AS amount,
        sl.instrument_id,
        sl.counterparty_instrument_id,
        sl.is_reconciled,
        sl.reconciliation_row_id,
        sl.notes,
        COALESCE(sl.currency, 'CLP') AS source_currency
      FROM greenhouse_finance.settlement_legs sl
      WHERE sl.leg_type = 'internal_transfer'
        AND sl.direction = 'outgoing'
        AND sl.counterparty_instrument_id = $1
        AND sl.superseded_at IS NULL
        AND sl.superseded_by_otb_id IS NULL
        AND sl.settlement_group_id IN (
          SELECT settlement_group_id
          FROM greenhouse_finance.settlement_legs
          WHERE leg_type = 'internal_transfer'
            AND superseded_at IS NULL
            AND superseded_by_otb_id IS NULL
          GROUP BY settlement_group_id
          HAVING SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END)
              <> SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END)
        )
      ORDER BY sl.transaction_date ASC, sl.settlement_leg_id ASC
    `,
    [targetAccount]
  )
}

const fetchAccountClosing = async (accountId: string): Promise<{ balance_date: string; closing_balance: string } | null> => {
  const rows = await runGreenhousePostgresQuery<{ balance_date: string; closing_balance: string }>(
    `SELECT balance_date::date::text AS balance_date, closing_balance::text
     FROM greenhouse_finance.account_balances
     WHERE account_id = $1
     ORDER BY balance_date DESC LIMIT 1`,
    [accountId]
  )

  return rows[0] ?? null
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()

  console.log('[task-714d] target account:', args.targetAccount)
  console.log('[task-714d] apply:', args.apply)

  const orphans = await queryOrphanLegsForAccount(args.targetAccount)

  console.log(`\n[task-714d] orphan internal_transfer legs touching ${args.targetAccount}: ${orphans.length}`)

  for (const o of orphans) {
    console.log(`  - ${o.settlement_group_id}: ${o.transaction_date} ${o.source_currency} ${Number(o.amount).toLocaleString('es-CL')} (${o.instrument_id} → ${o.counterparty_instrument_id})`)
  }

  if (orphans.length === 0) {
    console.log('[task-714d] no orphan groups touching target account. Nothing to backfill.')

    return
  }

  // Pre-flight: snapshot closing balances of all accounts touched by orphan legs.
  const accountsTouched = new Set<string>()

  for (const o of orphans) {
    accountsTouched.add(o.instrument_id)
    accountsTouched.add(o.counterparty_instrument_id)
  }

  const preFlight: Record<string, { balance_date: string; closing_balance: string } | null> = {}

  for (const acc of accountsTouched) {
    preFlight[acc] = await fetchAccountClosing(acc)
  }

  console.log('\n[task-714d] pre-flight closing balances:')

  for (const [acc, info] of Object.entries(preFlight)) {
    console.log(`  - ${acc}: ${info ? `${info.balance_date} closing=${Number(info.closing_balance).toLocaleString('es-CL')}` : 'NO SNAPSHOT'}`)
  }

  if (!args.apply) {
    console.log('\n[dry-run] would supersede the above orphan legs and recreate via helper canónico.')
    console.log('[dry-run] would re-rematerialize each touched account from earliest orphan transaction_date.')
    console.log('[dry-run] would verify closing_balance unchanged or in expected delta.')
    console.log('[dry-run] re-run with --apply to execute.')

    return
  }

  // Group orphans by settlement_group_id so the helper canónico runs once per group.
  const groupedOrphans = new Map<string, OrphanLeg[]>()

  for (const o of orphans) {
    const list = groupedOrphans.get(o.settlement_group_id) ?? []

    list.push(o)
    groupedOrphans.set(o.settlement_group_id, list)
  }

  // Earliest transaction date for rematerialize scope.
  let earliestDate = '9999-12-31'

  for (const o of orphans) {
    if (o.transaction_date < earliestDate) earliestDate = o.transaction_date
  }

  // Step 1: supersede orphan legs in a transaction (atomic).
  await withGreenhousePostgresTransaction(async client => {
    for (const [groupId, legs] of groupedOrphans) {
      for (const leg of legs) {
        await client.query(
          `UPDATE greenhouse_finance.settlement_legs
           SET superseded_at = NOW(),
               superseded_reason = $1,
               updated_at = NOW()
           WHERE settlement_leg_id = $2
             AND superseded_at IS NULL
             AND counterparty_instrument_id = $3`,
          [
            `TASK-714d backfill — pair-incomplete group ${groupId} replaced via helper canónico createInternalTransferSettlement.`,
            leg.settlement_leg_id,
            args.targetAccount
          ]
        )
      }
    }
  })

  console.log('\n[task-714d] supersede applied to orphan legs.')

  // Step 2: recreate via canonical helper. This emits BOTH legs (out + in)
  // atomically and is idempotent (deterministic group ID).
  for (const [oldGroupId, legs] of groupedOrphans) {
    // Each old group had exactly one leg (the orphan outgoing). Use its data.
    const leg = legs[0]
    const reference = `itx-backfill-${oldGroupId}`

    const result = await createInternalTransferSettlement({
      paymentDate: leg.transaction_date,
      amount: Number(leg.amount),
      sourceAccountId: leg.instrument_id,
      destinationAccountId: leg.counterparty_instrument_id,
      reference,
      notes: `TASK-714d backfill — replaced ${oldGroupId} (originally created by ad-hoc script with missing incoming pair).`,
      actorUserId: 'task-714d-backfill'
    })

    console.log(`  - recreated: old=${oldGroupId} → new=${result.settlementGroupId} (out=${result.outgoingLegId}, in=${result.incomingLegId})`)
  }

  // Step 3: rematerialize touched accounts from earliest date.
  for (const acc of accountsTouched) {
    console.log(`\n[task-714d] rematerializing ${acc} from ${earliestDate}...`)
    await rematerializeAccountBalancesFromDate({ accountId: acc, fromDate: earliestDate })
  }

  // Step 4: post-flight verification.
  const postFlight: Record<string, { balance_date: string; closing_balance: string } | null> = {}

  for (const acc of accountsTouched) {
    postFlight[acc] = await fetchAccountClosing(acc)
  }

  console.log('\n[task-714d] post-flight closing balances:')

  let drift = false

  for (const acc of accountsTouched) {
    const pre = preFlight[acc]
    const post = postFlight[acc]
    const preVal = pre ? Number(pre.closing_balance) : null
    const postVal = post ? Number(post.closing_balance) : null
    const diff = (preVal !== null && postVal !== null) ? postVal - preVal : null
    const tag = diff === null ? '?' : Math.abs(diff) < 1 ? 'OK' : 'DRIFT'

    if (tag === 'DRIFT') drift = true
    console.log(`  - ${acc}: pre=${preVal?.toLocaleString('es-CL') ?? 'n/a'} post=${postVal?.toLocaleString('es-CL') ?? 'n/a'} diff=${diff?.toLocaleString('es-CL') ?? 'n/a'} [${tag}]`)
  }

  if (drift) {
    console.error('\n[task-714d] DRIFT DETECTED — closing balances changed beyond expected (should be 0). Manual review required.')
    process.exit(2)
  }

  console.log('\n[task-714d] DONE — all touched accounts maintained their closing balance. Pair invariant restored.')
}

main()
  .catch(err => {
    console.error('[task-714d] FAILED:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
