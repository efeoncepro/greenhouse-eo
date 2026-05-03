import 'server-only'

import { query } from '@/lib/db'
import type { PaymentObligation } from '@/types/payment-obligations'

import { mapObligationRow, type ObligationRow } from './row-mapper'

export interface ObligationAuditEvent {
  eventId: string
  eventType: string
  aggregateType: string
  occurredAt: string
  status: string
  publishedAt: string | null
  payload: Record<string, unknown>
  actor: string | null
}

export interface ObligationOrderLink {
  lineId: string
  orderId: string
  orderTitle: string
  orderState: string
  amount: number
  scheduledFor: string | null
  paidAt: string | null
}

export interface ObligationPayslipDelivery {
  receiptId: string
  status: 'generated' | 'generation_failed' | 'email_sent' | 'email_failed'
  deliveryTrigger: 'period_exported' | 'payment_paid' | 'manual_resend' | null
  emailRecipient: string | null
  emailSentAt: string | null
  emailDeliveryId: string | null
  paymentOrderLineId: string | null
  errorMessage: string | null
}

export interface PaymentObligationDetail {
  obligation: PaymentObligation
  audit: ObligationAuditEvent[]
  orderLinks: ObligationOrderLink[]
  components: Array<{ label: string; description: string | null; amount: number; currency: string; sign: 'positive' | 'negative' }>
  netAmount: { amount: number; currency: string }
  payslipDelivery: ObligationPayslipDelivery | null
}

interface AuditRow extends Record<string, unknown> {
  event_id: string
  event_type: string
  aggregate_type: string
  aggregate_id: string
  occurred_at: string
  published_at: string | null
  status: string
  payload_json: Record<string, unknown>
}

interface OrderLineRow extends Record<string, unknown> {
  line_id: string
  order_id: string
  order_title: string
  order_state: string
  amount: number | string
  scheduled_for: string | null
  paid_at: string | null
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const buildComponents = (
  obligation: PaymentObligation
): PaymentObligationDetail['components'] => {
  const meta = obligation.metadataJson ?? {}

  switch (obligation.obligationKind) {
    case 'employee_net_pay': {
      const gross = toNumber(meta.grossTotal)
      const adjustment = toNumber(meta.adjustmentAmount)
      const components: PaymentObligationDetail['components'] = []

      if (gross > 0) {
        components.push({
          label: 'Bruto natural',
          description: 'Antes de descuentos y retenciones',
          amount: gross,
          currency: obligation.currency,
          sign: 'positive'
        })
      }

      if (adjustment !== 0) {
        const ajusteDesc = (meta.adjustmentReason as string | undefined) ?? 'Ajuste aplicado en Payroll'

        components.push({
          label: 'Descuento adicional',
          description: ajusteDesc,
          amount: Math.abs(adjustment),
          currency: obligation.currency,
          sign: 'negative'
        })
      }

      components.push({
        label: 'Neto a pagar',
        description: null,
        amount: obligation.amount,
        currency: obligation.currency,
        sign: 'positive'
      })

      return components
    }

    case 'employer_social_security': {
      // Previred consolidated breakdown — derive from metadata.breakdown
      const breakdown = meta.breakdown as
        | Array<{ memberId: string; afpEmployee: number; healthEmployee: number; unemploymentEmployee: number; apvEmployee: number; cesantiaEmployer: number; mutualEmployer: number; sisEmployer: number }>
        | undefined

      const components: PaymentObligationDetail['components'] = []

      if (breakdown && breakdown.length > 0) {
        const totals = breakdown.reduce(
          (acc, row) => ({
            afp: acc.afp + toNumber(row.afpEmployee),
            health: acc.health + toNumber(row.healthEmployee),
            unemployment: acc.unemployment + toNumber(row.unemploymentEmployee),
            apv: acc.apv + toNumber(row.apvEmployee),
            cesantiaEmp: acc.cesantiaEmp + toNumber(row.cesantiaEmployer),
            mutualEmp: acc.mutualEmp + toNumber(row.mutualEmployer),
            sisEmp: acc.sisEmp + toNumber(row.sisEmployer)
          }),
          { afp: 0, health: 0, unemployment: 0, apv: 0, cesantiaEmp: 0, mutualEmp: 0, sisEmp: 0 }
        )

        if (totals.afp > 0) components.push({ label: 'AFP empleado', description: 'Cotización previsional', amount: totals.afp, currency: 'CLP', sign: 'positive' })
        if (totals.health > 0) components.push({ label: 'Salud empleado', description: 'Fonasa o ISAPRE', amount: totals.health, currency: 'CLP', sign: 'positive' })
        if (totals.unemployment > 0) components.push({ label: 'Cesantía empleado', description: 'AFC', amount: totals.unemployment, currency: 'CLP', sign: 'positive' })
        if (totals.apv > 0) components.push({ label: 'APV empleado', description: 'Ahorro previsional voluntario', amount: totals.apv, currency: 'CLP', sign: 'positive' })
        if (totals.cesantiaEmp > 0) components.push({ label: 'Cesantía empleador', description: 'AFC empleador', amount: totals.cesantiaEmp, currency: 'CLP', sign: 'positive' })
        if (totals.mutualEmp > 0) components.push({ label: 'Mutual empleador', description: 'Mutualidad', amount: totals.mutualEmp, currency: 'CLP', sign: 'positive' })
        if (totals.sisEmp > 0) components.push({ label: 'SIS empleador', description: 'Seguro de invalidez y sobrevivencia', amount: totals.sisEmp, currency: 'CLP', sign: 'positive' })
      }

      components.push({
        label: 'Total Previred',
        description: `Consolidado ${breakdown?.length ?? 0} colaboradores`,
        amount: obligation.amount,
        currency: obligation.currency,
        sign: 'positive'
      })

      return components
    }

    case 'employee_withheld_component': {
      return [
        {
          label: 'Retención SII',
          description: (meta.retentionType as string | undefined) ?? 'Retención de honorarios',
          amount: obligation.amount,
          currency: obligation.currency,
          sign: 'positive'
        }
      ]
    }

    case 'provider_payroll': {
      const reference = toNumber(meta.referenceAmount ?? meta.grossTotal)

      return [
        {
          label: 'Honorarios EOR',
          description: reference > 0 ? `Referencia: ${reference} ${obligation.currency}` : 'Pago via processor',
          amount: obligation.amount,
          currency: obligation.currency,
          sign: 'positive'
        }
      ]
    }

    default: {
      return [
        {
          label: 'Monto',
          description: obligation.obligationKind,
          amount: obligation.amount,
          currency: obligation.currency,
          sign: 'positive'
        }
      ]
    }
  }
}

/**
 * Carga la vista detallada de una obligación con: audit timeline desde outbox,
 * links a payment_order_lines vivos, breakdown de componentes derivado del metadata.
 */
export async function getPaymentObligationDetail(
  obligationId: string
): Promise<PaymentObligationDetail | null> {
  const rows = await query<ObligationRow>(
    `SELECT * FROM greenhouse_finance.payment_obligations
      WHERE obligation_id = $1
      LIMIT 1`,
    [obligationId]
  )

  if (rows.length === 0) return null

  const obligation = mapObligationRow(rows[0])

  // ── Audit events from outbox (canonical event catalog uses 'payment_obligation' aggregate type) ──
  const auditRows = await query<AuditRow>(
    `SELECT event_id, event_type, aggregate_type, aggregate_id,
            occurred_at::text AS occurred_at,
            published_at::text AS published_at,
            status, payload_json
       FROM greenhouse_sync.outbox_events
      WHERE (aggregate_type = 'payment_obligation' AND aggregate_id = $1)
         OR (aggregate_type = 'payroll_period' AND payload_json->>'periodId' = $2 AND event_type IN ('payroll.period.exported', 'payroll.period.closed'))
      ORDER BY occurred_at ASC
      LIMIT 50`,
    [obligationId, obligation.periodId ?? '']
  )

  const audit: ObligationAuditEvent[] = auditRows.map(r => ({
    eventId: r.event_id,
    eventType: r.event_type,
    aggregateType: r.aggregate_type,
    occurredAt: r.occurred_at,
    publishedAt: r.published_at,
    status: r.status,
    payload: r.payload_json ?? {},
    actor:
      ((r.payload_json as Record<string, unknown>)?.actorUserId as string | undefined) ??
      ((r.payload_json as Record<string, unknown>)?.triggeredBy as string | undefined) ??
      null
  }))

  // ── Linked order lines (active or terminal) ──
  const orderLinkRows = await query<OrderLineRow>(
    `SELECT pol.line_id,
            pol.order_id,
            po.title AS order_title,
            po.state AS order_state,
            pol.amount,
            po.scheduled_for::text AS scheduled_for,
            po.paid_at::text AS paid_at
       FROM greenhouse_finance.payment_order_lines AS pol
       INNER JOIN greenhouse_finance.payment_orders AS po
         ON po.order_id = pol.order_id
      WHERE pol.obligation_id = $1
        AND po.state NOT IN ('cancelled')
      ORDER BY po.created_at DESC
      LIMIT 10`,
    [obligationId]
  )

  const orderLinks: ObligationOrderLink[] = orderLinkRows.map(r => ({
    lineId: r.line_id,
    orderId: r.order_id,
    orderTitle: r.order_title,
    orderState: r.order_state,
    amount: toNumber(r.amount),
    scheduledFor: r.scheduled_for,
    paidAt: r.paid_at
  }))

  // ── TASK-759: Payslip delivery status (when this obligation is employee_net_pay) ──
  let payslipDelivery: ObligationPayslipDelivery | null = null

  if (obligation.obligationKind === 'employee_net_pay' && obligation.sourceKind === 'payroll') {
    const meta = obligation.metadataJson ?? {}
    const payrollEntryId = typeof meta.payrollEntryId === 'string' ? meta.payrollEntryId : null

    if (payrollEntryId) {
      const receiptRows = await query<{
        receipt_id: string
        status: string
        delivery_trigger: string | null
        email_recipient: string | null
        email_sent_at: string | null
        email_delivery_id: string | null
        email_error: string | null
        generation_error: string | null
        payment_order_line_id: string | null
      }>(
        `SELECT receipt_id, status, delivery_trigger, email_recipient,
                email_sent_at::text AS email_sent_at, email_delivery_id, email_error, generation_error,
                payment_order_line_id
           FROM greenhouse_payroll.payroll_receipts
          WHERE entry_id = $1
          ORDER BY created_at DESC
          LIMIT 1`,
        [payrollEntryId]
      )

      const receipt = receiptRows[0]

      if (receipt) {
        const status = (
          receipt.status === 'generated' ||
          receipt.status === 'generation_failed' ||
          receipt.status === 'email_sent' ||
          receipt.status === 'email_failed'
            ? receipt.status
            : 'generated'
        ) as ObligationPayslipDelivery['status']

        const deliveryTrigger = (
          receipt.delivery_trigger === 'period_exported' ||
          receipt.delivery_trigger === 'payment_paid' ||
          receipt.delivery_trigger === 'manual_resend'
            ? receipt.delivery_trigger
            : null
        ) as ObligationPayslipDelivery['deliveryTrigger']

        payslipDelivery = {
          receiptId: receipt.receipt_id,
          status,
          deliveryTrigger,
          emailRecipient: receipt.email_recipient,
          emailSentAt: receipt.email_sent_at,
          emailDeliveryId: receipt.email_delivery_id,
          paymentOrderLineId: receipt.payment_order_line_id,
          errorMessage: receipt.email_error ?? receipt.generation_error
        }
      }
    }
  }

  return {
    obligation,
    audit,
    orderLinks,
    components: buildComponents(obligation),
    netAmount: { amount: obligation.amount, currency: obligation.currency },
    payslipDelivery
  }
}
