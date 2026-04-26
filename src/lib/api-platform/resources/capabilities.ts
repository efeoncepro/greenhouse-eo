import 'server-only'

import { getDb } from '@/lib/db'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { buildApiPlatformEtag, isApiPlatformConditionalMatch, maxIsoTimestamp } from '@/lib/api-platform/core/freshness'
import {
  buildApiPlatformPaginationLinkHeader,
  buildApiPlatformPaginationMeta,
  parseApiPlatformPaginationParams
} from '@/lib/api-platform/core/pagination'

export const listEcosystemCapabilities = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}) => {
  const db = await getDb()
  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim()
  const { page, pageSize, offset } = parseApiPlatformPaginationParams(request)

  let queryBuilder = db
    .selectFrom('greenhouse_serving.client_capability_360 as cc')
    .select([
      'cc.assignment_id',
      'cc.client_id',
      'cc.client_name',
      'cc.client_public_id',
      'cc.module_id',
      'cc.module_code',
      'cc.module_name',
      'cc.business_line',
      'cc.status',
      'cc.active',
      'cc.source_system',
      'cc.source_reference',
      'cc.assigned_at',
      'cc.ends_at',
      'cc.created_at',
      'cc.updated_at'
    ])
    .where('cc.client_id', 'is not', null)
    .where('cc.module_id', 'is not', null)

  let countQuery = db
    .selectFrom('greenhouse_serving.client_capability_360 as cc')
    .select(({ fn }) => fn.countAll<string>().as('total'))
    .where('cc.client_id', 'is not', null)
    .where('cc.module_id', 'is not', null)

  if (context.binding.greenhouseScopeType === 'organization' && context.binding.organizationId) {
    queryBuilder = queryBuilder.where('cc.client_id', 'in', expressionBuilder =>
      expressionBuilder
        .selectFrom('greenhouse_core.spaces as s')
        .select('s.client_id')
        .where('s.organization_id', '=', context.binding.organizationId!)
        .where('s.client_id', 'is not', null)
        .distinct()
    )
    countQuery = countQuery.where('cc.client_id', 'in', expressionBuilder =>
      expressionBuilder
        .selectFrom('greenhouse_core.spaces as s')
        .select('s.client_id')
        .where('s.organization_id', '=', context.binding.organizationId!)
        .where('s.client_id', 'is not', null)
        .distinct()
    )
  }

  if (context.binding.greenhouseScopeType === 'client' && context.binding.clientId) {
    queryBuilder = queryBuilder.where('cc.client_id', '=', context.binding.clientId)
    countQuery = countQuery.where('cc.client_id', '=', context.binding.clientId)
  }

  if (context.binding.greenhouseScopeType === 'space' && context.binding.spaceId) {
    queryBuilder = queryBuilder.where('cc.client_id', 'in', expressionBuilder =>
      expressionBuilder
        .selectFrom('greenhouse_core.spaces as s')
        .select('s.client_id')
        .where('s.space_id', '=', context.binding.spaceId!)
        .where('s.client_id', 'is not', null)
        .limit(1)
    )
    countQuery = countQuery.where('cc.client_id', 'in', expressionBuilder =>
      expressionBuilder
        .selectFrom('greenhouse_core.spaces as s')
        .select('s.client_id')
        .where('s.space_id', '=', context.binding.spaceId!)
        .where('s.client_id', 'is not', null)
        .limit(1)
    )
  }

  if (search) {
    queryBuilder = queryBuilder.where(expressionBuilder =>
      expressionBuilder.or([
        expressionBuilder('cc.module_code', 'ilike', `%${search}%`),
        expressionBuilder('cc.module_name', 'ilike', `%${search}%`),
        expressionBuilder('cc.client_name', 'ilike', `%${search}%`)
      ])
    )
    countQuery = countQuery.where(expressionBuilder =>
      expressionBuilder.or([
        expressionBuilder('cc.module_code', 'ilike', `%${search}%`),
        expressionBuilder('cc.module_name', 'ilike', `%${search}%`),
        expressionBuilder('cc.client_name', 'ilike', `%${search}%`)
      ])
    )
  }

  const [countRow, rows] = await Promise.all([
    countQuery.executeTakeFirst(),
    queryBuilder
      .orderBy('cc.client_name', 'asc')
      .orderBy('cc.module_name', 'asc')
      .limit(pageSize)
      .offset(offset)
      .execute()
  ])

  const total = Number(countRow?.total || 0)

  const items = rows.map(row => ({
    assignmentId: row.assignment_id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPublicId: row.client_public_id,
    moduleId: row.module_id,
    moduleCode: row.module_code,
    moduleName: row.module_name,
    businessLine: row.business_line,
    status: row.status,
    active: row.active,
    sourceSystem: row.source_system,
    sourceReference: row.source_reference,
    assignedAt: row.assigned_at ? String(row.assigned_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null
  }))

  const pagination = buildApiPlatformPaginationMeta({
    page,
    pageSize,
    total,
    count: items.length
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
