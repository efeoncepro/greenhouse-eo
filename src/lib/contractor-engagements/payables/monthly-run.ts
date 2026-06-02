import 'server-only'

import {
  addBusinessDays,
  DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS,
  getLastBusinessDayOfMonth,
  type OperationalCalendarContextInput
} from '@/lib/calendar/operational-calendar'
import { query, withGreenhousePostgresTransaction } from '@/lib/db'
import { createPaymentOrderFromObligations } from '@/lib/finance/payment-orders/create-from-obligations'
import { captureWithDomain } from '@/lib/observability/capture'

import { markPayablePaymentOrderCreated } from './store'
import {
  beginContractorPaymentRun,
  completeContractorPaymentRun,
  failContractorPaymentRun,
  type ContractorPaymentRunCurrencyTotal,
  type ContractorPaymentRunTriggerSource
} from './payment-run-store'

/**
 * TASK-979 — Monthly Contractor Payment Run orchestrator.
 *
 * Barre los `payment_obligations` `provider_payroll` (source_kind
 * 'contractor_payable') aún NO batcheados en una payment order y los agrupa por
 * MONEDA en payment orders `pending_approval` (NO paga sola). Honra el compromiso
 * de los 5 días hábiles (TASK-978): el cutoff = cierre del mes operativo + 5 días
 * hábiles; barre todo lo vencido contra ese cutoff (incluye overdue stranded de
 * meses previos) y prioriza por due_date ASC.
 *
 * Idempotencia (defensa en profundidad, sin tabla nueva en el hot path):
 *   1. Filtro un-ordered: LEFT JOIN payment_order_lines (line NULL) → una obligación
 *      ya batcheada nunca se re-toma.
 *   2. status orderable: al crear la orden la obligación pasa a 'scheduled' → sale
 *      del set 'generated'.
 *   3. Lock UNIQUE de payment_order_lines(obligation_id) → dos corridas concurrentes:
 *      el perdedor aborta con `obligation_already_locked` (sin estado parcial).
 *
 * Atomicidad: todas las orders + las transiciones de payable a
 * `payment_order_created` corren en UNA transacción. Si algo falla, rollback total
 * (cero órdenes parciales) → re-correr es safe.
 *
 * La corrida queda auditada en `greenhouse_sync.contractor_payment_runs`
 * (running → succeeded|failed). El dry-run NO crea fila de corrida ni muta nada.
 */

// createPaymentOrderFromObligations tope: 500 obligaciones por orden.
const MAX_OBLIGATIONS_PER_ORDER = 500

const MONTH_LABELS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

type SweptObligationRow = {
  obligation_id: string
  contractor_payable_id: string
  currency: string
  amount: string
  due_date: string | null
}

export interface MonthlyContractorPaymentRunGroup {
  currency: string
  obligationCount: number
  payableCount: number
  netTotal: string
}

export interface PrepareMonthlyContractorPaymentRunInput {
  periodYear: number
  periodMonth: number
  triggeredByUserId: string
  triggerSource?: ContractorPaymentRunTriggerSource
  dryRun?: boolean
  calendarOptions?: OperationalCalendarContextInput | null
}

export interface MonthlyContractorPaymentRunResult {
  periodYear: number
  periodMonth: number
  cutoffDate: string
  dryRun: boolean
  paymentRunId: string | null
  preparedOrderIds: string[]
  obligationsSwept: number
  payablesIncluded: number
  groups: MonthlyContractorPaymentRunGroup[]
  totalsByCurrency: Record<string, ContractorPaymentRunCurrencyTotal>
  /** true cuando el barrido no encontró obligaciones (idempotente: nada que preparar). */
  alreadyPrepared: boolean
}

const SWEEP_SQL = `
  SELECT
    o.obligation_id,
    o.source_ref AS contractor_payable_id,
    o.currency,
    o.amount::text AS amount,
    o.due_date
  FROM greenhouse_finance.payment_obligations o
  LEFT JOIN greenhouse_finance.payment_order_lines pol
    ON o.obligation_id = pol.obligation_id
   AND pol.state NOT IN ('cancelled', 'failed')
  WHERE o.source_kind = 'contractor_payable'
    AND o.obligation_kind = 'provider_payroll'
    AND o.status IN ('generated', 'partially_paid')
    AND pol.line_id IS NULL
    AND (o.due_date IS NULL OR o.due_date <= $1::date)
  ORDER BY o.due_date ASC NULLS FIRST, o.obligation_id ASC
`

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }

  
return out
}

const groupRowsByCurrency = (rows: readonly SweptObligationRow[]): Map<string, SweptObligationRow[]> => {
  const byCurrency = new Map<string, SweptObligationRow[]>()

  for (const row of rows) {
    const list = byCurrency.get(row.currency) ?? []

    list.push(row)
    byCurrency.set(row.currency, list)
  }

  
return byCurrency
}

const buildGroups = (
  byCurrency: Map<string, SweptObligationRow[]>
): { groups: MonthlyContractorPaymentRunGroup[]; totalsByCurrency: Record<string, ContractorPaymentRunCurrencyTotal> } => {
  const groups: MonthlyContractorPaymentRunGroup[] = []
  const totalsByCurrency: Record<string, ContractorPaymentRunCurrencyTotal> = {}

  for (const [currency, list] of byCurrency) {
    const net = list.reduce((acc, r) => acc + Number(r.amount), 0)
    const payableCount = new Set(list.map(r => r.contractor_payable_id)).size
    const netTotal = net.toFixed(2)

    groups.push({ currency, obligationCount: list.length, payableCount, netTotal })
    totalsByCurrency[currency] = { payables: payableCount, netTotal }
  }

  return { groups, totalsByCurrency }
}

export const prepareMonthlyContractorPaymentRun = async (
  input: PrepareMonthlyContractorPaymentRunInput
): Promise<MonthlyContractorPaymentRunResult> => {
  const { periodYear, periodMonth, triggeredByUserId } = input
  const dryRun = input.dryRun ?? false
  const triggerSource = input.triggerSource ?? 'manual'
  const calendarOptions = input.calendarOptions ?? null

  // Cutoff = cierre del mes operativo (Y, M) + 5 días hábiles (TASK-978 compromiso).
  const monthClose = getLastBusinessDayOfMonth(periodYear, periodMonth, calendarOptions)

  const cutoffDate = addBusinessDays(
    monthClose,
    DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS,
    calendarOptions
  )

  const swept = await query<SweptObligationRow>(SWEEP_SQL, [cutoffDate])
  const byCurrency = groupRowsByCurrency(swept)
  const { groups, totalsByCurrency } = buildGroups(byCurrency)
  const payablesIncluded = new Set(swept.map(r => r.contractor_payable_id)).size

  const base: Omit<MonthlyContractorPaymentRunResult, 'paymentRunId' | 'preparedOrderIds'> = {
    periodYear,
    periodMonth,
    cutoffDate,
    dryRun,
    obligationsSwept: swept.length,
    payablesIncluded,
    groups,
    totalsByCurrency,
    alreadyPrepared: swept.length === 0
  }

  if (dryRun) {
    return { ...base, paymentRunId: null, preparedOrderIds: [] }
  }

  const monthLabel = `${MONTH_LABELS_ES[periodMonth - 1]} ${periodYear}`

  const paymentRunId = await beginContractorPaymentRun({
    periodYear,
    periodMonth,
    triggerSource,
    triggeredByUserId: triggerSource === 'scheduled' ? null : triggeredByUserId,
    cutoffDate
  })

  try {
    const preparedOrderIds = await withGreenhousePostgresTransaction(async (client) => {
      const orderIds: string[] = []

      for (const [currency, list] of byCurrency) {
        const batches = chunk(list, MAX_OBLIGATIONS_PER_ORDER)

        for (let i = 0; i < batches.length; i += 1) {
          const batch = batches[i]

          const title =
            batches.length > 1
              ? `Corrida contractors ${monthLabel} · ${currency} (lote ${i + 1})`
              : `Corrida contractors ${monthLabel} · ${currency}`

          const { order } = await createPaymentOrderFromObligations(
            {
              batchKind: 'supplier',
              title,
              obligationIds: batch.map(r => r.obligation_id),
              dueDate: cutoffDate,
              requireApproval: true,
              createdBy: triggeredByUserId,
              metadata: {
                source: 'contractor_monthly_run',
                paymentRunId,
                periodYear,
                periodMonth
              }
            },
            client
          )

          orderIds.push(order.orderId)

          for (const row of batch) {
            await markPayablePaymentOrderCreated(
              {
                contractorPayableId: row.contractor_payable_id,
                paymentOrderId: order.orderId,
                actorUserId: triggeredByUserId
              },
              client
            )
          }
        }
      }

      return orderIds
    })

    await completeContractorPaymentRun({
      paymentRunId,
      preparedOrderIds,
      payablesIncluded,
      obligationsSwept: swept.length,
      totalsByCurrency,
      notes: preparedOrderIds.length === 0 ? 'Sin obligaciones para preparar.' : null
    })

    return { ...base, paymentRunId, preparedOrderIds }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'contractor_monthly_run', stage: 'prepare' },
      extra: { periodYear, periodMonth, paymentRunId }
    })
    await failContractorPaymentRun({
      paymentRunId,
      errorMessage: error instanceof Error ? error.message : String(error)
    }).catch(() => undefined)
    throw error
  }
}
