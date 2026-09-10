#!/usr/bin/env tsx
/**
 * CLI — Ajustes de ledger declarativos que no nacen de una fila de cartola
 * (o que la corrigen): cobros en moneda nativa, comisiones neteadas, pagos
 * directos a un member, y supersede de un settlement registrado por error.
 * Usa los commands canónicos; sin `--apply` sólo reporta.
 *
 *   pnpm finance:ledger-adjust --plan scripts/finance/reconciliation-plans/ledger-2026-08-09.json [--apply]
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { recordPayment as recordIncomePayment } from '@/lib/finance/payment-ledger'
import { createBankFeeExpensePayment, createMemberPaymentExpense } from '@/lib/finance/payment-instruments/anchored-payments'
import { linkStatementRow, unlinkStatementRow } from '@/lib/finance/reconciliation/link-statement-row'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

type Op =
  | { op: 'income_payment'; incomeId: string; date: string; amount: number; currency: 'CLP' | 'USD' | 'MXN'; accountId: string; exchangeRate?: number; reference: string; notes?: string; linkRowId?: string; linkAsSecondary?: boolean }
  | { op: 'bank_fee'; accountId: string; date: string; amount: number; currency?: 'CLP' | 'USD' | 'MXN'; exchangeRate?: number; description: string; reference: string; notes?: string }
  | { op: 'member_payment'; memberId: string; memberName?: string; accountId: string; date: string; amount: number; description: string; reference: string; notes?: string; linkRowId?: string }
  | { op: 'supersede_settlement_group'; settlementGroupId: string; reason: string }

interface LedgerPlan {
  actor: string
  ops: Op[]
}

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const args: Record<string, string | boolean> = {}

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (!token.startsWith('--')) continue

    const next = argv[i + 1]

    if (next === undefined || next.startsWith('--')) args[token.slice(2)] = true
    else {
      args[token.slice(2)] = next
      i++
    }
  }

  return args
}

const rowById = async (rowId: string) => {
  const rows = await runGreenhousePostgresQuery<{ row_id: string; period_id: string; match_status: string }>(
    `SELECT row_id, period_id, match_status FROM greenhouse_finance.bank_statement_rows WHERE row_id = $1`,
    [rowId]
  )

  if (!rows[0]) throw new Error(`Fila ${rowId} no existe`)

  return rows[0]
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()

  if (typeof args.plan !== 'string') throw new Error('--plan <ruta.json> es obligatorio')

  const plan = JSON.parse(readFileSync(path.resolve(args.plan), 'utf8')) as LedgerPlan
  const apply = args.apply === true

  console.log(`[ledger] ${plan.ops.length} operaciones · ${apply ? 'APPLY' : 'dry-run'}`)

  for (const op of plan.ops) {
    console.log(`  · ${op.op} ${'reference' in op ? op.reference : op.settlementGroupId}`)

    if (!apply) continue

    switch (op.op) {
      case 'income_payment': {
        const existing = await runGreenhousePostgresQuery<{ payment_id: string }>(
          `SELECT payment_id FROM greenhouse_finance.income_payments WHERE income_id = $1 AND reference = $2 AND superseded_at IS NULL LIMIT 1`,
          [op.incomeId, op.reference]
        )

        if (existing[0]) {
          console.log(`    = ya registrado ${existing[0].payment_id}`)
          break
        }

        const r = await recordIncomePayment({
          incomeId: op.incomeId,
          paymentDate: op.date,
          amount: op.amount,
          currency: op.currency,
          reference: op.reference,
          paymentMethod: 'bank_transfer',
          paymentAccountId: op.accountId,
          notes: op.notes ?? null,
          actorUserId: plan.actor,
          exchangeRateOverride: op.exchangeRate ?? null
        })

        console.log(`    ✓ cobro ${r.payment.paymentId} sobre ${op.incomeId} (${r.paymentStatus}, pendiente ${r.amountPending})`)

        if (op.linkRowId) {
          const row = await rowById(op.linkRowId)

          if (op.linkAsSecondary) {
            await runGreenhousePostgresQuery(
              `UPDATE greenhouse_finance.income_payments SET is_reconciled = TRUE, reconciliation_row_id = $2, reconciled_at = NOW(), reconciled_by_user_id = $3 WHERE payment_id = $1`,
              [r.payment.paymentId, row.row_id, plan.actor]
            )
            console.log(`    ✓ fila ${row.row_id} también respalda este cobro (secundario)`)
          } else {
            await linkStatementRow(row, { kind: 'income', incomeId: op.incomeId, paymentId: r.payment.paymentId }, plan.actor)
            console.log(`    ✓ fila ${row.row_id} vinculada`)
          }
        }

        break
      }

      case 'bank_fee': {
        const r = await createBankFeeExpensePayment({
          description: op.description,
          paymentDate: op.date,
          amount: op.amount,
          paymentAccountId: op.accountId,
          reference: op.reference,
          notes: op.notes ?? null,
          actorUserId: plan.actor,
          currency: op.currency ?? 'CLP',
          exchangeRateToClp: op.exchangeRate ?? null
        })

        console.log(`    ✓ comisión ${r.expenseId}`)
        break
      }

      case 'member_payment': {
        const r = await createMemberPaymentExpense({
          memberId: op.memberId,
          memberName: op.memberName ?? null,
          description: op.description,
          paymentDate: op.date,
          amount: op.amount,
          paymentAccountId: op.accountId,
          reference: op.reference,
          notes: op.notes ?? null,
          actorUserId: plan.actor,
          reconciliationRowId: op.linkRowId ?? null
        })

        console.log(`    ✓ pago a member ${r.expenseId} (${r.paymentId || 'existente'})`)

        if (op.linkRowId) {
          const row = await rowById(op.linkRowId)

          await linkStatementRow(row, { kind: 'expense', expenseId: r.expenseId, paymentId: r.paymentId || null }, plan.actor)
          console.log(`    ✓ fila ${row.row_id} vinculada`)
        }

        break
      }

      case 'supersede_settlement_group': {
        const legs = await runGreenhousePostgresQuery<{ settlement_leg_id: string; reconciliation_row_id: string | null }>(
          `SELECT settlement_leg_id, reconciliation_row_id FROM greenhouse_finance.settlement_legs WHERE settlement_group_id = $1 AND superseded_at IS NULL`,
          [op.settlementGroupId]
        )

        for (const leg of legs) {
          if (leg.reconciliation_row_id) await unlinkStatementRow(leg.reconciliation_row_id)
        }

        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_finance.settlement_legs SET superseded_at = NOW(), superseded_reason = $2, is_reconciled = FALSE, reconciliation_row_id = NULL, updated_at = NOW()
           WHERE settlement_group_id = $1 AND superseded_at IS NULL`,
          [op.settlementGroupId, op.reason]
        )
        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_finance.settlement_groups SET provider_status = 'cancelled', notes = COALESCE(notes, '') || ' | superseded: ' || $2, updated_at = NOW() WHERE settlement_group_id = $1`,
          [op.settlementGroupId, op.reason]
        )

        console.log(`    ✓ ${legs.length} patas superseded (${op.settlementGroupId})`)
        break
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
