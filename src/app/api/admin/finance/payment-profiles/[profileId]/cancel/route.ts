import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { cancelPaymentProfile } from '@/lib/finance/beneficiary-payment-profiles/cancel-profile'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import {
  PaymentProfileConflictError,
  PaymentProfileValidationError
} from '@/lib/finance/beneficiary-payment-profiles/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profileId } = await params

  try {
    assertPaymentProfileCapability({
      tenant,
      capability: 'finance.payment_profiles.create',
      action: 'update'
    })

    const body = await request.json().catch(() => ({}))
    const reason = (body?.reason ?? '').toString().trim()

    if (!reason) {
      return NextResponse.json({ error: 'reason es requerido' }, { status: 400 })
    }

    const result = await cancelPaymentProfile({
      profileId,
      cancelledBy: tenant.userId,
      reason
    })

    return NextResponse.json({ profile: result.profile, eventId: result.eventId })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError || error instanceof PaymentProfileConflictError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error(`POST cancel profile ${profileId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cancelar el perfil.' },
      { status: 500 }
    )
  }
}
