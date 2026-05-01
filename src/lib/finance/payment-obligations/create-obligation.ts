import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  PaymentObligation,
  PaymentObligationBeneficiaryType,
  PaymentObligationCurrency,
  PaymentObligationKind,
  PaymentObligationSourceKind,
  PaymentObligationStatus
} from '@/types/payment-obligations'

import { mapObligationRow, type ObligationRow } from './row-mapper'

export class PaymentObligationValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'PaymentObligationValidationError'
    this.statusCode = statusCode
  }
}

export interface CreatePaymentObligationInput {
  spaceId?: string | null
  sourceKind: PaymentObligationSourceKind
  sourceRef: string
  periodId?: string | null
  beneficiaryType: PaymentObligationBeneficiaryType
  beneficiaryId: string
  beneficiaryName?: string | null
  obligationKind: PaymentObligationKind
  amount: number
  currency: PaymentObligationCurrency
  dueDate?: string | null
  metadata?: Record<string, unknown>
  initialStatus?: PaymentObligationStatus
}

export type CreatePaymentObligationResult =
  | { created: true; obligation: PaymentObligation; eventId: string }
  | { created: false; obligation: PaymentObligation; reason: 'duplicate' }

const buildObligationId = () => `pob-${randomUUID()}`

const validateInput = (input: CreatePaymentObligationInput): void => {
  if (!input.sourceRef) throw new PaymentObligationValidationError('sourceRef requerido')
  if (!input.beneficiaryId) throw new PaymentObligationValidationError('beneficiaryId requerido')

  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new PaymentObligationValidationError(`amount debe ser >= 0, recibido ${input.amount}`)
  }

  if (input.currency !== 'CLP' && input.currency !== 'USD') {
    throw new PaymentObligationValidationError(`currency invalida: ${input.currency}`)
  }
}

/**
 * Crea una payment_obligation idempotente. Si ya existe una row viva
 * (status NOT IN superseded/cancelled) con la misma idempotency key
 * (source_kind + source_ref + obligation_kind + beneficiary_id + period_id),
 * retorna `{ created: false, obligation: existing, reason: 'duplicate' }`
 * sin lanzar error y sin emitir outbox event nuevo.
 *
 * Caso happy: INSERT + outbox event `finance.payment_obligation.generated`
 * dentro de la misma transaccion.
 */
export async function createPaymentObligation(
  input: CreatePaymentObligationInput,
  client?: PoolClient
): Promise<CreatePaymentObligationResult> {
  validateInput(input)

  const obligationId = buildObligationId()
  const status: PaymentObligationStatus = input.initialStatus ?? 'generated'
  const periodIdForKey = input.periodId ?? null

  const run = async (c: PoolClient): Promise<CreatePaymentObligationResult> => {
    // Check idempotencia ANTES de insertar para devolver el row pre-existente
    // sin pelear con el partial unique index. Esto facilita re-export retries.
    const existing = await c.query<ObligationRow>(
      `SELECT * FROM greenhouse_finance.payment_obligations
       WHERE source_kind = $1
         AND source_ref = $2
         AND obligation_kind = $3
         AND beneficiary_id = $4
         AND COALESCE(period_id, '__no_period__') = COALESCE($5::text, '__no_period__')
         AND status NOT IN ('superseded', 'cancelled')
       LIMIT 1`,
      [
        input.sourceKind,
        input.sourceRef,
        input.obligationKind,
        input.beneficiaryId,
        periodIdForKey
      ]
    )

    if ((existing.rowCount ?? 0) > 0) {
      return {
        created: false,
        obligation: mapObligationRow(existing.rows[0]),
        reason: 'duplicate' as const
      }
    }

    const inserted = await c.query<ObligationRow>(
      `INSERT INTO greenhouse_finance.payment_obligations (
         obligation_id, space_id,
         source_kind, source_ref, period_id,
         beneficiary_type, beneficiary_id, beneficiary_name,
         obligation_kind, amount, currency,
         status, due_date, metadata_json
       )
       VALUES ($1, $2,
               $3, $4, $5,
               $6, $7, $8,
               $9, $10, $11,
               $12, $13::date, $14::jsonb)
       RETURNING *`,
      [
        obligationId,
        input.spaceId ?? null,
        input.sourceKind,
        input.sourceRef,
        periodIdForKey,
        input.beneficiaryType,
        input.beneficiaryId,
        input.beneficiaryName ?? null,
        input.obligationKind,
        input.amount,
        input.currency,
        status,
        input.dueDate ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    )

    const obligation = mapObligationRow(inserted.rows[0])

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_obligation',
        aggregateId: obligation.obligationId,
        eventType: 'finance.payment_obligation.generated',
        payload: {
          obligationId: obligation.obligationId,
          sourceKind: obligation.sourceKind,
          sourceRef: obligation.sourceRef,
          periodId: obligation.periodId,
          beneficiaryType: obligation.beneficiaryType,
          beneficiaryId: obligation.beneficiaryId,
          obligationKind: obligation.obligationKind,
          amount: obligation.amount,
          currency: obligation.currency,
          status: obligation.status,
          spaceId: obligation.spaceId
        }
      },
      c
    )

    return { created: true, obligation, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
