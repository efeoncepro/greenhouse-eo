import 'server-only'

import { NextResponse } from 'next/server'

import {
  enableClientPortalModule,
  type EnableClientPortalModuleInput
} from '@/lib/client-portal/commands/enable-module'
import {
  BusinessLineMismatchError,
  ClientPortalValidationError,
  assertIsoDate,
  assertIsoTimestamp,
  assertNonEmptyString,
  assertValidAssignmentSource,
  assertValidAssignmentStatus
} from '@/lib/client-portal/commands/errors'
import { query } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type AssignmentListRow = {
  assignment_id: string
  organization_id: string
  module_key: string
  status: string
  source: string
  effective_from: string | Date
  effective_to: string | Date | null
  expires_at: string | Date | null
  approved_by_user_id: string | null
  approved_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  module_display_label: string | null
  module_applicability_scope: string | null
  module_tier: string | null
} & Record<string, unknown>

const toIsoString = (value: string | Date | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'client_portal.module.read_assignment', 'read', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { organizationId } = await params

  try {
    const rows = await query<AssignmentListRow>(`
      SELECT
        a.assignment_id,
        a.organization_id,
        a.module_key,
        a.status,
        a.source,
        a.effective_from,
        a.effective_to,
        a.expires_at,
        a.approved_by_user_id,
        a.approved_at,
        a.created_at,
        a.updated_at,
        m.display_label    AS module_display_label,
        m.applicability_scope AS module_applicability_scope,
        m.tier             AS module_tier
      FROM greenhouse_client_portal.module_assignments a
      LEFT JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
      WHERE a.organization_id = $1
      ORDER BY a.created_at DESC
    `, [organizationId])

    const items = rows.map(row => ({
      assignmentId: row.assignment_id,
      organizationId: row.organization_id,
      moduleKey: row.module_key,
      moduleDisplayLabel: row.module_display_label,
      moduleApplicabilityScope: row.module_applicability_scope,
      moduleTier: row.module_tier,
      status: row.status,
      source: row.source,
      effectiveFrom: toIsoString(row.effective_from),
      effectiveTo: toIsoString(row.effective_to),
      expiresAt: toIsoString(row.expires_at),
      approvedByUserId: row.approved_by_user_id,
      approvedAt: toIsoString(row.approved_at),
      createdAt: toIsoString(row.created_at),
      updatedAt: toIsoString(row.updated_at)
    }))

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'api_admin_modules_list', stage: 'select_assignments' },
      extra: { organizationId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}

interface EnableModuleBody {
  moduleKey?: unknown
  status?: unknown
  source?: unknown
  sourceRefJson?: unknown
  effectiveFrom?: unknown
  expiresAt?: unknown
  reason?: unknown
  overrideBusinessLineMismatch?: unknown
  overrideReason?: unknown
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'client_portal.module.enable', 'create', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { organizationId } = await params

  let body: EnableModuleBody | null = null

  try {
    body = (await request.json().catch(() => null)) as EnableModuleBody | null

    if (!body) {
      return NextResponse.json({ error: 'Body JSON is required' }, { status: 400 })
    }

    const moduleKey = assertNonEmptyString(body.moduleKey, 'moduleKey')
    const source = assertValidAssignmentSource(body.source)
    const effectiveFrom = assertIsoDate(body.effectiveFrom, 'effectiveFrom')
    const status = body.status === undefined ? 'active' : assertValidAssignmentStatus(body.status)

    const expiresAt =
      body.expiresAt === undefined || body.expiresAt === null
        ? undefined
        : assertIsoTimestamp(body.expiresAt, 'expiresAt')

    // Capability gate específico para el override flag
    if (body.overrideBusinessLineMismatch === true) {
      if (!can(tenant, 'client_portal.module.override_business_line_default', 'approve', 'tenant')) {
        return NextResponse.json(
          { error: 'Forbidden — override_business_line_default capability required' },
          { status: 403 }
        )
      }
    }

    const input: EnableClientPortalModuleInput = {
      organizationId,
      moduleKey,
      status,
      source,
      sourceRefJson:
        body.sourceRefJson && typeof body.sourceRefJson === 'object'
          ? (body.sourceRefJson as Record<string, unknown>)
          : undefined,
      effectiveFrom,
      expiresAt,
      approvedByUserId: tenant.userId,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
      overrideBusinessLineMismatch: body.overrideBusinessLineMismatch === true,
      overrideReason: typeof body.overrideReason === 'string' ? body.overrideReason : undefined
    }

    const result = await enableClientPortalModule(input)

    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 })
  } catch (error) {
    if (error instanceof BusinessLineMismatchError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.statusCode }
      )
    }

    if (error instanceof ClientPortalValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.details ?? null },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'client_portal', {
      tags: { source: 'api_admin_modules_enable', stage: 'enable_command' },
      extra: { organizationId, moduleKey: body?.moduleKey }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
