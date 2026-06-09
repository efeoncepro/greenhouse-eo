import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { buildOrganizationWorkspaceSubjectFromTenant } from '@/lib/organization-workspace/build-projection-subject'
import {
  OrganizationWorkspaceCompactSignalsNotFoundError,
  readOrganizationWorkspaceCompactSignalsSafely
} from '@/lib/organization-workspace/compact-signals'

export const dynamic = 'force-dynamic'

const parsePositiveInt = (value: string | null, fallback: number | null = null) => {
  if (!value) return fallback

  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const url = new URL(request.url)

  try {
    const payload = await readOrganizationWorkspaceCompactSignalsSafely({
      subject: buildOrganizationWorkspaceSubjectFromTenant(tenant),
      organizationId: id,
      entrypointContext: 'agency',
      asOf: url.searchParams.get('asOf'),
      periodYear: parsePositiveInt(url.searchParams.get('year')),
      periodMonth: parsePositiveInt(url.searchParams.get('month')),
      limits: {
        account360: parsePositiveInt(url.searchParams.get('accountLimit'), 20) ?? 20,
        recentSignals: parsePositiveInt(url.searchParams.get('recentSignalsLimit'), 6) ?? 6,
        nextActions: parsePositiveInt(url.searchParams.get('nextActionsLimit'), 5) ?? 5
      }
    })

    const response = NextResponse.json(payload)

    response.headers.set('X-Compact-Signals-Status', payload.status)
    response.headers.set('X-Compact-Signals-Computed-At', payload.computedAt)

    return response
  } catch (error) {
    if (error instanceof OrganizationWorkspaceCompactSignalsNotFoundError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    throw error
  }
}
