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

    // Crea la nueva (mismo idempotency key con el de la original generara
    // duplicate-detection — el caller debe pasar new* values nuevos o
    // un sourceRef distinto si la idempotency aplica).
    const replacementResult = await createPaymentObligation(input.newObligation, client)
    const replacement = replacementResult.obligation

    // Marca original superseded apuntando a la nueva
    const updatedOriginal = await client.query<ObligationRow>(
      `UPDATE greenhouse_finance.payment_obligations
          SET status = 'superseded',
              superseded_by = $2,
              cancelled_reason = $3,
              updated_at = now()
        WHERE obligation_id = $1
        RETURNING *`,
      [input.originalObligationId, replacement.obligationId, input.reason.trim()]
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
