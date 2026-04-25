import { NextResponse } from 'next/server'

import { listPartySyncConflicts } from '@/lib/commercial/party'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parseBoolean = (value: string | null): boolean | null => {
  if (!value) return null

  if (['1', 'true', 'yes'].includes(value.toLowerCase())) return true
  if (['0', 'false', 'no'].includes(value.toLowerCase())) return false

  throw new Error(`Invalid boolean value: ${value}`)
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  try {
    const q = searchParams.get('q')
    const unresolvedOnly = parseBoolean(searchParams.get('unresolvedOnly'))
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const limit = limitParam ? Number(limitParam) : undefined
    const offset = offsetParam ? Number(offsetParam) : undefined

    if (limit != null && (!Number.isFinite(limit) || limit <= 0)) {
      return NextResponse.json({ error: 'limit must be a positive number.' }, { status: 400 })
    }

    if (offset != null && (!Number.isFinite(offset) || offset < 0)) {
      return NextResponse.json({ error: 'offset must be a non-negative number.' }, { status: 400 })
    }

    const result = await listPartySyncConflicts({
      query: q,
      unresolvedOnly: unresolvedOnly ?? true,
      limit,
      offset
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request.' },
      { status: 400 }
    )
  }
}
