import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { resolveLifecycleCase } from '@/lib/client-lifecycle/commands/resolve-lifecycle-case'
import { ClientLifecycleValidationError } from '@/lib/client-lifecycle/types'

export const dynamic = 'force-dynamic'

// POST /api/admin/clients/lifecycle/cases/[caseId]/resolve
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  const { tenant, userId, errorResponse } = await authorizeLifecycle('client.lifecycle.case.resolve')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const overrideBlockers = body.overrideBlockers === true

  // Override requires a second, stricter capability (EFEONCE_ADMIN only).
  if (overrideBlockers) {
    const override = await authorizeLifecycle('client.lifecycle.case.override_blocker')

    if (!override.tenant) {
      return override.errorResponse ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const resolution = body.resolution

    if (resolution !== 'completed' && resolution !== 'cancelled') {
      throw new ClientLifecycleValidationError('invalid_resolution', 'resolution debe ser completed o cancelled.', 400)
    }

    const result = await resolveLifecycleCase({
      caseId,
      resolution,
      resolutionReason: typeof body.resolutionReason === 'string' ? body.resolutionReason : undefined,
      overrideBlockers,
      overrideReason: typeof body.overrideReason === 'string' ? body.overrideReason : undefined,
      actorUserId: userId
    })

    return NextResponse.json(result)
  } catch (error) {
    return mapLifecycleError(error, 'resolve_case')
  }
}
