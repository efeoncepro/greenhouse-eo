import 'server-only'

import { setReconciliationLinkInPostgres, updateStatementRowMatchInPostgres } from '@/lib/finance/postgres-reconciliation'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type StatementRowLink =
  | { kind: 'expense'; expenseId: string; paymentId: string | null }
  | { kind: 'income'; incomeId: string; paymentId: string }
  | { kind: 'settlement'; settlementLegId: string; settlementGroupId: string }

/**
 * Vincula manualmente una fila de cartola a su objeto canónico (confianza
 * 1.0, `manual_matched`). Command compartido por `finance:reconcile-rows` y
 * `finance:ledger-adjust`; es el mismo efecto que el match manual del portal
 * (`POST /api/finance/reconciliation/[id]/match`) extendido a patas de
 * settlement sin pago asociado (traspasos internos, funding, FX).
 */
export const linkStatementRow = async (
  row: { row_id: string; period_id: string },
  link: StatementRowLink,
  actorUserId: string
): Promise<void> => {
  const matchedType = link.kind === 'settlement' ? 'settlement' : link.kind
  const matchedId = link.kind === 'expense' ? link.expenseId : link.kind === 'income' ? link.incomeId : link.settlementGroupId
  const matchedPaymentId = link.kind === 'settlement' ? null : link.paymentId
  const matchedSettlementLegId = link.kind === 'settlement' ? link.settlementLegId : null

  await updateStatementRowMatchInPostgres(row.row_id, row.period_id, {
    matchStatus: 'manual_matched',
    matchedType,
    matchedId,
    matchedPaymentId,
    matchedSettlementLegId,
    matchConfidence: 1,
    matchedByUserId: actorUserId
  })

  if (link.kind !== 'settlement' && matchedPaymentId) {
    await setReconciliationLinkInPostgres({
      matchedType: link.kind,
      matchedId,
      matchedPaymentId,
      matchedSettlementLegId: null,
      rowId: row.row_id,
      matchedBy: actorUserId
    })
  }

  if (link.kind === 'settlement') {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.settlement_legs
       SET is_reconciled = TRUE, reconciliation_row_id = $2, reconciled_at = NOW(), updated_at = NOW()
       WHERE settlement_leg_id = $1`,
      [link.settlementLegId, row.row_id]
    )
  }
}

/** Devuelve la fila a `unmatched` (espejo de `clearStatementRowMatchInPostgres` + limpieza de la pata/pago vinculado). */
export const unlinkStatementRow = async (rowId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.settlement_legs SET is_reconciled = FALSE, reconciliation_row_id = NULL, reconciled_at = NULL, updated_at = NOW()
     WHERE reconciliation_row_id = $1`,
    [rowId]
  )
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.bank_statement_rows
     SET match_status = 'unmatched', matched_type = NULL, matched_id = NULL, matched_payment_id = NULL,
         matched_settlement_leg_id = NULL, match_confidence = NULL, matched_by_user_id = NULL, matched_at = NULL
     WHERE row_id = $1`,
    [rowId]
  )
}
