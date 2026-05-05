import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { RoleTitleError, updateMemberRoleTitle } from '@/lib/workforce/role-title'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ memberId: string }>
}

/**
 * TASK-785 — PATCH /api/admin/team/members/[memberId]/role-title
 *
 * Capability: `workforce.role_title.update` (HR + EFEONCE_ADMIN).
 * Body: { newRoleTitle: string|null, reason: string (>=10 chars), effectiveAt?: ISO }
 *
 * Side effects (atomic tx):
 *   - UPDATE members.role_title + role_title_source='hr_manual' +
 *     last_human_update_at=NOW().
 *   - Resolve any pending Entra drift proposal as 'rejected'.
 *   - Append audit row in member_role_title_audit_log.
 *   - Publish outbox event member.role_title.changed.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) {
    return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'workforce.role_title.update', 'update', 'tenant')) {
    return NextResponse.json(
      { error: 'Capability missing: workforce.role_title.update', code: 'forbidden' },
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

  if (
    typeof body.newRoleTitle !== 'string' &&
    body.newRoleTitle !== null &&
    body.newRoleTitle !== undefined
  ) {
    return NextResponse.json(
      { error: 'newRoleTitle debe ser string | null', code: 'invalid_input' },
      { status: 400 }
    )
  }

  if (typeof body.reason !== 'string' || body.reason.trim().length < 10) {
    return NextResponse.json(
      {
        error: 'Razon del cambio HR requerida (minimo 10 caracteres) — queda en audit log',
        code: 'reason_required'
      },
      { status: 400 }
    )
  }

  let effectiveAt: Date | undefined

  if (typeof body.effectiveAt === 'string') {
    const parsed = new Date(body.effectiveAt)

    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: 'effectiveAt invalido (esperado ISO 8601)', code: 'invalid_input' },
        { status: 400 }
      )
    }

    effectiveAt = parsed
  }

  const session = await getServerAuthSession()
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  try {
    const result = await updateMemberRoleTitle({
      memberId,
      newRoleTitle: (body.newRoleTitle as string | null | undefined) ?? null,
      reason: body.reason,
      effectiveAt,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email ?? null,
      ipAddress,
      userAgent
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof RoleTitleError) {
      return NextResponse.json(
        { error: redactErrorForResponse(error), code: error.code },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'identity', {
      extra: { route: 'admin/team/members/role-title', memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
