import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  PersonLegalProfileError,
  declarePersonAddress,
  resolveProfileIdForMember
} from '@/lib/person-legal-profile'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ memberId: string }>
}

const VALID_ADDRESS_TYPES = ['legal', 'residence', 'mailing', 'emergency'] as const

type AddressKind = (typeof VALID_ADDRESS_TYPES)[number]

const isAddressKind = (v: unknown): v is AddressKind =>
  typeof v === 'string' && (VALID_ADDRESS_TYPES as readonly string[]).includes(v)

/**
 * TASK-784 HR redesign — POST: HR-direct create / replace address.
 * Capability: `person.legal_profile.hr_update`. Source persisted as
 * `hr_declared`. Reason >= 10 chars required for audit.
 *
 * Body: { addressType, countryCode, streetLine1, city, region?, postalCode?, reason }
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'person.legal_profile.hr_update', 'create', 'tenant')) {
    return NextResponse.json(
      { error: 'Capability missing: person.legal_profile.hr_update', code: 'forbidden' },
      { status: 403 }
    )
  }

  const { memberId } = await params

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) ?? {}
  } catch {
    body = {}
  }

  if (!isAddressKind(body.addressType)) {
    return NextResponse.json(
      { error: 'addressType invalido', code: 'invalid_input' },
      { status: 400 }
    )
  }

  if (
    typeof body.countryCode !== 'string' ||
    typeof body.streetLine1 !== 'string' ||
    typeof body.city !== 'string'
  ) {
    return NextResponse.json(
      { error: 'countryCode, streetLine1, city requeridos', code: 'invalid_input' },
      { status: 400 }
    )
  }

  if (typeof body.reason !== 'string' || body.reason.trim().length < 10) {
    return NextResponse.json(
      {
        error: 'Motivo del cambio HR es obligatorio (minimo 10 caracteres) — queda en audit log',
        code: 'reason_required'
      },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  try {
    const profileId = await resolveProfileIdForMember(memberId)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Member or profile not found', code: 'profile_not_linked' },
        { status: 404 }
      )
    }

    const result = await declarePersonAddress({
      profileId,
      addressType: body.addressType,
      countryCode: body.countryCode,
      streetLine1: body.streetLine1,
      city: body.city,
      region: typeof body.region === 'string' ? body.region : null,
      postalCode: typeof body.postalCode === 'string' ? body.postalCode : null,
      source: 'hr_declared',
      validFrom: typeof body.validFrom === 'string' ? body.validFrom : null,
      validUntil: typeof body.validUntil === 'string' ? body.validUntil : null,
      notes: `HR-direct reason: ${body.reason.trim()}${typeof body.notes === 'string' ? ' · ' + body.notes : ''}`,
      declaredByUserId: tenant.userId,
      ipAddress,
      userAgent
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof PersonLegalProfileError) {
      return NextResponse.json(
        { error: redactErrorForResponse(error), code: error.code },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'identity', {
      extra: {
        route: 'hr/legal-profile/address',
        method: 'POST',
        memberId,
        actorUserId: session?.user?.id ?? null
      }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
