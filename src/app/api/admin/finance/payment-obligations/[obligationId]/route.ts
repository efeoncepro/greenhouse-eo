import { NextResponse } from 'next/server'

import { getPaymentObligationDetail } from '@/lib/finance/payment-obligations/get-obligation-detail'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ obligationId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { obligationId } = await params

  if (!obligationId) {
    return NextResponse.json({ error: 'obligationId requerido' }, { status: 400 })
  }

  try {
    const detail = await getPaymentObligationDetail(obligationId)

    if (!detail) {
      return NextResponse.json({ error: 'Obligación no encontrada' }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error(`GET /api/admin/finance/payment-obligations/${obligationId} failed`, error)

    return NextResponse.json({ error: 'No fue posible cargar la obligación.' }, { status: 500 })
  }
}
