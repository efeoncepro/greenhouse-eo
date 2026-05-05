import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { PersonLegalProfileError, rejectIdentityDocument } from '@/lib/person-legal-profile'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ memberId: string; documentId: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'person.legal_profile.verify', 'approve', 'tenant')) {
    return NextResponse.json(
      { error: 'Capability missing: person.legal_profile.verify', code: 'forbidden' },
      { status: 403 }
    )
  }

  const { documentId } = await params

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) ?? {}
  } catch {
    body = {}
  }

  if (typeof body.rejectedReason !== 'string' || body.rejectedReason.trim().length < 10) {
    return NextResponse.json(
      { error: 'rejectedReason debe tener al menos 10 caracteres', code: 'rejection_reason_too_short' },
      { status: 400 }
    )
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  try {
    const result = await rejectIdentityDocument({
      documentId,
      rejectedByUserId: tenant.userId,
      rejectedReason: body.rejectedReason,
      ipAddress,
      userAgent
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PersonLegalProfileError) {
      return NextResponse.json(
        { error: redactErrorForResponse(error), code: error.code },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'identity', {
      extra: { route: 'hr/legal-profile/reject', documentId }
    })

    return NextResponse.json({ error: redactErrorForResponse(error), code: 'internal_error' }, { status: 500 })
  }
}
