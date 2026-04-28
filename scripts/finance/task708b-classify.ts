#!/usr/bin/env tsx
/**
 * TASK-708b — Clasifica cada signal Cohorte A/B (post-backfill) con un
 * outcome propuesto: repaired_with_account / superseded_replaced / dismissed_no_cash.
 *
 * Read-only: produce reporte JSON. El humano firma y task708b-apply ejecuta.
 *
 * Uso:
 *   pnpm finance:task708b-classify                   # stdout JSON
 *   pnpm finance:task708b-classify --out report.json
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import {
  classifyHistoricalSignal,
  type ClassificationProposal
} from '@/lib/finance/external-cash-signals'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

interface SignalToClassify {
  signal_id: string
  source_system: string
  source_event_id: string
  document_kind: 'income' | 'expense' | 'unknown'
  document_id: string | null
  signal_date: string | Date
  amount: string
  currency: string
  space_id: string
  source_payload_json: { payment_method?: string | null; reference?: string | null } & Record<string, unknown>
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null

  // Cargar todas las signals Nubox sin clasificacion terminal.
  const signals = await runGreenhousePostgresQuery<SignalToClassify & Record<string, unknown>>(
    `
      SELECT signal_id, source_system, source_event_id, document_kind, document_id,
             signal_date::text AS signal_date, amount::text AS amount, currency, space_id,
             source_payload_json
      FROM greenhouse_finance.external_cash_signals
      WHERE source_system = 'nubox'
        AND account_resolution_status NOT IN ('adopted', 'dismissed', 'superseded')
      ORDER BY signal_date DESC
    `
  )

  console.log(`[t708b:classify] inspecting ${signals.length} signals...`)

  const proposals: ClassificationProposal[] = []

  for (const s of signals) {
    if (s.document_kind === 'unknown' || !s.document_id) {
      continue
    }

    // Para vincular signal con phantom payment usamos el patron del backfill:
    // - Cohorte A signals: source_event_id = `nubox-mvmt-inc-<id>` → buscar income_payment con reference matching
    // - Cohorte B signals: source_event_id = `nubox-purchase-<id>` → buscar expense_payment con expense.nubox_purchase_id
    let phantomPaymentId: string | null = null

    if (s.document_kind === 'income') {
      const ipRows = await runGreenhousePostgresQuery<{ payment_id: string } & Record<string, unknown>>(
        `SELECT payment_id FROM greenhouse_finance.income_payments
         WHERE income_id = $1 AND reference = $2 AND payment_source = 'nubox_bank_sync'
         LIMIT 1`,
        [s.document_id, s.source_event_id]
      )

      phantomPaymentId = ipRows[0]?.payment_id ?? null
    } else if (s.document_kind === 'expense') {
      // Cohorte B: source_event_id es 'nubox-purchase-<id>'; el payment se busca por expense_id + payment_source manual + prefix.
      const epRows = await runGreenhousePostgresQuery<{ payment_id: string } & Record<string, unknown>>(
        `SELECT payment_id FROM greenhouse_finance.expense_payments
         WHERE expense_id = $1 AND payment_source = 'manual' AND payment_id LIKE 'exp-pay-backfill-EXP-NB-%'
         LIMIT 1`,
        [s.document_id]
      )

      phantomPaymentId = epRows[0]?.payment_id ?? null
    }

    if (!phantomPaymentId) {
      continue
    }

    const signalDateStr = typeof s.signal_date === 'string' ? s.signal_date : s.signal_date.toISOString().slice(0, 10)

    const proposal = await classifyHistoricalSignal({
      signalId: s.signal_id,
      spaceId: s.space_id,
      documentKind: s.document_kind,
      documentId: s.document_id,
      paymentId: phantomPaymentId,
      amount: Number(s.amount),
      currency: s.currency,
      signalDate: signalDateStr,
      paymentMethod: s.source_payload_json?.payment_method ?? null,
      bankDescription: s.source_payload_json?.reference ?? null
    })

    proposals.push(proposal)
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    task: 'TASK-708b',
    totalSignals: signals.length,
    classified: proposals.length,
    counts: {
      repaired_with_account: proposals.filter(p => p.outcome === 'repaired_with_account').length,
      superseded_replaced: proposals.filter(p => p.outcome === 'superseded_replaced').length,
      dismissed_no_cash: proposals.filter(p => p.outcome === 'dismissed_no_cash').length
    },
    proposals
  }

  const output = JSON.stringify(summary, null, 2)

  if (outPath) {
    const resolved = path.resolve(process.cwd(), outPath)

    writeFileSync(resolved, output, 'utf8')
    console.log(`[t708b:classify] report written to ${resolved}`)
    console.log(`[t708b:classify] outcomes:`, summary.counts)
  } else {
    process.stdout.write(output)
    process.stdout.write('\n')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[t708b:classify] error:', error?.message ?? error)
    process.exit(1)
  })
