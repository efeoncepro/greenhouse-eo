import 'server-only'

import { getDb } from '@/lib/db'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { buildApiPlatformEtag, isApiPlatformConditionalMatch, maxIsoTimestamp } from '@/lib/api-platform/core/freshness'
import {
  buildApiPlatformPaginationLinkHeader,
  buildApiPlatformPaginationMeta,
  parseApiPlatformPaginationParams
} from '@/lib/api-platform/core/pagination'
import { getOrganizationDetail } from '@/lib/account-360/organization-store'
import { resolveOrganizationIdentifier } from '@/lib/account-360/resolve-organization-id'

type OrganizationRow = {
  organization_id: string | null
  public_id: string | null
  organization_name: string | null
  legal_name: string | null
  organization_type: string | null
  industry: string | null
  country: string | null
  hubspot_company_id: string | null
  status: string | null
  active: boolean | null
  space_count: string | number | bigint | null
  membership_count: string | number | bigint | null
  unique_person_count: string | number | bigint | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number(value) || 0

  return 0
}

const toIso = (value: string | Date | null | undefined) => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const normalizeOrganizationRow = (row: OrganizationRow) => ({
  organizationId: row.organization_id || '',
  publicId: row.public_id || '',
  organizationName: row.organization_name || '',
  legalName: row.legal_name,
  organizationType: row.organization_type ?? 'other',
  industry: row.industry,
  country: row.country,
  hubspotCompanyId: row.hubspot_company_id,
  status: row.status ?? 'active',
  active: Boolean(row.active),
  spaceCount: toNumber(row.space_count),
  membershipCount: toNumber(row.membership_count),
  uniquePersonCount: toNumber(row.unique_person_count),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
})

const getAccessibleOrganizationIds = async (context: ApiPlatformRequestContext) => {
  const scopeType = context.binding.greenhouseScopeType

  if (scopeType === 'internal') {
    return null
  }

  if (scopeType === 'organization') {
    return context.binding.organizationId ? [context.binding.organizationId] : []
  }

  const db = await getDb()
  let queryBuilder = db
    .selectFrom('greenhouse_core.spaces as s')
    .select('s.organization_id')
    .where('s.organization_id', 'is not', null)
    .distinct()

  if (scopeType === 'client' && context.binding.clientId) {
    queryBuilder = queryBuilder.where('s.client_id', '=', context.binding.clientId)
  }

  if (scopeType === 'space' && context.binding.spaceId) {
    queryBuilder = queryBuilder.where('s.space_id', '=', context.binding.spaceId)
  }

  const rows = await queryBuilder.execute()

  return rows
    .map(row => row.organization_id)
    .filter((value): value is string => Boolean(value))
}

export const listEcosystemOrganizations = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}) => {
  const url = new URL(request.url)
  const { page, pageSize, offset } = parseApiPlatformPaginationParams(request)
  const search = url.searchParams.get('search')?.trim() || undefined
  const status = url.searchParams.get('status')?.trim() || undefined
  const type = url.searchParams.get('type')?.trim() || undefined

  const accessibleOrganizationIds = await getAccessibleOrganizationIds(context)

  if (accessibleOrganizationIds?.length === 0) {
    const pagination = buildApiPlatformPaginationMeta({
      page,
      pageSize,
      total: 0,
      count: 0
    })

    const data = {
      page,
      pageSize,
      count: 0,
      items: []
    }

    const etag = buildApiPlatformEtag({
      data,
      pagination,
      scope: context.binding.greenhouseScopeType
    })

    return {
      data,
      meta: {
        pagination,
        freshness: {
          etag,
          lastModified: null,
          source: 'postgres_serving',
          conditionalRequests: ['If-None-Match']
        }
      },
      etag,
      cacheControl: 'private, max-age=0, must-revalidate',
      notModified: isApiPlatformConditionalMatch({
        request,
        etag
      })
    }
  }

  const db = await getDb()
  let countQuery = db
    .selectFrom('greenhouse_serving.organization_360 as o')
    .select(({ fn }) => fn.countAll<string>().as('total'))

  let rowsQuery = db
    .selectFrom('greenhouse_serving.organization_360 as o')
    .select([
      'o.organization_id',
      'o.public_id',
      'o.organization_name',
      'o.legal_name',
      'o.organization_type',
      'o.industry',
      'o.country',
      'o.hubspot_company_id',
      'o.status',
      'o.active',
      'o.space_count',
      'o.membership_count',
      'o.unique_person_count',
      'o.created_at',
      'o.updated_at'
    ])

  if (accessibleOrganizationIds) {
    countQuery = countQuery.where('o.organization_id', 'in', accessibleOrganizationIds)
    rowsQuery = rowsQuery.where('o.organization_id', 'in', accessibleOrganizationIds)
  }

  if (search) {
    countQuery = countQuery.where(expressionBuilder =>
      expressionBuilder.or([
        expressionBuilder('o.organization_name', 'ilike', `%${search}%`),
        expressionBuilder('o.legal_name', 'ilike', `%${search}%`),
        expressionBuilder('o.public_id', 'ilike', `%${search}%`)
      ])
    )
    rowsQuery = rowsQuery.where(expressionBuilder =>
      expressionBuilder.or([
        expressionBuilder('o.organization_name', 'ilike', `%${search}%`),
        expressionBuilder('o.legal_name', 'ilike', `%${search}%`),
        expressionBuilder('o.public_id', 'ilike', `%${search}%`)
      ])
    )
  }

  if (status && status !== 'all') {
    countQuery = countQuery.where('o.status', '=', status)
    rowsQuery = rowsQuery.where('o.status', '=', status)
  }

  if (type && type !== 'all') {
    countQuery = countQuery.where('o.organization_type', '=', type)
    rowsQuery = rowsQuery.where('o.organization_type', '=', type)
  }

  const [countRow, rows] = await Promise.all([
    countQuery.executeTakeFirst(),
    rowsQuery
      .orderBy('o.organization_name', 'asc')
      .limit(pageSize)
      .offset(offset)
      .execute()
  ])

  const total = toNumber(countRow?.total)
  const items = rows.map(row => normalizeOrganizationRow(row))

  const pagination = buildApiPlatformPaginationMeta({
    page,
    pageSize,
    count: items.length,
    total
  })

  const linkHeader = buildApiPlatformPaginationLinkHeader({
    request,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage
  })

  const data = {
    page,
    pageSize,
    count: items.length,
    items
  }

  const lastModified = maxIsoTimestamp(items.map(item => item.updatedAt))

  const etag = buildApiPlatformEtag({
    data,
    pagination,
    scope: context.binding.greenhouseScopeType
  })

  return {
    data,
    meta: {
      pagination,
      freshness: {
        etag,
        lastModified,
        source: 'postgres_serving',
        conditionalRequests: ['If-None-Match', 'If-Modified-Since']
      }
    },
    headers: linkHeader ? { link: linkHeader } : undefined,
    cacheControl: 'private, max-age=0, must-revalidate',
    etag,
    lastModified: lastModified ?? undefined,
    notModified: isApiPlatformConditionalMatch({
      request,
      etag,
      lastModified
    })
  }
}

export const getEcosystemOrganizationDetail = async ({
  context,
  request,
  identifier
}: {
  context: ApiPlatformRequestContext
  request: Request
  identifier: string
}) => {
  const resolved = await resolveOrganizationIdentifier(identifier)

  if (!resolved) {
    throw new ApiPlatformError('Organization not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const accessibleOrganizationIds = await getAccessibleOrganizationIds(context)

  if (accessibleOrganizationIds && !accessibleOrganizationIds.includes(resolved.organizationId)) {
    throw new ApiPlatformError('Organization is outside the resolved consumer scope.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }

  const detail = await getOrganizationDetail(resolved.organizationId)

  if (!detail) {
    throw new ApiPlatformError('Organization not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const etag = buildApiPlatformEtag(detail)
  const lastModified = maxIsoTimestamp([detail.updatedAt])

  return {
    data: detail,
    meta: {
      freshness: {
        etag,
        lastModified,
        source: 'postgres_serving',
        conditionalRequests: ['If-None-Match', 'If-Modified-Since']
      }
    },
    cacheControl: 'private, max-age=0, must-revalidate',
    etag,
    lastModified: lastModified ?? undefined,
    notModified: isApiPlatformConditionalMatch({
      request,
      etag,
      lastModified
    })
  }
}
