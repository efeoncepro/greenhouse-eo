import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { RoleTitleError, resolveRoleTitleDriftProposal } from '@/lib/workforce/role-title'
import type { DriftDecision } from '@/lib/workforce/role-title'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ proposalId: string }>
}

const VALID_DECISIONS: DriftDecision[] = ['accept_entra', 'keep_hr', 'dismissed']

/**
 * TASK-785 — POST /api/hr/workforce/role-title-drift/[proposalId]/resolve
 *
 * Capability: `workforce.role_title.review_drift` (HR + EFEONCE_ADMIN, action=approve).
 * Body: { decision: 'accept_entra'|'keep_hr'|'dismissed', resolutionNote: string (>=10 chars) }
 *
 * Side effects (atomic tx):
 *   - If decision='accept_entra': UPDATE member.role_title=proposed (source='entra'),
 *     clear last_human_update_at.
 *   - If decision='keep_hr': no member change (HR override stays).
 *   - If decision='dismissed': no member change.
 *   - Append audit row with action='drift_accepted_entra'|'drift_kept_hr'|'drift_dismissed'.
 *   - UPDATE proposal status='approved'/'rejected'/'dismissed'.
 *   - Publish outbox event member.role_title.drift_resolved.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) {
    return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'workforce.role_title.review_drift', 'approve', 'tenant')) {
    return NextResponse.json(
      { error: 'Capability missing: workforce.role_title.review_drift', code: 'forbidden' },
      { status: 403 }
    )
  }

  const { proposalId } = await params

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) ?? {}
  } catch {
    body = {}
  }

  const decision = body.decision

  if (typeof decision !== 'string' || !VALID_DECISIONS.includes(decision as DriftDecision)) {
    return NextResponse.json(
      {
        error: `decision invalido (esperado: ${VALID_DECISIONS.join(', ')})`,
        code: 'invalid_input'
      },
      { status: 400 }
    )
  }

  if (typeof body.resolutionNote !== 'string' || body.resolutionNote.trim().length < 10) {
    return NextResponse.json(
      {
        error: 'Nota de resolucion requerida (minimo 10 caracteres) — queda en audit log',
        code: 'reason_required'
      },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  try {
    const result = await resolveRoleTitleDriftProposal({
      proposalId,
      decision: decision as DriftDecision,
      resolutionNote: body.resolutionNote,
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
      extra: {
        route: 'hr/workforce/role-title-drift/resolve',
        proposalId
      }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
