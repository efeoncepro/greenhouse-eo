import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listPaymentProfiles } from '@/lib/finance/beneficiary-payment-profiles/list-profiles'
import { createPaymentProfile } from '@/lib/finance/beneficiary-payment-profiles/create-profile'
import { assertPaymentProfileCapability } from '@/lib/finance/beneficiary-payment-profiles/access'
import {
  PaymentProfileConflictError,
  PaymentProfileValidationError
} from '@/lib/finance/beneficiary-payment-profiles/errors'
import type {
  BeneficiaryPaymentProfileBeneficiaryType,
  BeneficiaryPaymentProfileCurrency,
  BeneficiaryPaymentProfilePaymentMethod,
  BeneficiaryPaymentProfileStatus
} from '@/types/payment-profiles'

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
    const limit = Number(searchParams.get('limit') ?? '100')
    const offset = Number(searchParams.get('offset') ?? '0')

    const { items, total } = await listPaymentProfiles({
      spaceId: searchParams.get('spaceId') || undefined,
      beneficiaryType: (searchParams.get('beneficiaryType') as BeneficiaryPaymentProfileBeneficiaryType | null) || undefined,
      beneficiaryId: searchParams.get('beneficiaryId') || undefined,
      currency: (searchParams.get('currency') as BeneficiaryPaymentProfileCurrency | null) || undefined,
      status: (searchParams.get('status') as BeneficiaryPaymentProfileStatus | 'all' | null) || undefined,
      providerSlug: searchParams.get('providerSlug') || undefined,
      search: searchParams.get('search') || undefined,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0
    })

    return NextResponse.json({ items, total })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error('GET /api/admin/finance/payment-profiles failed', error)

    return NextResponse.json(
      { error: 'No fue posible cargar los perfiles de pago.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertPaymentProfileCapability({
      tenant,
      capability: 'finance.payment_profiles.create',
      action: 'create'
    })

    const body = await request.json()

    const result = await createPaymentProfile({
      spaceId: body.spaceId,
      beneficiaryType: body.beneficiaryType as BeneficiaryPaymentProfileBeneficiaryType,
      beneficiaryId: body.beneficiaryId,
      beneficiaryName: body.beneficiaryName,
      countryCode: body.countryCode,
      currency: body.currency as BeneficiaryPaymentProfileCurrency,
      providerSlug: body.providerSlug,
      paymentMethod: body.paymentMethod as BeneficiaryPaymentProfilePaymentMethod | null | undefined,
      paymentInstrumentId: body.paymentInstrumentId,
      accountHolderName: body.accountHolderName,
      accountNumberFull: body.accountNumberFull,
      bankName: body.bankName,
      routingReference: body.routingReference,
      vaultRef: body.vaultRef,
      notes: body.notes,
      requireApproval: body.requireApproval,
      createdBy: tenant.userId,
      metadata: body.metadata
    })

    return NextResponse.json({ profile: result.profile, eventId: result.eventId }, { status: 201 })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError || error instanceof PaymentProfileConflictError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }

    console.error('POST /api/admin/finance/payment-profiles failed', error)

    return NextResponse.json(
      { error: 'No fue posible crear el perfil de pago.' },
      { status: 500 }
    )
  }
}
