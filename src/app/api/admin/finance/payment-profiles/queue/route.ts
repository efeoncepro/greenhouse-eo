import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPaymentProfileQueueSummary } from '@/lib/finance/beneficiary-payment-profiles/queue-summary'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import { PaymentProfileValidationError } from '@/lib/finance/beneficiary-payment-profiles/errors'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertPaymentProfileCapability({
      tenant,
      capability: 'finance.payment_profiles.read',
      action: 'read'
    })

    const { searchParams } = new URL(request.url)

    const summary = await getPaymentProfileQueueSummary({
      spaceId: searchParams.get('spaceId') || null
    })

    return NextResponse.json(summary)
  } catch (error) {
    if (error instanceof PaymentProfileValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error('GET payment-profiles/queue failed', error)

    return NextResponse.json(
      { error: 'No fue posible cargar la cola de aprobacion.' },
      { status: 500 }
    )
  }
}
