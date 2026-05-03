import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-768 Slice 7 — Reliability signals para economic_category unresolved.
 *
 * Cuenta filas en greenhouse_finance.expenses (o income) con
 * `economic_category IS NULL`. Estos registros no son legibles por consumers
 * analiticos canonicos (KPIs, ICO, P&L gerencial, Member Loaded Cost, Budget
 * Engine, Cost Attribution).
 *
 * Steady state esperado:
 *  - Pre-cutover (rows historicas pendientes en manual_queue): N > 0 hasta
 *    que UI Slice 6 las resuelva.
 *  - Post-cutover (CHECK NOT VALID + VALIDATE): N = 0.
 *
 * Cualquier valor > 0 post-cleanup indica:
 *  - Trigger bypass (writer paso por DELETE_FROM/INSERT que evade BEFORE INSERT).
 *  - Constraint violation que un admin manual override permitio.
 *  - Bug en el resolver canonico.
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0.
 */
export const EXPENSES_ECONOMIC_CATEGORY_UNRESOLVED_SIGNAL_ID =
  'finance.expenses.economic_category_unresolved'

export const INCOME_ECONOMIC_CATEGORY_UNRESOLVED_SIGNAL_ID =
  'finance.income.economic_category_unresolved'

const buildSignal = async (
  signalId: string,
  label: string,
  table: 'expenses' | 'income'
): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM greenhouse_finance.${table}
        WHERE economic_category IS NULL`
    )
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId,
      moduleKey: 'finance',
      kind: 'drift',
      source: `get${label.replace(/\s+/g, '')}Signal`,
      label,
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? `Sin filas con economic_category IS NULL en ${table}.`
          : `${count} fila${count === 1 ? '' : 's'} en greenhouse_finance.${table} sin economic_category. Resolver via UI Slice 6 o re-correr backfill.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `SELECT COUNT(*) FROM greenhouse_finance.${table} WHERE economic_category IS NULL`
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value:
            'docs/tasks/in-progress/TASK-768-finance-expense-economic-category-dimension.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: `reliability_signal_${table}_economic_category_unresolved` }
    })

    return {
      signalId,
      moduleKey: 'finance',
      kind: 'drift',
      source: `get${label.replace(/\s+/g, '')}Signal`,
      label,
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}

export const getExpensesEconomicCategoryUnresolvedSignal = (): Promise<ReliabilitySignal> =>
  buildSignal(
    EXPENSES_ECONOMIC_CATEGORY_UNRESOLVED_SIGNAL_ID,
    'Expenses economic_category unresolved',
    'expenses'
  )

export const getIncomeEconomicCategoryUnresolvedSignal = (): Promise<ReliabilitySignal> =>
  buildSignal(
    INCOME_ECONOMIC_CATEGORY_UNRESOLVED_SIGNAL_ID,
    'Income economic_category unresolved',
    'income'
  )
