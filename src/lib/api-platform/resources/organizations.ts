import 'server-only'

import { getDb } from '@/lib/db'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { getOrganizationDetail, getOrganizationList } from '@/lib/account-360/organization-store'
import { resolveOrganizationIdentifier } from '@/lib/account-360/resolve-organization-id'

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
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || '25')))
  const search = url.searchParams.get('search')?.trim() || undefined
  const status = url.searchParams.get('status')?.trim() || undefined
  const type = url.searchParams.get('type')?.trim() || undefined

  const accessibleOrganizationIds = await getAccessibleOrganizationIds(context)

  const payload = await getOrganizationList({
    page,
    pageSize,
    search,
    status,
    type
  })

  const items = accessibleOrganizationIds
    ? payload.items.filter(item => accessibleOrganizationIds.includes(item.organizationId))
    : payload.items

  return {
    page,
    pageSize,
    count: items.length,
    items
  }
}

export const getEcosystemOrganizationDetail = async ({
  context,
  identifier
}: {
  context: ApiPlatformRequestContext
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

  return detail
}
