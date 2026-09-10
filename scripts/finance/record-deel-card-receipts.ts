#!/usr/bin/env tsx
/**
 * CLI — Registrar recibos de Deel pagados con la tarjeta personal del
 * accionista (*1879) contra la cuenta corriente accionista (CCA).
 *
 * Por cada recibo (Payment Statement REC-YYYY-N):
 *   - el total de facturas del contractor se paga sobre el expense de nómina
 *     del entry correspondiente (`payExpenseId`), en USD, método
 *     `shareholder_personal_card`, instrumento `sha-cca-julio-reyes-clp`;
 *   - las fees de Deel (suscripción + processing) nacen como gasto anclado a
 *     `tool_catalog_id=deel` vía `createShareholderCardExpense`.
 *
 * Idempotente por referencia (`deel-REC-…`). Sin `--apply` sólo reporta.
 *
 *   pnpm finance:record-deel-receipts --plan scripts/finance/reconciliation-plans/deel-2026-08-09.json [--apply]
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { createShareholderCardExpense } from '@/lib/finance/payment-instruments/anchored-payments'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

interface DeelReceipt {
  receipt: string
  paidDate: string
  contractorTotalUsd: number
  deelFeesUsd: number
  payExpenseId: string | null
  memberId: string | null
  description: string
  /** override opcional del tipo de cambio USD→CLP del día (si el registry no lo tiene) */
  exchangeRate?: number
}

interface DeelPlan {
  actor: string
  ccaInstrumentId: string
  cardLast4: string
  shareholderName: string
  receipts: DeelReceipt[]
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

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()

  if (typeof args.plan !== 'string') throw new Error('--plan <ruta.json> es obligatorio')

  const plan = JSON.parse(readFileSync(path.resolve(args.plan), 'utf8')) as DeelPlan
  const apply = args.apply === true

  console.log(`[deel] ${plan.receipts.length} recibos · ${apply ? 'APPLY' : 'dry-run'} · CCA ${plan.ccaInstrumentId}`)

  for (const r of plan.receipts) {
    const paymentRef = `deel-${r.receipt}-contractor`
    const feeRef = `deel-${r.receipt}-fees`

    console.log(`  · ${r.receipt} ${r.paidDate} contractor USD ${r.contractorTotalUsd} → ${r.payExpenseId ?? '(sin expense)'} · fees USD ${r.deelFeesUsd}`)

    if (!apply) continue

    if (r.payExpenseId && r.contractorTotalUsd > 0) {
      const existing = await runGreenhousePostgresQuery<{ payment_id: string }>(
        `SELECT payment_id FROM greenhouse_finance.expense_payments WHERE reference = $1 AND superseded_at IS NULL LIMIT 1`,
        [paymentRef]
      )

      if (existing.length > 0) {
        console.log(`    = pago ya registrado ${existing[0].payment_id}`)
      } else {
        const paid = await recordExpensePayment({
          expenseId: r.payExpenseId,
          paymentDate: r.paidDate,
          amount: r.contractorTotalUsd,
          currency: 'USD',
          reference: paymentRef,
          paymentMethod: 'shareholder_personal_card',
          paymentAccountId: plan.ccaInstrumentId,
          paymentSource: 'manual',
          notes: `Deel ${r.receipt} pagado con tarjeta personal ${plan.shareholderName} (*${plan.cardLast4}). ${r.description}`,
          actorUserId: plan.actor,
          exchangeRateOverride: r.exchangeRate ?? null
        })

        console.log(`    ✓ pago ${paid.payment.paymentId} sobre ${r.payExpenseId} (${paid.paymentStatus})`)
      }
    }

    if (r.deelFeesUsd > 0) {
      const fee = await createShareholderCardExpense({
        description: `Deel fees ${r.receipt} (suscripción + processing) — ${r.description}`,
        toolCatalogId: 'deel',
        memberId: r.memberId,
        supplierName: 'Deel Inc.',
        currency: 'USD',
        exchangeRateOverride: r.exchangeRate,
        paymentDate: r.paidDate,
        amount: r.deelFeesUsd,
        paymentAccountId: plan.ccaInstrumentId,
        reference: feeRef,
        shareholderCardLast4: plan.cardLast4,
        shareholderName: plan.shareholderName,
        actorUserId: plan.actor
      })

      console.log(`    ✓ fees ${fee.expenseId} (${fee.paymentId ? 'pago ' + fee.paymentId : 'existente'})`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
