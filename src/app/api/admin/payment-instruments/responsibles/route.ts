import { NextResponse } from 'next/server'

import { assertPaymentInstrumentCapability } from '@/lib/finance/payment-instruments'
import { getPaymentInstrumentResponsibleCandidates } from '@/lib/finance/payment-instruments/responsibles'
import { FinanceValidationError } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertPaymentInstrumentCapability({
      tenant,
      capability: 'finance.payment_instruments.update',
      action: 'update'
    })

    const items = await getPaymentInstrumentResponsibleCandidates(tenant)

    return NextResponse.json(
      { items, total: items.length },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode })
    }

    throw error
  }
}
