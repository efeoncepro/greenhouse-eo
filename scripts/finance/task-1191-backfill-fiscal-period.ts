#!/usr/bin/env tsx
/**
 * TASK-1191 / ISSUE-103 — Backfill del período fiscal (F29) de los documentos con
 * IVA que quedaron sin `period_year`/`period_month` (origen: el sync de Nubox no
 * estampaba el período; ahora sí — Slice 2). Sin período, esos documentos nunca
 * entran a una posición F29 y el crédito/débito fiscal queda sin declarar.
 *
 * Deriva el período del MES de la fecha del documento (document_date para
 * expenses, invoice_date para income). Para una columna DATE esto es idéntico a
 * `getOperationalFiscalPeriod()` (el helper canónico, Slice 1): una DATE no tiene
 * componente horario, así que `EXTRACT(YEAR/MONTH FROM date)` == mes operativo del
 * doc. La derivación set-based en SQL es además robusta (sin pitfalls de JS Date
 * timezone) y atómica para las 165 filas.
 *
 * Source-agnostic: cubre TODO documento con IVA + período NULL (incluye el 1
 * income que no es de origen Nubox). Idempotente: sólo escribe donde el período
 * es NULL (re-ejecutable sin efecto).
 *
 * Seguro por defecto: DRY-RUN. Requiere `--apply` explícito para escribir.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/task-1191-backfill-fiscal-period.ts [--apply] [--rematerialize]
 *
 *   --apply           Aplica el UPDATE (sin él, sólo muestra el período derivado por doc).
 *   --rematerialize   Tras aplicar, re-materializa todas las posiciones VAT disponibles
 *                     (cierra el loop: el crédito/débito entra al F29). Idempotente.
 */

import process from 'node:process'

import { query } from '@/lib/db'
import { materializeAllAvailableVatPeriods } from '@/lib/finance/vat-ledger'

interface CliOptions {
  apply: boolean
  rematerialize: boolean
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)

  return {
    apply: args.includes('--apply'),
    rematerialize: args.includes('--rematerialize')
  }
}

type PreviewRow = {
  source_kind: string
  source_id: string
  source_date: string | null
  derived_year: number | null
  derived_month: number | null
}

// Predicado de elegibilidad — espejo EXACTO del signal
// `finance.vat.eligible_without_period` (TASK-1185), para que post-backfill el
// signal sea 0 por construcción. `*_date IS NOT NULL` garantiza derivabilidad.
const ELIGIBLE_PREVIEW_SQL = `
  SELECT 'income' AS source_kind,
         i.income_id AS source_id,
         i.invoice_date::text AS source_date,
         EXTRACT(YEAR FROM i.invoice_date)::int AS derived_year,
         EXTRACT(MONTH FROM i.invoice_date)::int AS derived_month
    FROM greenhouse_finance.income i
   WHERE COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
     AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
     AND (i.period_year IS NULL OR i.period_month IS NULL)
     AND i.invoice_date IS NOT NULL
  UNION ALL
  SELECT 'expense' AS source_kind,
         e.expense_id AS source_id,
         e.document_date::text AS source_date,
         EXTRACT(YEAR FROM e.document_date)::int AS derived_year,
         EXTRACT(MONTH FROM e.document_date)::int AS derived_month
    FROM greenhouse_finance.expenses e
   WHERE (COALESCE(e.recoverable_tax_amount, 0) > 0 OR COALESCE(e.non_recoverable_tax_amount, 0) > 0)
     AND (e.period_year IS NULL OR e.period_month IS NULL)
     AND e.document_date IS NOT NULL
  ORDER BY source_kind, source_date
`

// Docs con IVA + período NULL pero SIN fecha de documento → no derivables.
// Esperado: 0 (verificado en BD viva 2026-06-20). Si aparece > 0, reportar.
const UNDERIVABLE_SQL = `
  SELECT 'income' AS source_kind, COUNT(*)::int AS n
    FROM greenhouse_finance.income i
   WHERE COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
     AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
     AND (i.period_year IS NULL OR i.period_month IS NULL)
     AND i.invoice_date IS NULL
  UNION ALL
  SELECT 'expense' AS source_kind, COUNT(*)::int AS n
    FROM greenhouse_finance.expenses e
   WHERE (COALESCE(e.recoverable_tax_amount, 0) > 0 OR COALESCE(e.non_recoverable_tax_amount, 0) > 0)
     AND (e.period_year IS NULL OR e.period_month IS NULL)
     AND e.document_date IS NULL
`

const main = async (): Promise<void> => {
  const options = parseArgs()

  console.log('TASK-1191 — backfill período fiscal (F29) de docs con IVA sin período')
  console.log(`  mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}${options.rematerialize ? ' + REMATERIALIZE' : ''}`)
  console.log('')

  const preview = await query<PreviewRow>(ELIGIBLE_PREVIEW_SQL)
  const underivable = await query<{ source_kind: string; n: number }>(UNDERIVABLE_SQL)

  const incomeCount = preview.filter(r => r.source_kind === 'income').length
  const expenseCount = preview.filter(r => r.source_kind === 'expense').length

  console.log(`Elegibles sin período (derivables): income=${incomeCount} expense=${expenseCount} total=${preview.length}`)

  for (const row of preview) {
    console.log(
      `  [${options.apply ? 'APPLY' : 'DRY'}] ${row.source_kind.padEnd(7)} ${row.source_id.padEnd(18)} ` +
        `${row.source_date ?? 'NULL'} → período ${row.derived_year}-${String(row.derived_month).padStart(2, '0')}`
    )
  }

  const totalUnderivable = underivable.reduce((sum, r) => sum + Number(r.n), 0)

  if (totalUnderivable > 0) {
    console.warn(
      `\n⚠️  ${totalUnderivable} doc(s) con IVA sin período Y sin fecha de documento → NO derivables: ` +
        underivable.map(r => `${r.source_kind}=${r.n}`).join(' ')
    )
  }

  if (!options.apply) {
    console.log('\nDRY-RUN: no se escribió nada. Re-ejecuta con --apply para aplicar.')

    return
  }

  // Apply idempotente — sólo donde el período es NULL. Para columnas DATE,
  // EXTRACT == mes del calendario operativo (sin componente horario).
  const incomeUpdated = await query<{ income_id: string }>(`
    UPDATE greenhouse_finance.income i
       SET period_year = EXTRACT(YEAR FROM i.invoice_date)::int,
           period_month = EXTRACT(MONTH FROM i.invoice_date)::int,
           updated_at = NOW()
     WHERE COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
       AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
       AND (i.period_year IS NULL OR i.period_month IS NULL)
       AND i.invoice_date IS NOT NULL
    RETURNING i.income_id
  `)

  const expenseUpdated = await query<{ expense_id: string }>(`
    UPDATE greenhouse_finance.expenses e
       SET period_year = EXTRACT(YEAR FROM e.document_date)::int,
           period_month = EXTRACT(MONTH FROM e.document_date)::int,
           updated_at = NOW()
     WHERE (COALESCE(e.recoverable_tax_amount, 0) > 0 OR COALESCE(e.non_recoverable_tax_amount, 0) > 0)
       AND (e.period_year IS NULL OR e.period_month IS NULL)
       AND e.document_date IS NOT NULL
    RETURNING e.expense_id
  `)

  console.log(`\nAplicado: income=${incomeUpdated.length} expense=${expenseUpdated.length} filas con período estampado.`)

  // Verificación inmediata del signal (espejo del predicado).
  const remaining = await query<{ n: number }>(`
    WITH eligible_without_period AS (
      SELECT i.income_id AS source_id
        FROM greenhouse_finance.income i
       WHERE COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
         AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
         AND (i.period_year IS NULL OR i.period_month IS NULL)
      UNION ALL
      SELECT e.expense_id AS source_id
        FROM greenhouse_finance.expenses e
       WHERE (COALESCE(e.recoverable_tax_amount, 0) > 0 OR COALESCE(e.non_recoverable_tax_amount, 0) > 0)
         AND (e.period_year IS NULL OR e.period_month IS NULL)
    )
    SELECT COUNT(*)::int AS n FROM eligible_without_period
  `)

  console.log(`Signal finance.vat.eligible_without_period (post-backfill): ${remaining[0]?.n ?? 'NULL'} (esperado 0)`)

  if (options.rematerialize) {
    console.log('\nRe-materializando todas las posiciones VAT disponibles…')
    const result = await materializeAllAvailableVatPeriods('TASK-1191 backfill fiscal period re-materialization')

    console.log(`Períodos re-materializados: ${result.periods}`)

    let totalDebit = 0
    let totalCredit = 0

    for (const s of result.summaries) {
      totalDebit += s.debitFiscalAmountClp
      totalCredit += s.creditFiscalAmountClp
    }

    console.log(
      `Débito fiscal total CLP: ${Math.round(totalDebit).toLocaleString('es-CL')} | ` +
        `Crédito fiscal total CLP: ${Math.round(totalCredit).toLocaleString('es-CL')}`
    )
  }

  console.log('\nbackfill complete')
}

main().catch(err => {
  console.error('TASK-1191 backfill failed:', err)
  process.exit(1)
})
