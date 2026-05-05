import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import {
  PaymentProfileConflictError,
  PaymentProfileValidationError
} from '@/lib/finance/beneficiary-payment-profiles/errors'
import {
  createSelfServicePaymentProfileRequest,
  listSelfServicePaymentProfiles
} from '@/lib/finance/beneficiary-payment-profiles/self-service'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireMyTenantContext } from '@/lib/tenant/authorization'
import type { BeneficiaryPaymentProfilePaymentMethod } from '@/types/payment-profiles'

export const dynamic = 'force-dynamic'

const VALID_PAYMENT_METHODS: BeneficiaryPaymentProfilePaymentMethod[] = [
  'bank_transfer',
  'wire',
  'check',
  'manual_cash',
  'deel',
  'wise',
  'paypal',
  'global66',
  'sii_pec',
  'other'
]

/**
 * TASK-753 — `/api/my/payment-profile`.
 *
 * GET  → lista perfiles propios del colaborador (masked, scope=own).
 * POST → crea solicitud de cambio (entra como pending_approval con
 *        metadata_json.requested_by='member'; finance aprueba con
 *        maker-checker, NUNCA el propio colaborador).
 *
 * Auth canonica: requireMyTenantContext (efeonce_internal + memberId no-null).
 * Capabilities granulares: read_self / request_change_self.
 */

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.payment_profile.read_self', 'read', 'own')) {
    return NextResponse.json(
      { error: 'Capability missing: personal_workspace.payment_profile.read_self', code: 'forbidden' },
      { status: 403 }
    )
  }

  try {
    const profiles = await listSelfServicePaymentProfiles({ memberId })

    return NextResponse.json({ memberId, profiles })
  } catch (error) {
    captureWithDomain(error, 'finance', {
      extra: { route: 'my/payment-profile', method: 'GET', memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}

interface RequestBody {
  currency?: 'CLP' | 'USD'
  beneficiaryName?: string | null
  countryCode?: string | null
  providerSlug?: string | null
  paymentMethod?: BeneficiaryPaymentProfilePaymentMethod | null
  accountHolderName?: string | null
  accountNumberFull?: string | null
  bankName?: string | null
  routingReference?: string | null
  notes?: string | null
}

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.payment_profile.request_change_self', 'create', 'own')) {
    return NextResponse.json(
      {
        error: 'Capability missing: personal_workspace.payment_profile.request_change_self',
        code: 'forbidden'
      },
      { status: 403 }
    )
  }

  let body: RequestBody = {}

  try {
    body = ((await request.json()) ?? {}) as RequestBody
  } catch {
    body = {}
  }

  const session = await getServerAuthSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Session user id missing', code: 'unauthorized' }, { status: 401 })
  }

  if (body.currency !== 'CLP' && body.currency !== 'USD') {
    return NextResponse.json(
      { error: 'currency debe ser CLP o USD', code: 'invalid_input' },
      { status: 400 }
    )
  }

  if (
    body.paymentMethod !== undefined &&
    body.paymentMethod !== null &&
    !VALID_PAYMENT_METHODS.includes(body.paymentMethod)
  ) {
    return NextResponse.json(
      { error: 'paymentMethod invalido', code: 'invalid_input' },
      { status: 400 }
    )
  }

  try {
    const result = await createSelfServicePaymentProfileRequest({
      memberId,
      userId: session.user.id,
      currency: body.currency,
      beneficiaryName: body.beneficiaryName ?? null,
      countryCode: body.countryCode ?? null,
      providerSlug: body.providerSlug ?? null,
      paymentMethod: body.paymentMethod ?? null,
      accountHolderName: body.accountHolderName ?? null,
      accountNumberFull: body.accountNumberFull ?? null,
      bankName: body.bankName ?? null,
      routingReference: body.routingReference ?? null,
      notes: body.notes ?? null
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof PaymentProfileValidationError || error instanceof PaymentProfileConflictError) {
      return NextResponse.json(
        { error: redactErrorForResponse(error), code: error.code },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'finance', {
      extra: { route: 'my/payment-profile', method: 'POST', memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
