import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'

import {
  createPaymentObligation,
  type CreatePaymentObligationInput
} from './create-obligation'
import { mapObligationRow, type ObligationRow } from './row-mapper'
import { supersedePaymentObligation } from './supersede-obligation'

export interface ReconcileResult {
  action: 'created' | 'superseded' | 'unchanged'
  obligationId: string
  previousAmount: number | null
}

const ROUND = (v: number) => Math.round(v * 100) / 100

/**
 * Materializa una obligation con semántica idempotente + reconciliación
 * automática:
 *
 *   - Si NO existe obligation viva con la idempotency key → CREATE.
 *   - Si existe con MISMO amount y MISMO obligation_kind → unchanged (skip).
 *   - Si existe pero el `amount` o `obligation_kind` cambió → SUPERSEDE
 *     atomicamente y CREATE la nueva con los valores actualizados.
 *
 * Esto cubre el caso de drift: una versión previa quedó con un valor
 * incorrecto (ej. amount=0 placeholder de Deel) y queremos auto-sanar
 * sin intervención manual.
 *
 * NO toca obligations en estado `paid`, `reconciled` o `closed` —
 * esos casos requieren una `reliquidation_delta` separada para no
 * romper la historia financiera. Si se detecta un drift sobre una
 * obligation paid, retorna `unchanged` y deja el note arriba para
 * que el operator decida.
 */
export async function reconcilePaymentObligation(
  input: CreatePaymentObligationInput,
  client?: PoolClient
): Promise<ReconcileResult> {
  const targetAmount = ROUND(input.amount)
  const periodIdForKey = input.periodId ?? null

  const run = async (c: PoolClient): Promise<ReconcileResult> => {
    const existing = await c.query<ObligationRow>(
      `SELECT * FROM greenhouse_finance.payment_obligations
        WHERE source_kind = $1
          AND source_ref = $2
          AND obligation_kind = $3
          AND beneficiary_id = $4
          AND COALESCE(period_id, '__no_period__') = COALESCE($5::text, '__no_period__')
          AND status NOT IN ('superseded', 'cancelled')
        ORDER BY created_at DESC
        LIMIT 1`,
      [
        input.sourceKind,
        input.sourceRef,
        input.obligationKind,
        input.beneficiaryId,
        periodIdForKey
      ]
    )

    if ((existing.rowCount ?? 0) === 0) {
      const result = await createPaymentObligation(input, c)

      return {
        action: 'created',
        obligationId: result.obligation.obligationId,
        previousAmount: null
      }
    }

    const current = mapObligationRow(existing.rows[0])
    const currentAmount = ROUND(current.amount)

    if (currentAmount === targetAmount) {
      return {
        action: 'unchanged',
        obligationId: current.obligationId,
        previousAmount: currentAmount
      }
    }

    // Bloqueo de seguridad: nunca reconciliar obligations ya pagadas.
    // Esos casos viven en TASK-755 V2 (reliquidation delta para obligations).
    if (
      current.status === 'paid' ||
      current.status === 'reconciled' ||
      current.status === 'closed'
    ) {
      return {
        action: 'unchanged',
        obligationId: current.obligationId,
        previousAmount: currentAmount
      }
    }

    // Supersede atomic: el helper supersedePaymentObligation hace
    // mark old + create new + outbox event en una sola tx interna.
    // No le podemos pasar el client externo; corre su propia tx.
    const result = await supersedePaymentObligation({
      originalObligationId: current.obligationId,
      reason: `auto_reconciled drift: amount=${currentAmount} → ${targetAmount} (idempotency: source_ref=${input.sourceRef}, kind=${input.obligationKind})`,
      newObligation: input
    })

    return {
      action: 'superseded',
      obligationId: result.replacement.obligationId,
      previousAmount: currentAmount
    }
  }

  if (client) return run(client)

  return withTransaction(run)
}
