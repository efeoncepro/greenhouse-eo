import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { resolvePaymentRoute } from '@/lib/finance/payment-routing/resolve-route'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  PaymentOrder,
  PaymentOrderBatchKind,
  PaymentOrderCurrency,
  PaymentOrderPaymentMethod
} from '@/types/payment-orders'
import {
  canCreatePaymentOrderFromObligationStatus,
  type PaymentObligationStatus
} from '@/types/payment-obligations'

import { PaymentOrderConflictError, PaymentOrderValidationError } from './errors'
import { mapOrderRow, type OrderRow } from './row-mapper'
import { resolvePaymentOrderSourcePolicy } from './source-instrument-policy'

interface ObligationRefRow {
  obligation_id: string
  amount: number | string
  currency: string
  beneficiary_type: string
  beneficiary_id: string
  beneficiary_name: string | null
  obligation_kind: string
  status: string
  space_id: string | null
  period_id: string | null
  metadata_json: Record<string, unknown> | null
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const buildOrderId = () => `por-${randomUUID()}`
const buildLineId = () => `pol-${randomUUID()}`

export interface CreatePaymentOrderInput {
  spaceId?: string | null
  batchKind: PaymentOrderBatchKind
  periodId?: string | null
  title: string
  description?: string | null
  processorSlug?: string | null
  paymentMethod?: PaymentOrderPaymentMethod | null
  sourceAccountId?: string | null
  scheduledFor?: string | null
  dueDate?: string | null
  obligationIds: string[]
  /**
   * Mapa de override `{ obligationId: amountToPay }` para pago parcial.
   * Si no se entrega, la line toma el `amount` completo de la obligation.
   */
  partialAmounts?: Record<string, number>
  requireApproval?: boolean
  createdBy: string
  metadata?: Record<string, unknown>
}

const validateInput = (input: CreatePaymentOrderInput): void => {
  if (!input.createdBy) {
    throw new PaymentOrderValidationError('createdBy es requerido')
  }

  if (!input.title || !input.title.trim()) {
    throw new PaymentOrderValidationError('title es requerido')
  }

  if (!Array.isArray(input.obligationIds) || input.obligationIds.length === 0) {
    throw new PaymentOrderValidationError('obligationIds debe contener al menos una obligacion')
  }

  if (input.obligationIds.length > 500) {
    throw new PaymentOrderValidationError('Una payment order no puede agrupar mas de 500 obligations en V1')
  }

  const seen = new Set<string>()

  for (const id of input.obligationIds) {
    if (seen.has(id)) {
      throw new PaymentOrderValidationError(`obligation_id duplicado en input: ${id}`)
    }

    seen.add(id)
  }
}

/**
 * Crea una payment_order a partir de N obligations, locking las obligations
 * via partial unique index sobre payment_order_lines.obligation_id.
 *
 * - Si alguna obligation ya esta lockeada en otra order viva → throw conflict.
 * - Si alguna obligation no existe o esta cancelled/superseded/paid → throw.
 * - Si require_approval=true → state inicial = 'pending_approval' (sin approvedBy).
 * - Si require_approval=false → state inicial = 'approved' (auto-aprueba con createdBy).
 * - Currency: si todas las obligations comparten currency, la order la toma. Si mixed,
 *   throw (V1 no soporta mixed currency en una sola order; usar 2 orders separadas).
 * - Total: SUM(line.amount).
 */
export async function createPaymentOrderFromObligations(
  input: CreatePaymentOrderInput,
  client?: PoolClient
): Promise<{ order: PaymentOrder; eventId: string }> {
  validateInput(input)

  const run = async (c: PoolClient) => {
    // 1. Fetch obligations + lock vivas
    const result = await c.query<ObligationRefRow>(
      `SELECT obligation_id, amount, currency, beneficiary_type, beneficiary_id,
              beneficiary_name, obligation_kind, status, space_id, period_id,
              metadata_json
         FROM greenhouse_finance.payment_obligations
        WHERE obligation_id = ANY($1::text[])
        FOR UPDATE`,
      [input.obligationIds]
    )

    if ((result.rowCount ?? 0) !== input.obligationIds.length) {
      const found = new Set(result.rows.map(r => r.obligation_id))
      const missing = input.obligationIds.filter(id => !found.has(id))

      throw new PaymentOrderValidationError(
        `Obligations no encontradas: ${missing.join(', ')}`,
        'obligation_not_found',
        404
      )
    }

    // 2. Validar status: una orden nueva solo puede tomar obligaciones no lockeadas y por programar.
    const blocked = result.rows.filter(r =>
      !canCreatePaymentOrderFromObligationStatus(r.status as PaymentObligationStatus)
    )

    if (blocked.length > 0) {
      throw new PaymentOrderConflictError(
        `Obligations con status bloqueado: ${blocked
          .map(r => `${r.obligation_id} (${r.status})`)
          .join(', ')}`,
        'obligation_status_blocked'
      )
    }

    // 3. Validar que ninguna este lockeada en otra order viva
    const lockCheck = await c.query<{ obligation_id: string; order_id: string; state: string }>(
      `SELECT l.obligation_id, l.order_id, l.state
         FROM greenhouse_finance.payment_order_lines l
        WHERE l.obligation_id = ANY($1::text[])
          AND l.state NOT IN ('cancelled', 'failed')
        FOR UPDATE`,
      [input.obligationIds]
    )

    if ((lockCheck.rowCount ?? 0) > 0) {
      throw new PaymentOrderConflictError(
        `Obligations ya en otra order viva: ${lockCheck.rows
          .map(r => `${r.obligation_id} → ${r.order_id} (${r.state})`)
          .join(', ')}`,
        'obligation_already_locked'
      )
    }

    // 4. Validar currency uniforme
    const currencies = new Set(result.rows.map(r => r.currency))

    if (currencies.size > 1) {
      throw new PaymentOrderValidationError(
        `V1 no soporta orders con currencies mixtas: ${[...currencies].join(', ')}`,
        'mixed_currencies'
      )
    }

    const currency = [...currencies][0] as PaymentOrderCurrency

    // 5. Computar total + validar partial amounts
    let totalAmount = 0

    const linePayloads: Array<{
      lineId: string
      obligationId: string
      amount: number
      isPartial: boolean
      beneficiaryType: string
      beneficiaryId: string
      beneficiaryName: string | null
      obligationKind: string
    }> = []

    for (const row of result.rows) {
      const fullAmount = toNumber(row.amount)
      const partial = input.partialAmounts?.[row.obligation_id]
      const lineAmount = partial !== undefined ? partial : fullAmount

      if (!Number.isFinite(lineAmount) || lineAmount < 0) {
        throw new PaymentOrderValidationError(
          `amount invalido para ${row.obligation_id}: ${lineAmount}`,
          'invalid_amount'
        )
      }

      if (lineAmount > fullAmount) {
        throw new PaymentOrderValidationError(
          `amount (${lineAmount}) no puede exceder obligation.amount (${fullAmount}) para ${row.obligation_id}`,
          'amount_exceeds_obligation'
        )
      }

      const isPartial = lineAmount < fullAmount

      totalAmount += lineAmount

      linePayloads.push({
        lineId: buildLineId(),
        obligationId: row.obligation_id,
        amount: lineAmount,
        isPartial,
        beneficiaryType: row.beneficiary_type,
        beneficiaryId: row.beneficiary_id,
        beneficiaryName: row.beneficiary_name,
        obligationKind: row.obligation_kind
      })
    }

    // 6. Resolver space_id + period_id desde las obligations si no fue dado
    const distinctSpaces = new Set(result.rows.map(r => r.space_id).filter(Boolean))

    const spaceId =
      input.spaceId ??
      (distinctSpaces.size === 1 ? ([...distinctSpaces][0] as string) : null)

    const distinctPeriods = new Set(result.rows.map(r => r.period_id).filter(Boolean))

    const periodId =
      input.periodId ??
      (distinctPeriods.size === 1 ? ([...distinctPeriods][0] as string) : null)

    // 6.5 TASK-749: Resolver routing por line desde el perfil activo del
    // beneficiary cuando el caller no provee processorSlug/paymentMethod.
    // El snapshot queda en metadata.routing_snapshots (audit + debugging).
    // Si el caller YA entrega esos campos, ganan: el resolver no se invoca.
    //
    // V1: solo resolvemos para beneficiary_type='member'. Otros tipos
    // (tax_authority, processor, other) requieren routing manual del operator.
    // 'shareholder' no genera obligations en V1 (CCAs son manual entries).
    const routingSnapshots: Array<Record<string, unknown>> = []
    let resolvedProcessorSlug = input.processorSlug ?? null
    let resolvedPaymentMethod: PaymentOrderPaymentMethod | null = input.paymentMethod ?? null

    if (!input.processorSlug && !input.paymentMethod) {
      const memberRows = result.rows.filter(r => r.beneficiary_type === 'member')

      for (const row of memberRows) {
        try {
          const metadata = row.metadata_json ?? {}
          const payrollVia = metadata.payrollVia === 'deel' ? 'deel' : null

          const payRegime = metadata.payRegime === 'international' || metadata.payRegime === 'chile'
            ? metadata.payRegime
            : null

          const route = await resolvePaymentRoute(
            {
              spaceId: row.space_id,
              beneficiaryType: 'member',
              beneficiaryId: row.beneficiary_id,
              currency: row.currency as 'CLP' | 'USD',
              obligationKind: row.obligation_kind as 'employee_net_pay'
            },
            {
              payrollVia,
              payRegime
            }
          )

          routingSnapshots.push({
            obligationId: row.obligation_id,
            outcome: route.outcome,
            providerSlug: route.providerSlug,
            paymentMethod: route.paymentMethod,
            paymentInstrumentId: route.paymentInstrumentId,
            profileId: route.profileId,
            reason: route.reason,
            resolvedAt: route.resolvedAt
          })

          if (route.outcome === 'resolved' && !resolvedProcessorSlug) {
            resolvedProcessorSlug = route.providerSlug
            resolvedPaymentMethod = route.paymentMethod
          }
        } catch (e) {
          // Resolver falla = degradar a "unresolved", no bloquea el create.
          // El caller puede setear processorSlug manualmente despues.
          routingSnapshots.push({
            obligationId: row.obligation_id,
            outcome: 'resolver_error',
            error: e instanceof Error ? e.message : String(e)
          })
        }
      }
    }

    const treasurySourcePolicy = await resolvePaymentOrderSourcePolicy(c, {
      processorSlug: resolvedProcessorSlug,
      paymentMethod: resolvedPaymentMethod,
      currency,
      sourceAccountId: input.sourceAccountId ?? null
    })

    // 7. INSERT order
    const orderId = buildOrderId()
    const requireApproval = input.requireApproval !== false
    const initialState = requireApproval ? 'pending_approval' : 'approved'

    const inserted = await c.query<OrderRow>(
      `INSERT INTO greenhouse_finance.payment_orders (
         order_id, space_id, batch_kind, period_id, title, description,
         processor_slug, payment_method, source_account_id,
         total_amount, currency,
         scheduled_for, due_date,
         state, require_approval, created_by, approved_by, approved_at,
         metadata_json
       )
       VALUES ($1, $2, $3, $4, $5, $6,
               $7, $8, $9,
               $10, $11,
               $12::date, $13::date,
               $14, $15, $16, $17, $18,
               $19::jsonb)
       RETURNING *`,
      [
        orderId,
        spaceId,
        input.batchKind,
        periodId,
        input.title.trim(),
        input.description ?? null,
        resolvedProcessorSlug,
        resolvedPaymentMethod,
        treasurySourcePolicy.sourceAccountId,
        totalAmount,
        currency,
        input.scheduledFor ?? null,
        input.dueDate ?? null,
        initialState,
        requireApproval,
        input.createdBy,
        requireApproval ? null : input.createdBy,
        requireApproval ? null : new Date().toISOString(),
        JSON.stringify({
          ...(input.metadata ?? {}),
          treasury_source_policy: treasurySourcePolicy.snapshot,
          ...(routingSnapshots.length > 0 ? { routing_snapshots: routingSnapshots } : {})
        })
      ]
    )

    const order = mapOrderRow(inserted.rows[0])

    // 8. INSERT lines en batch
    for (const line of linePayloads) {
      await c.query(
        `INSERT INTO greenhouse_finance.payment_order_lines (
           line_id, order_id, obligation_id,
           beneficiary_type, beneficiary_id, beneficiary_name,
           obligation_kind, amount, currency, is_partial, state
         )
         VALUES ($1, $2, $3,
                 $4, $5, $6,
                 $7, $8, $9, $10, 'pending')`,
        [
          line.lineId,
          orderId,
          line.obligationId,
          line.beneficiaryType,
          line.beneficiaryId,
          line.beneficiaryName,
          line.obligationKind,
          line.amount,
          currency,
          line.isPartial
        ]
      )
    }

    // 9. UPDATE obligations → 'scheduled' (declara intencion de pago)
    await c.query(
      `UPDATE greenhouse_finance.payment_obligations
          SET status = 'scheduled', updated_at = now()
        WHERE obligation_id = ANY($1::text[])
          AND status NOT IN ('cancelled', 'superseded', 'paid', 'closed')`,
      [input.obligationIds]
    )

    // 10. Outbox event
    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: order.orderId,
        eventType: 'finance.payment_order.created',
        payload: {
          orderId: order.orderId,
          spaceId: order.spaceId,
          batchKind: order.batchKind,
          periodId: order.periodId,
          totalAmount: order.totalAmount,
          currency: order.currency,
          state: order.state,
          requireApproval: order.requireApproval,
          createdBy: order.createdBy,
          obligationIds: input.obligationIds,
          lineCount: linePayloads.length
        }
      },
      c
    )

    return { order, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
