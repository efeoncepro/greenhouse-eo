import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  PersonLegalProfileError,
  declareIdentityDocument,
  isPersonDocumentType,
  resolveProfileIdForMember
} from '@/lib/person-legal-profile'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ memberId: string }>
}

/**
 * TASK-784 HR redesign — POST: HR-direct create / replace identity document.
 * Capability: `person.legal_profile.hr_update`. Source persisted as
 * `hr_declared` and the audit log captures `actorUserId` + reason in
 * declareIdentityDocument's downstream audit row.
 *
 * Body: { countryCode, documentType, rawValue, reason (>= 10 chars) }
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

  if (!isPersonDocumentType(body.documentType)) {
    return NextResponse.json(
      { error: 'documentType invalido', code: 'invalid_input' },
      { status: 400 }
    )
  }

  if (typeof body.countryCode !== 'string' || typeof body.rawValue !== 'string') {
    return NextResponse.json(
      { error: 'countryCode + rawValue requeridos', code: 'invalid_input' },
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

    const result = await declareIdentityDocument({
      profileId,
      countryCode: body.countryCode,
      documentType: body.documentType,
      rawValue: body.rawValue,
      source: 'hr_declared',
      issuingCountry: typeof body.issuingCountry === 'string' ? body.issuingCountry : null,
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
        route: 'hr/legal-profile/document',
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
