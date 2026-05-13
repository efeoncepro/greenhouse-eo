import 'server-only'

import { NextResponse } from 'next/server'

import {
  ClientPortalValidationError,
  assertIsoDate,
  assertNonEmptyString
} from '@/lib/client-portal/commands/errors'
import {
  churnClientPortalModule,
  expireClientPortalModule
} from '@/lib/client-portal/commands/expire-churn'
import {
  pauseClientPortalModule,
  resumeClientPortalModule
} from '@/lib/client-portal/commands/pause-resume'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type Operation = 'pause' | 'resume' | 'expire' | 'churn'

interface PatchAssignmentBody {
  operation?: unknown
  reason?: unknown
  effectiveTo?: unknown
}

const VALID_OPS: ReadonlyArray<Operation> = ['pause', 'resume', 'expire', 'churn']

const isValidOperation = (value: unknown): value is Operation =>
  typeof value === 'string' && VALID_OPS.includes(value as Operation)

const capabilityForOp = (op: Operation): {
  key: 'client_portal.module.pause' | 'client_portal.module.disable'
  action: 'update' | 'delete'
} => {
  if (op === 'pause' || op === 'resume' || op === 'expire') {
    return { key: 'client_portal.module.pause', action: 'update' }
  }

  // churn = terminal definitivo → capability `disable`
  return { key: 'client_portal.module.disable', action: 'delete' }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assignmentId } = await params

  let body: PatchAssignmentBody | null = null

  try {
    body = (await request.json().catch(() => null)) as PatchAssignmentBody | null

    if (!body) {
      return NextResponse.json({ error: 'Body JSON is required' }, { status: 400 })
    }

    if (!isValidOperation(body.operation)) {
      return NextResponse.json(
        { error: `operation must be one of ${VALID_OPS.join(', ')}` },
        { status: 400 }
      )
    }

    const operation = body.operation
    const { key: capabilityKey, action } = capabilityForOp(operation)

    if (!can(tenant, capabilityKey, action, 'tenant')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reason = typeof body.reason === 'string' ? body.reason : undefined

    const effectiveTo =
      body.effectiveTo === undefined || body.effectiveTo === null
        ? undefined
        : assertIsoDate(body.effectiveTo, 'effectiveTo')

    const commonInput = {
      assignmentId: assertNonEmptyString(assignmentId, 'assignmentId'),
      actorUserId: tenant.userId,
      reason
    }

    if (operation === 'pause') {
      const result = await pauseClientPortalModule(commonInput)

      return NextResponse.json(result)
    }

    if (operation === 'resume') {
      const result = await resumeClientPortalModule(commonInput)

      return NextResponse.json(result)
    }

    if (operation === 'expire') {
      const result = await expireClientPortalModule({ ...commonInput, effectiveTo })

      return NextResponse.json(result)
    }

    const result = await churnClientPortalModule({ ...commonInput, effectiveTo })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ClientPortalValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'client_portal', {
      tags: { source: 'api_admin_assignments_patch', stage: String(body?.operation ?? 'unknown') },
      extra: { assignmentId, operation: body?.operation }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'client_portal.module.disable', 'delete', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { assignmentId } = await params

  try {
    const result = await churnClientPortalModule({
      assignmentId: assertNonEmptyString(assignmentId, 'assignmentId'),
      actorUserId: tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ClientPortalValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'client_portal', {
      tags: { source: 'api_admin_assignments_delete', stage: 'churn_command' },
      extra: { assignmentId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
