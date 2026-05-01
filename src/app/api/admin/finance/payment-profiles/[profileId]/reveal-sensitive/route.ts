import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { revealPaymentProfileSensitive } from '@/lib/finance/beneficiary-payment-profiles/reveal-sensitive'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import { PaymentProfileValidationError } from '@/lib/finance/beneficiary-payment-profiles/errors'

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
      capability: 'finance.payment_profiles.reveal_sensitive',
      action: 'read'
    })

    const body = await request.json().catch(() => ({}))
    const reason = (body?.reason ?? '').toString().trim()

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'reason es requerido (5+ caracteres) para audit' },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null

    const userAgent = request.headers.get('user-agent') || null

    const result = await revealPaymentProfileSensitive({
      profileId,
      actorUserId: tenant.userId,
      reason,
      ipAddress,
      userAgent
    })

    return NextResponse.json({
      profile: result.profile,
      auditId: result.auditId,
      eventId: result.eventId
    })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error(`POST reveal-sensitive profile ${profileId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible revelar los datos sensibles.' },
      { status: 500 }
    )
  }
}
