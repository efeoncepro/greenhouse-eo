#!/usr/bin/env tsx
/**
 * TASK-768 Slice 3 — Backfill defensivo de economic_category.
 *
 * Recorre filas de greenhouse_finance.expenses + greenhouse_finance.income
 * con economic_category IS NULL en batches, llama al resolver canonico,
 * persiste resultado per-row + audit log + manual queue (si confidence
 * insuficiente). Idempotente: skip rows con economic_category != NULL.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/backfill-economic-category.ts \
 *     [--dry-run] [--batch-size=500] [--limit=N] [--kind=expense|income|both]
 *
 * Outputs:
 *   - Logs por batch + summary final (resolved high/medium/low/manual + errors)
 *   - Inserta filas en economic_category_resolution_log (audit append-only)
 *   - Inserta filas en economic_category_manual_queue para confidence low/manual_required
 *   - UPDATE expenses.economic_category / income.economic_category (skip si confidence insuficiente)
 */

import process from 'node:process'
import { randomUUID } from 'node:crypto'

import { query, withTransaction } from '@/lib/db'
import {
  resolveExpenseEconomicCategory,
  resolveIncomeEconomicCategory,
  type ResolveExpenseInput,
  type ResolveIncomeInput
} from '@/lib/finance/economic-category'

interface CliOptions {
  dryRun: boolean
  batchSize: number
  limit: number
  kind: 'expense' | 'income' | 'both'
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const getNumberArg = (name: string, def: number): number => {
    const arg = args.find(a => a.startsWith(`--${name}=`))

    if (!arg) return def

    const value = Number(arg.split('=')[1])

    return Number.isFinite(value) && value > 0 ? value : def
  }

  const getKindArg = (): CliOptions['kind'] => {
    const arg = args.find(a => a.startsWith('--kind='))

    if (!arg) return 'both'

    const value = arg.split('=')[1]

    if (value === 'expense' || value === 'income' || value === 'both') return value

    return 'both'
  }

  return {
    dryRun,
    batchSize: Math.min(2000, getNumberArg('batch-size', 500)),
    limit: getNumberArg('limit', Number.MAX_SAFE_INTEGER),
    kind: getKindArg()
  }
}

interface ExpenseCandidateRow {
  expense_id: string
  expense_type: string | null
  cost_category: string | null
  description: string | null
  supplier_id: string | null
  supplier_name: string | null
  member_id: string | null
  member_name: string | null
  total_amount: string | number | null
  currency: string | null
  source_kind: string | null
  source_object_id: string | null
  beneficiary_rut: string | null
  [key: string]: unknown
}

interface IncomeCandidateRow {
  income_id: string
  income_type: string | null
  description: string | null
  client_profile_id: string | null
  total_amount: string | number | null
  currency: string | null
  source_kind: string | null
  [key: string]: unknown
}

interface BackfillSummary {
  scanned: number
  resolved: number
  byCategory: Record<string, number>
  byConfidence: Record<string, number>
  enqueuedManual: number
  errors: Array<{ id: string; message: string }>
}

const newSummary = (): BackfillSummary => ({
  scanned: 0,
  resolved: 0,
  byCategory: {},
  byConfidence: { high: 0, medium: 0, low: 0, manual_required: 0 },
  enqueuedManual: 0,
  errors: []
})

const fetchExpenseBatch = async (offset: number, batchSize: number): Promise<ExpenseCandidateRow[]> => {
  return query<ExpenseCandidateRow>(
    `SELECT e.expense_id, e.expense_type, e.cost_category, e.description,
            e.supplier_id, e.supplier_name, e.member_id, e.member_name,
            e.total_amount, e.currency, e.source_type AS source_kind, NULL::text AS source_object_id,
            e.nubox_supplier_rut AS beneficiary_rut
       FROM greenhouse_finance.expenses e
      WHERE e.economic_category IS NULL
      ORDER BY e.created_at ASC
      LIMIT $1 OFFSET $2`,
    [batchSize, offset]
  )
}

const fetchIncomeBatch = async (offset: number, batchSize: number): Promise<IncomeCandidateRow[]> => {
  return query<IncomeCandidateRow>(
    `SELECT i.income_id, i.income_type, i.description, i.client_profile_id,
            i.total_amount, i.currency, i.origin AS source_kind
       FROM greenhouse_finance.income i
      WHERE i.economic_category IS NULL
      ORDER BY i.created_at ASC
      LIMIT $1 OFFSET $2`,
    [batchSize, offset]
  )
}

const toResolveExpenseInput = (row: ExpenseCandidateRow): ResolveExpenseInput => ({
  beneficiaryName: row.supplier_name ?? row.member_name ?? null,
  beneficiaryRut: row.beneficiary_rut ?? null,
  beneficiaryMemberId: row.member_id ?? null,
  beneficiarySupplierId: row.supplier_id ?? null,
  rawDescription: row.description ?? null,
  sourceKind: row.source_kind ?? null,
  accountingType: row.expense_type ?? null,
  costCategory: row.cost_category ?? null,
  amount: typeof row.total_amount === 'number' ? row.total_amount : Number(row.total_amount ?? 0),
  currency: row.currency ?? null
})

const toResolveIncomeInput = (row: IncomeCandidateRow): ResolveIncomeInput => ({
  payerClientProfileId: row.client_profile_id ?? null,
  rawDescription: row.description ?? null,
  sourceKind: row.source_kind ?? null,
  accountingType: row.income_type ?? null,
  amount: typeof row.total_amount === 'number' ? row.total_amount : Number(row.total_amount ?? 0),
  currency: row.currency ?? null
})

// Helpers writeAuditLog / enqueueManualReview se inlinean dentro de las
// transacciones per-row de processExpenses / processIncome (ver abajo)
// para garantizar atomicidad UPDATE + INSERT log + manual queue.

const processExpenses = async (options: CliOptions): Promise<BackfillSummary> => {
  const summary = newSummary()
  const batchId = `backfill-expense-${new Date().toISOString()}`
  let offset = 0

  while (summary.scanned < options.limit) {
    const remaining = options.limit - summary.scanned
    const fetchSize = Math.min(options.batchSize, remaining)
    const batch = await fetchExpenseBatch(offset, fetchSize)

    if (batch.length === 0) break

    for (const row of batch) {
      summary.scanned += 1

      try {
        const input = toResolveExpenseInput(row)
        const result = await resolveExpenseEconomicCategory(input)

        summary.byCategory[result.category] = (summary.byCategory[result.category] ?? 0) + 1
        summary.byConfidence[result.confidence] += 1

        if (options.dryRun) {
          console.log(
            `  [DRY] expense=${row.expense_id} → ${result.category} (${result.confidence}, ${result.matchedRule})`
          )
          continue
        }

        // TASK-768 followup: SIEMPRE persistimos el best-guess del resolver
        // (incluso confidence low/manual_required) para que la UI no quede
        // con KPIs en $0. Adicionalmente, casos low/manual_required entran
        // al manual queue para revisión humana — el operador puede afinar
        // la clasificación, pero mientras tanto los KPIs tienen un valor
        // razonable que respeta la decisión del resolver.
        const needsManualReview =
          result.confidence === 'low' || result.confidence === 'manual_required'

        await withTransaction(async client => {
          await client.query(
            `INSERT INTO greenhouse_finance.economic_category_resolution_log
               (log_id, target_kind, target_id, resolved_category, matched_rule,
                confidence, evidence_json, resolved_by, batch_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              `ecr-${randomUUID()}`,
              'expense',
              row.expense_id,
              result.category,
              result.matchedRule,
              result.confidence,
              JSON.stringify(result.evidence),
              'backfill-script',
              batchId
            ]
          )

          await client.query(
            `UPDATE greenhouse_finance.expenses
               SET economic_category = $1
             WHERE expense_id = $2 AND economic_category IS NULL`,
            [result.category, row.expense_id]
          )
          summary.resolved += 1

          if (needsManualReview) {
            await client.query(
              `INSERT INTO greenhouse_finance.economic_category_manual_queue
                 (queue_id, target_kind, target_id, candidate_category,
                  candidate_confidence, candidate_rule, candidate_evidence)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (target_kind, target_id) DO UPDATE SET
                 candidate_category = EXCLUDED.candidate_category,
                 candidate_confidence = EXCLUDED.candidate_confidence,
                 candidate_rule = EXCLUDED.candidate_rule,
                 candidate_evidence = EXCLUDED.candidate_evidence,
                 updated_at = NOW()`,
              [
                `ecq-${randomUUID()}`,
                'expense',
                row.expense_id,
                result.category,
                result.confidence,
                result.matchedRule,
                JSON.stringify(result.evidence)
              ]
            )
            summary.enqueuedManual += 1
          }
        })
      } catch (err) {
        summary.errors.push({
          id: row.expense_id,
          message: err instanceof Error ? err.message : String(err)
        })
      }
    }

    offset += batch.length

    if (batch.length < fetchSize) break
  }

  return summary
}

const processIncome = async (options: CliOptions): Promise<BackfillSummary> => {
  const summary = newSummary()
  const batchId = `backfill-income-${new Date().toISOString()}`
  let offset = 0

  while (summary.scanned < options.limit) {
    const remaining = options.limit - summary.scanned
    const fetchSize = Math.min(options.batchSize, remaining)
    const batch = await fetchIncomeBatch(offset, fetchSize)

    if (batch.length === 0) break

    for (const row of batch) {
      summary.scanned += 1

      try {
        const input = toResolveIncomeInput(row)
        const result = await resolveIncomeEconomicCategory(input)

        summary.byCategory[result.category] = (summary.byCategory[result.category] ?? 0) + 1
        summary.byConfidence[result.confidence] += 1

        if (options.dryRun) {
          console.log(
            `  [DRY] income=${row.income_id} → ${result.category} (${result.confidence}, ${result.matchedRule})`
          )
          continue
        }

        // TASK-768 followup: persistir SIEMPRE + enqueue manual queue para review
        const needsManualReview =
          result.confidence === 'low' || result.confidence === 'manual_required'

        await withTransaction(async client => {
          await client.query(
            `INSERT INTO greenhouse_finance.economic_category_resolution_log
               (log_id, target_kind, target_id, resolved_category, matched_rule,
                confidence, evidence_json, resolved_by, batch_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              `ecr-${randomUUID()}`,
              'income',
              row.income_id,
              result.category,
              result.matchedRule,
              result.confidence,
              JSON.stringify(result.evidence),
              'backfill-script',
              batchId
            ]
          )

          await client.query(
            `UPDATE greenhouse_finance.income
               SET economic_category = $1
             WHERE income_id = $2 AND economic_category IS NULL`,
            [result.category, row.income_id]
          )
          summary.resolved += 1

          if (needsManualReview) {
            await client.query(
              `INSERT INTO greenhouse_finance.economic_category_manual_queue
                 (queue_id, target_kind, target_id, candidate_category,
                  candidate_confidence, candidate_rule, candidate_evidence)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (target_kind, target_id) DO UPDATE SET
                 candidate_category = EXCLUDED.candidate_category,
                 candidate_confidence = EXCLUDED.candidate_confidence,
                 candidate_rule = EXCLUDED.candidate_rule,
                 candidate_evidence = EXCLUDED.candidate_evidence,
                 updated_at = NOW()`,
              [
                `ecq-${randomUUID()}`,
                'income',
                row.income_id,
                result.category,
                result.confidence,
                result.matchedRule,
                JSON.stringify(result.evidence)
              ]
            )
            summary.enqueuedManual += 1
          }
        })
      } catch (err) {
        summary.errors.push({
          id: row.income_id,
          message: err instanceof Error ? err.message : String(err)
        })
      }
    }

    offset += batch.length

    if (batch.length < fetchSize) break
  }

  return summary
}

const printSummary = (label: string, summary: BackfillSummary): void => {
  console.log(`\n=== ${label} ===`)
  console.log(`Scanned:           ${summary.scanned}`)
  console.log(`Resolved (auto):   ${summary.resolved}`)
  console.log(`Enqueued manual:   ${summary.enqueuedManual}`)
  console.log(`Errors:            ${summary.errors.length}`)
  console.log(`By confidence:`)

  for (const [conf, count] of Object.entries(summary.byConfidence)) {
    console.log(`  ${conf.padEnd(20)} ${count}`)
  }

  console.log(`By category:`)

  for (const [cat, count] of Object.entries(summary.byCategory).sort()) {
    console.log(`  ${cat.padEnd(35)} ${count}`)
  }

  if (summary.errors.length > 0) {
    console.log(`\nErrors (first 10):`)
    summary.errors.slice(0, 10).forEach(err => {
      console.log(`  ${err.id} → ${err.message}`)
    })
  }
}

const main = async (): Promise<void> => {
  const options = parseArgs()

  console.log(`TASK-768 backfill economic_category`)
  console.log(`  dryRun:    ${options.dryRun}`)
  console.log(`  batchSize: ${options.batchSize}`)
  console.log(`  limit:     ${options.limit === Number.MAX_SAFE_INTEGER ? 'unbounded' : options.limit}`)
  console.log(`  kind:      ${options.kind}`)

  if (options.kind === 'expense' || options.kind === 'both') {
    const summary = await processExpenses(options)

    printSummary('EXPENSES', summary)
  }

  if (options.kind === 'income' || options.kind === 'both') {
    const summary = await processIncome(options)

    printSummary('INCOME', summary)
  }

  console.log('\nbackfill complete')
}

main().catch(err => {
  console.error('backfill failed:', err)
  process.exit(1)
})
