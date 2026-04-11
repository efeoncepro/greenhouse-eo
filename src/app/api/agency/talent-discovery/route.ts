import { NextResponse } from 'next/server'

import { searchTalent, TalentDiscoveryError } from '@/lib/agency/talent-discovery'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

import type { TalentDiscoveryFilters } from '@/lib/agency/talent-discovery'

export const dynamic = 'force-dynamic'

const VALID_SORT_BY = new Set(['relevance', 'availability', 'verified_count'])
const VALID_VERIFICATION = new Set(['all', 'verified_only', 'has_verified'])

const toErrorResponse = (error: unknown, fallback: string) => {
  if (error instanceof TalentDiscoveryError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  console.error(fallback, error)

  return NextResponse.json({ error: fallback }, { status: 500 })
}

const parseCommaSeparated = (value: string | null): string[] | undefined => {
  if (!value || !value.trim()) return undefined

  return value
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)

    const q = searchParams.get('q') || undefined
    const skillCodes = parseCommaSeparated(searchParams.get('skills'))
    const toolCodes = parseCommaSeparated(searchParams.get('tools'))
    const languageCodes = parseCommaSeparated(searchParams.get('languages'))

    const verificationParam = searchParams.get('verification') || 'all'

    const verificationFilter = VALID_VERIFICATION.has(verificationParam)
      ? (verificationParam as TalentDiscoveryFilters['verificationFilter'])
      : 'all'

    const sortByParam = searchParams.get('sortBy') || 'relevance'

    const sortBy = VALID_SORT_BY.has(sortByParam)
      ? (sortByParam as TalentDiscoveryFilters['sortBy'])
      : 'relevance'

    const availabilityMinRaw = searchParams.get('availabilityMin')

    const availabilityMin = availabilityMinRaw != null
      ? Math.max(0, Number(availabilityMinRaw) || 0)
      : undefined

    const filters: TalentDiscoveryFilters = {
      q,
      skillCodes,
      toolCodes,
      languageCodes,
      verificationFilter,
      availabilityMin,
      sortBy
    }

    const result = await searchTalent(filters)

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error, 'Unable to load talent discovery results.')
  }
}
