import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { resolvePaymentRoute } from '@/lib/finance/payment-routing/resolve-route'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import { PaymentProfileValidationError } from '@/lib/finance/beneficiary-payment-profiles/errors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/finance/payment-routing/preview
 *
 * Resuelve la ruta de pago para una obligation hipotetica sin escribir
 * nada. Util para previsualizar en UI antes de crear orden, o para
 * que el modulo Payment Orders sepa que routing aplicara.
 *
 * Body: { spaceId, beneficiaryType, beneficiaryId, currency, obligationKind?,
 *         payRegime?, payrollVia?, memberCountryCode? }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertPaymentProfileCapability({
      tenant,
      capability: 'finance.payment_profiles.read',
      action: 'read'
    })

    const body = await request.json()

    if (!body.beneficiaryType || !body.beneficiaryId || !body.currency) {
      return NextResponse.json(
        { error: 'beneficiaryType, beneficiaryId y currency son requeridos' },
        { status: 400 }
      )
    }

    const route = await resolvePaymentRoute(
      {
        spaceId: body.spaceId ?? null,
        beneficiaryType: body.beneficiaryType,
        beneficiaryId: body.beneficiaryId,
        currency: body.currency,
        obligationKind: body.obligationKind ?? 'manual'
      },
      {
        payRegime: body.payRegime ?? null,
        payrollVia: body.payrollVia ?? null,
        memberCountryCode: body.memberCountryCode ?? null
      }
    )

    return NextResponse.json({ route })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error('POST payment-routing/preview failed', error)

    return NextResponse.json(
      { error: 'No fue posible resolver la ruta de pago.' },
      { status: 500 }
    )
  }
}
