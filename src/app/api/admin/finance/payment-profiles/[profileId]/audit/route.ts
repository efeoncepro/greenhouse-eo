import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listProfileAuditEntries } from '@/lib/finance/beneficiary-payment-profiles/list-profiles'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import { PaymentProfileValidationError } from '@/lib/finance/beneficiary-payment-profiles/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profileId } = await params

  try {
    assertPaymentProfileCapability({
      tenant,
      capability: 'finance.payment_profiles.read',
      action: 'read'
    })

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') ?? '100')

    const entries = await listProfileAuditEntries(profileId, Number.isFinite(limit) ? limit : 100)

    return NextResponse.json({ entries })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error(`GET audit for profile ${profileId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cargar el audit log.' },
      { status: 500 }
    )
  }
}
