import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listPaymentOrders } from '@/lib/finance/payment-orders/list-orders'
import { createPaymentOrderFromObligations } from '@/lib/finance/payment-orders/create-from-obligations'
import {
  PaymentOrderConflictError,
  PaymentOrderValidationError
} from '@/lib/finance/payment-orders/errors'
import type {
  PaymentOrderBatchKind,
  PaymentOrderState,
  PaymentOrderPaymentMethod
} from '@/types/payment-orders'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  try {
    const limit = Number(searchParams.get('limit') ?? '100')
    const offset = Number(searchParams.get('offset') ?? '0')

    const { items, total } = await listPaymentOrders({
      spaceId: searchParams.get('spaceId') || undefined,
      periodId: searchParams.get('periodId') || undefined,
      batchKind: (searchParams.get('batchKind') as PaymentOrderBatchKind | null) || undefined,
      state: (searchParams.get('state') as PaymentOrderState | 'all' | null) || undefined,
      scheduledFrom: searchParams.get('scheduledFrom') || undefined,
      scheduledTo: searchParams.get('scheduledTo') || undefined,
      dueFrom: searchParams.get('dueFrom') || undefined,
      dueTo: searchParams.get('dueTo') || undefined,
      search: searchParams.get('search') || undefined,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0
    })

    return NextResponse.json({ items, total })
  } catch (error) {
    console.error('GET /api/admin/finance/payment-orders failed', error)

    return NextResponse.json(
      { error: 'No fue posible cargar las ordenes de pago.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const result = await createPaymentOrderFromObligations({
      spaceId: body.spaceId,
      batchKind: body.batchKind as PaymentOrderBatchKind,
      periodId: body.periodId,
      title: body.title,
      description: body.description,
      processorSlug: body.processorSlug,
      paymentMethod: body.paymentMethod as PaymentOrderPaymentMethod | null | undefined,
      sourceAccountId: body.sourceAccountId,
      scheduledFor: body.scheduledFor,
      dueDate: body.dueDate,
      obligationIds: body.obligationIds,
      partialAmounts: body.partialAmounts,
      requireApproval: body.requireApproval,
      createdBy: tenant.userId,
      metadata: body.metadata
    })

    return NextResponse.json({ order: result.order, eventId: result.eventId }, { status: 201 })
  } catch (error) {
    if (error instanceof PaymentOrderValidationError || error instanceof PaymentOrderConflictError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error('POST /api/admin/finance/payment-orders failed', error)

    return NextResponse.json(
      { error: 'No fue posible crear la orden de pago.' },
      { status: 500 }
    )
  }
}
