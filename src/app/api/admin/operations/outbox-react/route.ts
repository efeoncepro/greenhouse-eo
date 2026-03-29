import { NextResponse } from 'next/server'

import { ensureReactiveSchema, processReactiveEvents } from '@/lib/sync/reactive-consumer'
import type { ProjectionDomain } from '@/lib/sync/projection-registry'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_DOMAINS = new Set<ProjectionDomain>(['organization', 'notifications', 'people', 'finance'])

const parseDomain = (value: unknown): ProjectionDomain | null => {
  if (typeof value !== 'string' || value.trim() === '' || value === 'all') return null

  return ALLOWED_DOMAINS.has(value as ProjectionDomain) ? (value as ProjectionDomain) : null
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const domain = parseDomain(body.domain)

  try {
    await ensureReactiveSchema()

    const result = await processReactiveEvents(domain ? { domain } : undefined)

    return NextResponse.json({ ...result, domain: domain || 'all' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
