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
import { resolveSelfServicePaymentProfileContext } from '@/lib/finance/beneficiary-payment-profiles/resolve-self-service-context'
import { validateSelfServiceSubmission } from '@/lib/finance/beneficiary-payment-profiles/self-service-validators'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

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
  // Regime-aware payload from self-service UI (TASK-753 redesign).
  // Currency + countryCode + regime son INFERIDOS server-side, pero
  // aceptamos los del cliente para back-compat con consumers viejos.
  currency?: 'CLP' | 'USD'
  beneficiaryName?: string | null
  countryCode?: string | null
  accountHolderName?: string | null
  accountNumberFull?: string | null
  bankName?: string | null
  notes?: string | null

  // CL-specific
  accountTypeCl?: 'cuenta_corriente' | 'cuenta_vista' | 'cuenta_rut' | 'chequera_electronica' | null
  rut?: string | null

  // International-specific
  swiftBic?: string | null
  ibanOrAccount?: string | null
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

  // Resolve regime server-side (NO trust client). Source of truth: members + identity_profiles.
  const context = await resolveSelfServicePaymentProfileContext(memberId)

  if (context.regime === 'unset') {
    return NextResponse.json(
      {
        error: context.unsetReason ?? 'No podemos identificar tu régimen. Contacta a finance.',
        code: 'regime_unset'
      },
      { status: 422 }
    )
  }

  // Validate regime-aware. Cliente puede usar la misma rule set para UX hint;
  // server SIEMPRE re-valida (defense in depth).
  const accountForValidation =
    context.regime === 'international' ? body.ibanOrAccount ?? body.accountNumberFull : body.accountNumberFull

  const validation = validateSelfServiceSubmission(context.regime, {
    bankName: body.bankName,
    accountNumberFull: accountForValidation,
    accountHolderName: body.accountHolderName,
    accountTypeCl: body.accountTypeCl,
    rut: body.rut,
    countryCode: body.countryCode ?? context.countryCode,
    swiftBic: body.swiftBic,
    ibanOrAccount: body.ibanOrAccount,
    notes: body.notes
  })

  if (!validation.ok) {
    return NextResponse.json(
      {
        error: 'Datos invalidos. Revisa los campos marcados.',
        code: 'invalid_input',
        fieldErrors: validation.errors
      },
      { status: 400 }
    )
  }

  // Currency es inferida del régimen, no del cliente.
  const currency: 'CLP' | 'USD' = context.currency ?? (body.currency === 'USD' ? 'USD' : 'CLP')

  try {
    const result = await createSelfServicePaymentProfileRequest({
      memberId,
      userId: session.user.id,
      currency,
      regime: context.regime,
      beneficiaryName: body.beneficiaryName ?? context.legalFullName,
      countryCode: body.countryCode ?? context.countryCode,
      accountHolderName: body.accountHolderName ?? null,
      accountNumberFull: accountForValidation ?? null,
      bankName: body.bankName ?? null,
      notes: body.notes ?? null,
      accountTypeCl: body.accountTypeCl ?? null,
      rut: body.rut ?? null,
      swiftBic: body.swiftBic ?? null
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
