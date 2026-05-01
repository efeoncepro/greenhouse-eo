import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { approvePaymentProfile } from '@/lib/finance/beneficiary-payment-profiles/approve-profile'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import {
  PaymentProfileConflictError,
  PaymentProfileValidationError
} from '@/lib/finance/beneficiary-payment-profiles/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profileId } = await params

  try {
    assertPaymentProfileCapability({
      tenant,
      capability: 'finance.payment_profiles.approve',
      action: 'update'
    })

    const result = await approvePaymentProfile({
      profileId,
      approvedBy: tenant.userId
    })

    return NextResponse.json({
      profile: result.profile,
      eventId: result.eventId,
      supersededProfileId: result.supersededProfileId
    })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError || error instanceof PaymentProfileConflictError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error(`POST approve profile ${profileId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible aprobar el perfil.' },
      { status: 500 }
    )
  }
}
