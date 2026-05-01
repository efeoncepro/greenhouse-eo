import { NextResponse } from 'next/server'

import { listPaymentObligations } from '@/lib/finance/payment-obligations/list-obligations'
import type { PaymentObligationStatus } from '@/types/payment-obligations'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get('periodId') || undefined
  const beneficiaryId = searchParams.get('beneficiaryId') || undefined
  const beneficiaryType = searchParams.get('beneficiaryType') || undefined
  const obligationKind = searchParams.get('obligationKind') || undefined

  const status =
    (searchParams.get('status') as PaymentObligationStatus | 'all' | null) || undefined

  const sourceKind = searchParams.get('sourceKind') || undefined
  const limit = Number(searchParams.get('limit') ?? '100')
  const offset = Number(searchParams.get('offset') ?? '0')

  // Default: hide cancelled/superseded obligations from the operational view.
  // Override with ?includeCancelled=true if explicitly needed (e.g. audit/history).
  const includeCancelled = searchParams.get('includeCancelled') === 'true'

  try {
    const { items, total } = await listPaymentObligations({
      periodId,
      beneficiaryId,
      beneficiaryType,
      obligationKind,
      status: status ?? undefined,
      sourceKind,
      excludeCancelled: !includeCancelled,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0
    })

    return NextResponse.json({ items, total })
  } catch (error) {
    console.error('GET /api/admin/finance/payment-obligations failed', error)

    return NextResponse.json(
      { error: 'No fue posible cargar las obligaciones de pago.' },
      { status: 500 }
    )
  }
}
