import { NextResponse } from 'next/server'

import {
  HomeRolloutFlagValidationError,
  deleteHomeRolloutFlag,
  listHomeRolloutFlags,
  upsertHomeRolloutFlag
} from '@/lib/home/rollout-flags-store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-780 Phase 2 — Admin endpoint for home rollout flags.
 *
 * Surface:
 *  - GET    list (filter by flag_key optional)
 *  - POST   upsert (idempotent)
 *  - DELETE remove
 *
 * Capability: gated by `requireAdminTenantContext` (EFEONCE_ADMIN tenant).
 * No granular capability key is wired yet because the only flag today is the
 * shell variant cutover — when more flags land, we'll factor out a
 * `home.rollout.write` capability and gate per-flag editors.
 *
 * Errors are sanitized to the client (no stack traces, no env leakage).
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const flagKey = searchParams.get('flagKey')

    const rows = await listHomeRolloutFlags(flagKey === 'home_v2_shell' ? 'home_v2_shell' : undefined)

    return NextResponse.json({ flags: rows })
  } catch (error) {
    captureWithDomain(error, 'home', { tags: { source: 'admin_rollout_flags_list' } })

    return NextResponse.json({ error: 'Failed to list rollout flags' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const flagKey = String(body.flagKey ?? '')
  const scopeType = String(body.scopeType ?? '')
  const scopeId = body.scopeId === null || body.scopeId === undefined ? null : String(body.scopeId)
  const enabled = Boolean(body.enabled)
  const reason = String(body.reason ?? '')

  try {
    const row = await upsertHomeRolloutFlag({
      flagKey: flagKey as 'home_v2_shell',
      scopeType: scopeType as 'global' | 'tenant' | 'role' | 'user',
      scopeId,
      enabled,
      reason
    })

    return NextResponse.json({ flag: row }, { status: 200 })
  } catch (error) {
    if (error instanceof HomeRolloutFlagValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    captureWithDomain(error, 'home', { tags: { source: 'admin_rollout_flags_upsert' } })

    return NextResponse.json({ error: 'Failed to upsert rollout flag' }, { status: 502 })
  }
}

export async function DELETE(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const flagKey = String(body.flagKey ?? '')
  const scopeType = String(body.scopeType ?? '')
  const scopeId = body.scopeId === null || body.scopeId === undefined ? null : String(body.scopeId)

  try {
    const result = await deleteHomeRolloutFlag({
      flagKey: flagKey as 'home_v2_shell',
      scopeType: scopeType as 'global' | 'tenant' | 'role' | 'user',
      scopeId
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof HomeRolloutFlagValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    captureWithDomain(error, 'home', { tags: { source: 'admin_rollout_flags_delete' } })

    return NextResponse.json({ error: 'Failed to delete rollout flag' }, { status: 502 })
  }
}
