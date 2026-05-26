import { NextResponse } from 'next/server'

import { ensureReactiveSchema, processReactiveEvents } from '@/lib/sync/reactive-consumer'
import { PROJECTION_DOMAINS, type ProjectionDomain } from '@/lib/sync/projection-registry'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const parseStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined

  const strings = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)

  return strings.length > 0 ? strings : undefined
}

const parseBatchSize = (value: unknown): number | undefined => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) return undefined

  return Math.min(Math.floor(parsed), 1000)
}

const parseDomain = (value: unknown): ProjectionDomain | undefined => {
  if (typeof value !== 'string') return undefined

  return (PROJECTION_DOMAINS as readonly string[]).includes(value) ? (value as ProjectionDomain) : undefined
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    await ensureReactiveSchema()

    const result = await processReactiveEvents({
      domain: parseDomain(body.domain),
      batchSize: parseBatchSize(body.batchSize),
      handlerKeys: parseStringArray(body.handlerKeys),
      replayFailedHandlers: body.replayFailedHandlers === true
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
