import 'server-only'

import { getDb } from '@/lib/db'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'

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

  if (context.binding.greenhouseScopeType === 'organization' && context.binding.organizationId) {
    queryBuilder = queryBuilder.where('cc.client_id', 'in', expressionBuilder =>
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
  }

  if (search) {
    queryBuilder = queryBuilder.where(expressionBuilder =>
      expressionBuilder.or([
        expressionBuilder('cc.module_code', 'ilike', `%${search}%`),
        expressionBuilder('cc.module_name', 'ilike', `%${search}%`),
        expressionBuilder('cc.client_name', 'ilike', `%${search}%`)
      ])
    )
  }

  const rows = await queryBuilder
    .orderBy('cc.client_name', 'asc')
    .orderBy('cc.module_name', 'asc')
    .execute()

  return {
    count: rows.length,
    items: rows.map(row => ({
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
  }
}
