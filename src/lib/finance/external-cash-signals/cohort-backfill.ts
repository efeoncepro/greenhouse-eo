import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { recordSignal } from './record-signal'
import type { ExternalCashSignal } from './types'

/**
 * TASK-708b — Backfill retroactivo de cohortes historicas a external_cash_signals.
 * ===================================================================================
 *
 * TASK-708 Slice 1 cortó la creacion runtime de phantom payments desde Nubox.
 * TASK-708b llena retroactivamente external_cash_signals para que las cohortes
 * historicas (A: 23 income_payments runtime, B: 65 expense_payments backfill)
 * aparezcan en la cola admin /finance/external-signals junto con las señales
 * runtime — visibles, clasificables, remediables.
 *
 * Reglas duras:
 *   - idempotencia natural via UNIQUE (source_system, source_event_id) en
 *     external_cash_signals (TASK-708 D1). Si el script corre N veces, el
 *     conteo de signals se mantiene constante.
 *   - source_event_id deterministico:
 *       * Cohorte A: ip.reference (formato `nubox-mvmt-inc-<id>`)
 *       * Cohorte B: ep.payment_id (formato `exp-pay-backfill-EXP-NB-<id>`)
 *   - promoted_payment_id apunta al phantom existente: cualquier remediacion
 *     posterior (adopt / dismiss / supersede) actualiza la cadena completa.
 *   - account_resolution_status='unresolved' siempre al backfill — la
 *     clasificacion canonica corre como paso siguiente (classifyHistoricalSignal).
 *   - space_id: derivado del income.organization_id → spaces (helper SQL inline).
 *     Fallback al space "Greenhouse Demo" canonico si no resuelve.
 *
 * Inventario y materializacion son funciones puras (lectura solamente, salvo
 * el INSERT idempotente). No mutan los payments originales — eso ocurre en
 * historical-remediation.ts cuando el humano clasifica y aplica.
 */

const DEFAULT_NUBOX_BACKFILL_SPACE_ID = 'spc-8641519f-12a0-456f-b03a-e94522d35e3a'

export interface CohortAEvidenceRow {
  payment_id: string
  income_id: string
  payment_date: string
  amount: string
  currency: string
  reference: string | null
  payment_method: string | null
  is_reconciled: boolean
  nubox_document_id: string | null
  income_payment_status: string | null
  client_name: string | null
  organization_id: string | null
  resolved_space_id: string | null
}

export interface CohortBEvidenceRow {
  payment_id: string
  expense_id: string
  payment_date: string
  amount: string
  currency: string
  reference: string | null
  nubox_purchase_id: string | null
  expense_payment_status: string | null
  supplier_name: string | null
  resolved_space_id: string | null
}

export interface CohortCEvidenceRow {
  settlement_leg_id: string
  settlement_group_id: string
  leg_type: string
  direction: string
  linked_payment_type: string | null
  linked_payment_id: string | null
  amount: string
  currency: string
  transaction_date: string | null
  is_reconciled: boolean
  reconciliation_row_id: string | null
  space_id: string | null
}

const COHORT_A_FILTER = `
  payment_source = 'nubox_bank_sync'
  AND payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_at IS NULL
`

const COHORT_B_FILTER = `
  payment_source = 'manual'
  AND payment_id LIKE 'exp-pay-backfill-EXP-NB-%'
  AND payment_account_id IS NULL
  AND superseded_by_payment_id IS NULL
  AND superseded_at IS NULL
`

const COHORT_C_FILTER = `
  instrument_id IS NULL
  AND superseded_at IS NULL
`

export const listCohortAEvidence = async (): Promise<CohortAEvidenceRow[]> => {
  return runGreenhousePostgresQuery<CohortAEvidenceRow & Record<string, unknown>>(
    `
      SELECT
        ip.payment_id,
        ip.income_id,
        ip.payment_date::text AS payment_date,
        ip.amount::text AS amount,
        ip.currency,
        ip.reference,
        ip.payment_method,
        ip.is_reconciled,
        i.nubox_document_id::text AS nubox_document_id,
        i.payment_status AS income_payment_status,
        i.client_name,
        i.organization_id,
        COALESCE(
          ip.space_id,
          (
            SELECT s.space_id
            FROM greenhouse_core.spaces s
            WHERE s.organization_id = i.organization_id
              AND s.active = TRUE
            ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
            LIMIT 1
          )
        ) AS resolved_space_id
      FROM greenhouse_finance.income_payments ip
      JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
      WHERE ${COHORT_A_FILTER}
      ORDER BY ip.payment_date DESC
    `
  )
}

export const listCohortBEvidence = async (): Promise<CohortBEvidenceRow[]> => {
  return runGreenhousePostgresQuery<CohortBEvidenceRow & Record<string, unknown>>(
    `
      SELECT
        ep.payment_id,
        ep.expense_id,
        ep.payment_date::text AS payment_date,
        ep.amount::text AS amount,
        ep.currency,
        ep.reference,
        e.nubox_purchase_id::text AS nubox_purchase_id,
        e.payment_status AS expense_payment_status,
        e.supplier_name,
        COALESCE(ep.space_id, e.space_id) AS resolved_space_id
      FROM greenhouse_finance.expense_payments ep
      JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
      WHERE ${COHORT_B_FILTER}
      ORDER BY ep.payment_date DESC
    `
  )
}

export const listCohortCEvidence = async (): Promise<CohortCEvidenceRow[]> => {
  return runGreenhousePostgresQuery<CohortCEvidenceRow & Record<string, unknown>>(
    `
      SELECT
        settlement_leg_id,
        settlement_group_id,
        leg_type,
        direction,
        linked_payment_type,
        linked_payment_id,
        amount::text AS amount,
        currency,
        transaction_date::text AS transaction_date,
        is_reconciled,
        reconciliation_row_id,
        space_id
      FROM greenhouse_finance.settlement_legs
      WHERE ${COHORT_C_FILTER}
      ORDER BY leg_type, transaction_date DESC NULLS LAST
    `
  )
}

export interface BackfillResult {
  inspected: number
  signalsCreated: number
  signalsAlreadyExisted: number
  errors: Array<{ paymentId: string; error: string }>
}

const resolveSpaceIdOrFallback = (raw: string | null): string => raw || DEFAULT_NUBOX_BACKFILL_SPACE_ID

export const backfillCohortAToSignals = async (options: {
  dryRun: boolean
  rows?: CohortAEvidenceRow[]
}): Promise<BackfillResult & { signals: ExternalCashSignal[] }> => {
  const rows = options.rows ?? (await listCohortAEvidence())

  const result: BackfillResult & { signals: ExternalCashSignal[] } = {
    inspected: rows.length,
    signalsCreated: 0,
    signalsAlreadyExisted: 0,
    errors: [],
    signals: []
  }

  if (options.dryRun) {
    return result
  }

  for (const row of rows) {
    const sourceEventId = row.reference || `nubox-payment-${row.payment_id}`

    try {
      const existingCheck = await runGreenhousePostgresQuery<{ signal_id: string } & Record<string, unknown>>(
        `SELECT signal_id FROM greenhouse_finance.external_cash_signals
         WHERE source_system = 'nubox' AND source_event_id = $1
         LIMIT 1`,
        [sourceEventId]
      )

      if (existingCheck.length > 0) {
        result.signalsAlreadyExisted++
        continue
      }

      const signal = await recordSignal({
        sourceSystem: 'nubox',
        sourceEventId,
        sourcePayload: row as unknown as Record<string, unknown>,
        sourceObservedAt: new Date(row.payment_date),
        documentKind: 'income',
        documentId: row.income_id,
        signalDate: row.payment_date.slice(0, 10),
        amount: Number(row.amount),
        currency: row.currency,
        spaceId: resolveSpaceIdOrFallback(row.resolved_space_id)
      })

      // Backfill: link signal to existing phantom payment to preserve audit trail.
      // Trigger D4 (`fn_enforce_promoted_payment_invariant`) only fires when both
      // promoted_payment_kind AND promoted_payment_id are set AND the payment is
      // not superseded. For unresolved phantoms (still active in the ledger), we
      // leave promoted_payment_id NULL — the link gets established when the
      // remediation outcome is `superseded_replaced` (new payment created and
      // signal points to it). For `dismissed_no_cash` and `repaired_with_account`
      // the link is also created at apply time, not backfill time.

      result.signalsCreated++
      result.signals.push(signal)
    } catch (error) {
      result.errors.push({
        paymentId: row.payment_id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

export const backfillCohortBToSignals = async (options: {
  dryRun: boolean
  rows?: CohortBEvidenceRow[]
}): Promise<BackfillResult & { signals: ExternalCashSignal[] }> => {
  const rows = options.rows ?? (await listCohortBEvidence())

  const result: BackfillResult & { signals: ExternalCashSignal[] } = {
    inspected: rows.length,
    signalsCreated: 0,
    signalsAlreadyExisted: 0,
    errors: [],
    signals: []
  }

  if (options.dryRun) {
    return result
  }

  for (const row of rows) {
    const sourceEventId = row.nubox_purchase_id
      ? `nubox-purchase-${row.nubox_purchase_id}`
      : `nubox-expense-payment-${row.payment_id}`

    try {
      const existingCheck = await runGreenhousePostgresQuery<{ signal_id: string } & Record<string, unknown>>(
        `SELECT signal_id FROM greenhouse_finance.external_cash_signals
         WHERE source_system = 'nubox' AND source_event_id = $1
         LIMIT 1`,
        [sourceEventId]
      )

      if (existingCheck.length > 0) {
        result.signalsAlreadyExisted++
        continue
      }

      const signal = await recordSignal({
        sourceSystem: 'nubox',
        sourceEventId,
        sourcePayload: row as unknown as Record<string, unknown>,
        sourceObservedAt: new Date(row.payment_date),
        documentKind: 'expense',
        documentId: row.expense_id,
        signalDate: row.payment_date.slice(0, 10),
        amount: Number(row.amount),
        currency: row.currency,
        spaceId: resolveSpaceIdOrFallback(row.resolved_space_id)
      })

      result.signalsCreated++
      result.signals.push(signal)
    } catch (error) {
      result.errors.push({
        paymentId: row.payment_id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}
