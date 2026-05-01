import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPaymentProfileById } from '@/lib/finance/beneficiary-payment-profiles/list-profiles'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import { PaymentProfileValidationError } from '@/lib/finance/beneficiary-payment-profiles/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
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

    const profile = await getPaymentProfileById(profileId)

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error(`GET payment-profiles/${profileId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cargar el perfil.' },
      { status: 500 }
    )
  }
}
