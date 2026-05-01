import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { PaymentObligation } from '@/types/payment-obligations'

import { PaymentObligationValidationError, createPaymentObligation } from './create-obligation'
import { mapObligationRow, type ObligationRow } from './row-mapper'

export interface SupersedeObligationInput {
  /** ID de la obligation existente (status='generated' o 'scheduled') que sera reemplazada. */
  originalObligationId: string
  /** Datos de la nueva obligation que reemplaza. Idempotency key debe coincidir. */
  newObligation: Parameters<typeof createPaymentObligation>[0]
  /** Razon humana del reemplazo (audit). */
  reason: string
}

/**
 * Supersede chain: marca la obligation original como `superseded`, apunta su
 * `superseded_by` a la nueva row, emite outbox event `finance.payment_obligation.superseded`.
 *
 * Si la original esta paid/reconciled/closed, NO se reemplaza — se rechaza
 * con error porque ya impacto efectivo en caja. En ese caso el caller debe
 * crear una obligation `reliquidation_delta` (tipo independiente) en lugar.
 */
export async function supersedePaymentObligation(
  input: SupersedeObligationInput
): Promise<{ original: PaymentObligation; replacement: PaymentObligation; eventId: string }> {
  if (!input.reason || input.reason.trim().length < 5) {
    throw new PaymentObligationValidationError('reason requiere al menos 5 caracteres')
  }

  return withTransaction(async (client: PoolClient) => {
    const originalRes = await client.query<ObligationRow>(
      `SELECT * FROM greenhouse_finance.payment_obligations
        WHERE obligation_id = $1
        FOR UPDATE`,
      [input.originalObligationId]
    )

    if ((originalRes.rowCount ?? 0) === 0) {
      throw new PaymentObligationValidationError(
        `Obligation ${input.originalObligationId} no encontrada`,
        404
      )
    }

    const originalRow = originalRes.rows[0]
    const status = originalRow.status

    if (
      status === 'paid' ||
      status === 'reconciled' ||
      status === 'closed' ||
      status === 'partially_paid'
    ) {
      throw new PaymentObligationValidationError(
        `Obligation ${input.originalObligationId} en estado '${status}' no puede ser supersedida; emite reliquidation_delta como obligation independiente.`,
        409
      )
    }

    if (status === 'superseded' || status === 'cancelled') {
      throw new PaymentObligationValidationError(
        `Obligation ${input.originalObligationId} ya esta '${status}'.`,
        409
      )
    }

    // CRITICAL ORDERING (TASK-759 V2 fix):
    // 1) Marcar la original como superseded PRIMERO (sin superseded_by todavia).
    // 2) Insertar la replacement DESPUES — el idempotency check en
    //    createPaymentObligation filtra status IN (superseded, cancelled),
    //    asi que NO matcheara la original ya marcada.
    // 3) UPDATE final de superseded_by con el id real de la replacement.
    //
    // Si invertimos el orden (createPaymentObligation primero), la
    // idempotency check matchea la original viva y retorna `created:false`
    // con el SAME id → UPDATE termina haciendo self-supersede
    // (`superseded_by = original_id`) y la nueva row NUNCA se inserta.
    // Sintoma: row "fantasma" superseded apuntando a si misma + monto correcto
    // jamas materializado. Bug observado en period 2026-04 Previred.

    await client.query(
      `UPDATE greenhouse_finance.payment_obligations
          SET status = 'superseded',
              cancelled_reason = $2,
              updated_at = now()
        WHERE obligation_id = $1`,
      [input.originalObligationId, input.reason.trim()]
    )

    const replacementResult = await createPaymentObligation(input.newObligation, client)
    const replacement = replacementResult.obligation

    // Sanity: la idempotency check NO debe haber matchedo el original
    // (acabamos de marcarlo superseded). Si pasa, es bug grave del helper.
    if (replacement.obligationId === input.originalObligationId) {
      throw new PaymentObligationValidationError(
        `supersedePaymentObligation: replacement collapsed to original id ${input.originalObligationId}. Idempotency check did not honor superseded filter.`,
        500
      )
    }

    const updatedOriginal = await client.query<ObligationRow>(
      `UPDATE greenhouse_finance.payment_obligations
          SET superseded_by = $2,
              updated_at = now()
        WHERE obligation_id = $1
        RETURNING *`,
      [input.originalObligationId, replacement.obligationId]
    )

    const original = mapObligationRow(updatedOriginal.rows[0])

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_obligation',
        aggregateId: original.obligationId,
        eventType: 'finance.payment_obligation.superseded',
        payload: {
          obligationId: original.obligationId,
          supersededBy: replacement.obligationId,
          reason: input.reason.trim(),
          originalAmount: original.amount,
          replacementAmount: replacement.amount,
          deltaAmount: replacement.amount - original.amount,
          currency: original.currency,
          beneficiaryId: original.beneficiaryId,
          obligationKind: original.obligationKind
        }
      },
      client
    )

    return { original, replacement, eventId }
  })
}
