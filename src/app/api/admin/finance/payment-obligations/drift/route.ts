import { NextResponse } from 'next/server'

import { getPaymentObligationsDrift } from '@/lib/finance/payment-obligations/drift-vs-expenses'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get('periodId')

  if (!periodId) {
    return NextResponse.json(
      { error: 'periodId requerido (formato YYYY-MM).' },
      { status: 400 }
    )
  }

  try {
    const report = await getPaymentObligationsDrift(periodId)

    return NextResponse.json(report)
  } catch (error) {
    console.error('GET /api/admin/finance/payment-obligations/drift failed', error)

    return NextResponse.json(
      { error: 'No fue posible computar drift de obligations.' },
      { status: 500 }
    )
  }
}
