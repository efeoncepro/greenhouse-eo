import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  PersonLegalProfileError,
  revealPersonIdentityDocument
} from '@/lib/person-legal-profile'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ memberId: string; documentId: string }>
}

/**
 * TASK-784 Slice 4 — POST reveal sensitive value of an identity document.
 *
 * Capability: `person.legal_profile.reveal_sensitive` (least privilege —
 * EFEONCE_ADMIN + FINANCE_ADMIN only).
 *
 * Body: { reason: string (>= 5 chars) }
 *
 * Response: { document: { ..., valueFull, valueNormalized }, auditId, eventId }
 *
 * Side effects:
 *   - Append-only row in person_identity_document_audit_log with action='revealed_sensitive'.
 *   - Outbox event person.identity_document.revealed_sensitive.
 *   - Reliability signal `identity.legal_profile.reveal_anomaly_rate` reads from these.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'person.legal_profile.reveal_sensitive', 'read', 'tenant')) {
    return NextResponse.json(
      { error: 'Capability missing: person.legal_profile.reveal_sensitive', code: 'forbidden' },
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

  if (typeof body.reason !== 'string' || body.reason.trim().length < 5) {
    return NextResponse.json(
      { error: 'reason debe tener al menos 5 caracteres (requerido para audit)', code: 'reason_required' },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  try {
    const result = await revealPersonIdentityDocument({
      documentId,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email ?? null,
      reason: body.reason,
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
      extra: { route: 'hr/legal-profile/reveal', documentId }
    })

    return NextResponse.json({ error: redactErrorForResponse(error), code: 'internal_error' }, { status: 500 })
  }
}
