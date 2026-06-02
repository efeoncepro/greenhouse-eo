import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-979 — store append-only de las corridas mensuales de pago a contractors.
 *
 * Mirror del patrón canónico TASK-900 `ico_materialization_runs`: la tabla es
 * INSERT-only con trigger anti-UPDATE/DELETE; el único UPDATE permitido es el
 * patch `running → succeeded|failed` de la misma fila.
 *
 * La idempotencia de la corrida NO vive acá — vive en el filtro un-ordered del
 * orquestador + el lock UNIQUE de `payment_order_lines(obligation_id)`. Esta tabla
 * es auditoría ("quién corrió la de mayo y qué preparó") + observabilidad.
 */

export type ContractorPaymentRunStatus = 'running' | 'succeeded' | 'failed'

export type ContractorPaymentRunTriggerSource = 'manual' | 'scheduled'

export interface ContractorPaymentRunCurrencyTotal {
  payables: number
  netTotal: string
}

export interface ContractorPaymentRun {
  paymentRunId: string
  periodYear: number
  periodMonth: number
  triggerSource: ContractorPaymentRunTriggerSource
  triggeredByUserId: string | null
  status: ContractorPaymentRunStatus
  cutoffDate: string | null
  preparedOrderIds: string[]
  payablesIncluded: number | null
  obligationsSwept: number | null
  totalsByCurrency: Record<string, ContractorPaymentRunCurrencyTotal> | null
  notes: string | null
  startedAt: string
  completedAt: string | null
}

type ContractorPaymentRunRow = {
  payment_run_id: string
  period_year: number
  period_month: number
  trigger_source: ContractorPaymentRunTriggerSource
  triggered_by_user_id: string | null
  status: ContractorPaymentRunStatus
  cutoff_date: string | null
  prepared_order_ids: string[]
  payables_included: number | null
  obligations_swept: number | null
  totals_by_currency: Record<string, ContractorPaymentRunCurrencyTotal> | null
  notes: string | null
  started_at: string
  completed_at: string | null
}

const RUN_SELECT_COLUMNS = `
  payment_run_id, period_year, period_month, trigger_source, triggered_by_user_id,
  status, cutoff_date, prepared_order_ids, payables_included, obligations_swept,
  totals_by_currency, notes, started_at, completed_at
`

const mapRun = (row: ContractorPaymentRunRow): ContractorPaymentRun => ({
  paymentRunId: row.payment_run_id,
  periodYear: row.period_year,
  periodMonth: row.period_month,
  triggerSource: row.trigger_source,
  triggeredByUserId: row.triggered_by_user_id,
  status: row.status,
  cutoffDate: row.cutoff_date,
  preparedOrderIds: row.prepared_order_ids ?? [],
  payablesIncluded: row.payables_included,
  obligationsSwept: row.obligations_swept,
  totalsByCurrency: row.totals_by_currency,
  notes: row.notes,
  startedAt: row.started_at,
  completedAt: row.completed_at
})

export const beginContractorPaymentRun = async (input: {
  periodYear: number
  periodMonth: number
  triggerSource: ContractorPaymentRunTriggerSource
  triggeredByUserId: string | null
  cutoffDate: string
}): Promise<string> => {
  const rows = await query<{ payment_run_id: string }>(
    `INSERT INTO greenhouse_sync.contractor_payment_runs (
       period_year, period_month, trigger_source, triggered_by_user_id, cutoff_date, status
     ) VALUES ($1, $2, $3, $4, $5, 'running')
     RETURNING payment_run_id`,
    [
      input.periodYear,
      input.periodMonth,
      input.triggerSource,
      input.triggeredByUserId,
      input.cutoffDate
    ]
  )

  return rows[0].payment_run_id
}

export const completeContractorPaymentRun = async (input: {
  paymentRunId: string
  preparedOrderIds: string[]
  payablesIncluded: number
  obligationsSwept: number
  totalsByCurrency: Record<string, ContractorPaymentRunCurrencyTotal>
  notes?: string | null
}): Promise<void> => {
  await query(
    `UPDATE greenhouse_sync.contractor_payment_runs
     SET status = 'succeeded',
         completed_at = NOW(),
         prepared_order_ids = $2::text[],
         payables_included = $3,
         obligations_swept = $4,
         totals_by_currency = $5::jsonb,
         notes = $6
     WHERE payment_run_id = $1 AND status = 'running'`,
    [
      input.paymentRunId,
      input.preparedOrderIds,
      input.payablesIncluded,
      input.obligationsSwept,
      JSON.stringify(input.totalsByCurrency),
      input.notes ?? null
    ]
  )
}

export const failContractorPaymentRun = async (input: {
  paymentRunId: string
  errorMessage: string
}): Promise<void> => {
  await query(
    `UPDATE greenhouse_sync.contractor_payment_runs
     SET status = 'failed', completed_at = NOW(), notes = $2
     WHERE payment_run_id = $1 AND status = 'running'`,
    [input.paymentRunId, input.errorMessage.slice(0, 2000)]
  )
}

export const getLastContractorPaymentRun = async (input: {
  periodYear: number
  periodMonth: number
}): Promise<ContractorPaymentRun | null> => {
  const rows = await query<ContractorPaymentRunRow>(
    `SELECT ${RUN_SELECT_COLUMNS}
     FROM greenhouse_sync.contractor_payment_runs
     WHERE period_year = $1 AND period_month = $2
     ORDER BY started_at DESC
     LIMIT 1`,
    [input.periodYear, input.periodMonth]
  )

  return rows[0] ? mapRun(rows[0]) : null
}
