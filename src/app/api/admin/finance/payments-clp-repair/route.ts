import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import {
  repairPaymentsClpAmount,
  type RepairPaymentsKind
} from '@/lib/finance/repair-payments-clp-amount'
import { captureWithDomain } from '@/lib/observability/capture'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-766 Slice 5 — Endpoint admin para reparar payments con drift CLP.
 *
 * Caso de uso: cuando un `expense_payment` o `income_payment` quedó con
 * `currency != 'CLP'` y `amount_clp IS NULL` (registro legacy o helper
 * canónico bypassed). Esos registros aparecen en el reliability signal
 * `finance.expense_payments.clp_drift` / `finance.income_payments.clp_drift`
 * (steady=0, valor > 0 = breakage).
 *
 * El endpoint resuelve el rate histórico al `payment_date` desde
 * `greenhouse_finance.exchange_rates` y poblá `amount_clp` +
 * `exchange_rate_at_payment` + flips `requires_fx_repair = FALSE`.
 *
 * Capability: `finance.payments.repair_clp` (FINANCE_ADMIN +
 * EFEONCE_ADMIN). Granular, least-privilege.
 *
 * Idempotente: re-llamar con misma scope no afecta filas ya reparadas
 * (UPDATE con `WHERE amount_clp IS NULL` filtra; idempotency natural).
 *
 * `dryRun=true` reporta cuántos candidatos se procesarían sin tocar nada.
 *
 * Audit trail: outbox event `finance.payments.clp_repaired` (v1) por
 * cada ejecución (incluyendo dryRun=true) para que AI Observer y audit
 * log lo capturen.
 */

interface RepairRequestBody {
  kind?: unknown
  paymentIds?: unknown
  fromDate?: unknown
  toDate?: unknown
  batchSize?: unknown
  dryRun?: unknown
}

const SUPPORTED_KINDS: RepairPaymentsKind[] = ['expense_payments', 'income_payments']

const parseKind = (value: unknown): RepairPaymentsKind => {
  if (typeof value !== 'string' || !SUPPORTED_KINDS.includes(value as RepairPaymentsKind)) {
    throw new Error(
      `kind requerido: 'expense_payments' | 'income_payments'. Recibido: ${String(value)}`
    )
  }

  return value as RepairPaymentsKind
}

const parsePaymentIds = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined

  if (!Array.isArray(value)) {
    throw new Error('paymentIds debe ser array<string>')
  }

  const sanitized = value.filter((v): v is string => typeof v === 'string' && v.length > 0)

  return sanitized.length > 0 ? sanitized : undefined
}

const parseDate = (label: string, value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} debe matchear YYYY-MM-DD. Recibido: ${String(value)}`)
  }

  return value
}

const parseBatchSize = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined

  const n = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`batchSize debe ser entero >= 1. Recibido: ${String(value)}`)
  }

  return Math.trunc(n)
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.payments.repair_clp', 'update', 'tenant')) {
    return NextResponse.json(
      {
        error: 'No tienes permiso para reparar payments con drift CLP.',
        code: 'forbidden'
      },
      { status: 403 }
    )
  }

  let body: RepairRequestBody = {}

  try {
    body = (await request.json().catch(() => ({}))) as RepairRequestBody

    const kind = parseKind(body.kind)
    const paymentIds = parsePaymentIds(body.paymentIds)
    const fromDate = parseDate('fromDate', body.fromDate)
    const toDate = parseDate('toDate', body.toDate)
    const batchSize = parseBatchSize(body.batchSize)
    const dryRun = body.dryRun === true

    const result = await repairPaymentsClpAmount({
      kind,
      paymentIds,
      fromDate,
      toDate,
      batchSize,
      dryRun
    })

    // Audit event (fire-and-forget, sin tx — no bloquea response).
    let eventId: string | null = null

    try {
      eventId = await publishOutboxEvent({
        aggregateType: 'finance_payments_clp_repair',
        aggregateId: `${result.kind}-${Date.now()}`,
        eventType: 'finance.payments.clp_repaired',
        payload: {
          eventVersion: 'v1',
          kind: result.kind,
          dryRun: result.dryRun,
          candidatesScanned: result.candidatesScanned,
          repaired: result.repaired,
          skippedCount: result.skipped.length,
          errorsCount: result.errors.length,
          // Truncar IDs si la batch fue grande para evitar payload bloat.
          skipped: result.skipped.slice(0, 50),
          errors: result.errors.slice(0, 50),
          actorUserId: tenant.userId,
          repairedAt: new Date().toISOString()
        }
      })
    } catch (auditErr) {
      // Audit publish failure NO bloquea el repair (que ya commiteó).
      captureWithDomain(auditErr, 'finance', {
        tags: { source: 'payments_clp_repair_audit_publish' }
      })
    }

    return NextResponse.json({
      ok: true,
      result,
      eventId
    })
  } catch (error) {
    if (error instanceof Error && /requerido|debe (matchear|ser)/i.test(error.message)) {
      return NextResponse.json(
        { error: error.message, code: 'validation_error' },
        { status: 400 }
      )
    }

    captureWithDomain(error, 'finance', {
      tags: { source: 'payments_clp_repair_endpoint' }
    })

    return NextResponse.json(
      {
        error: 'No fue posible reparar los payments. Revisa los logs.',
        code: 'repair_failed'
      },
      { status: 500 }
    )
  }
}
