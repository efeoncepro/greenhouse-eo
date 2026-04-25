import { NextResponse } from 'next/server'

import {
  buildTenantEntitlementSubject,
  resolvePartySyncConflict,
  type ResolvePartySyncConflictAction
} from '@/lib/commercial/party'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  conflictId: string
}

interface ResolveBody {
  action?: unknown
  reason?: unknown
}

const ACTIONS: readonly ResolvePartySyncConflictAction[] = [
  'force_outbound',
  'force_inbound',
  'ignore'
] as const

export async function POST(request: Request, { params }: { params: Promise<RouteParams> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasEntitlement(buildTenantEntitlementSubject(tenant), 'commercial.party.override_lifecycle', 'update')) {
    return NextResponse.json(
      { error: 'Missing capability commercial.party.override_lifecycle.' },
      { status: 403 }
    )
  }

  const { conflictId } = await params

  let body: ResolveBody

  try {
    body = (await request.json()) as ResolveBody
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON.' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!ACTIONS.includes(action as ResolvePartySyncConflictAction)) {
    return NextResponse.json(
      { error: `action must be one of: ${ACTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const result = await resolvePartySyncConflict({
      conflictId,
      action: action as ResolvePartySyncConflictAction,
      reason,
      actor: {
        userId: tenant.userId,
        roleCodes: tenant.roleCodes,
        reason
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      'message' in error
    ) {
      const typed = error as { statusCode: number; message: string; code?: string; details?: unknown }

      return NextResponse.json(
        { error: typed.message, code: typed.code, details: typed.details },
        { status: typed.statusCode }
      )
    }

    throw error
  }
}
