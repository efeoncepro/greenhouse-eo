import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'

import { getDb, query, withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import type {
  CreateSisterPlatformBindingInput,
  SisterPlatformBindingRecord,
  SisterPlatformBindingResolution,
  SisterPlatformBindingRole,
  SisterPlatformBindingStatus,
  SisterPlatformExternalScopeType,
  SisterPlatformGreenhouseScopeType,
  UpdateSisterPlatformBindingInput
} from './types'

type AccessTenant = Pick<TenantContext, 'organizationId' | 'clientId' | 'spaceId' | 'userId'>

type SisterPlatformBindingRow = {
  binding_id: string
  public_id: string
  sister_platform_key: string
  external_scope_type: SisterPlatformExternalScopeType
  external_scope_id: string
  external_scope_parent_id: string | null
  external_display_name: string | null
  greenhouse_scope_type: SisterPlatformGreenhouseScopeType
  organization_id: string | null
  organization_name: string | null
  client_id: string | null
  client_name: string | null
  space_id: string | null
  space_name: string | null
  binding_role: SisterPlatformBindingRole
  binding_status: SisterPlatformBindingStatus
  notes: string | null
  metadata_json: Record<string, unknown> | null
  last_verified_at: string | Date | null
  created_by_user_id: string | null
  activated_by_user_id: string | null
  suspended_by_user_id: string | null
  deprecated_by_user_id: string | null
  activated_at: string | Date | null
  suspended_at: string | Date | null
  deprecated_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

type ScopeSnapshot = {
  greenhouseScopeType: SisterPlatformGreenhouseScopeType
  organizationId: string | null
  organizationName: string | null
  clientId: string | null
  clientName: string | null
  spaceId: string | null
  spaceName: string | null
}

type TransactionClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

export class SisterPlatformBindingError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'SisterPlatformBindingError'
    this.statusCode = statusCode
  }
}

const BINDING_SELECT = sql<SisterPlatformBindingRow>`
  SELECT
    b.sister_platform_binding_id AS binding_id,
    b.public_id,
    b.sister_platform_key,
    b.external_scope_type,
    b.external_scope_id,
    b.external_scope_parent_id,
    b.external_display_name,
    b.greenhouse_scope_type,
    b.organization_id,
    org.organization_name,
    b.client_id,
    c.client_name,
    b.space_id,
    sp.space_name,
    b.binding_role,
    b.binding_status,
    b.notes,
    b.metadata_json,
    b.last_verified_at,
    b.created_by_user_id,
    b.activated_by_user_id,
    b.suspended_by_user_id,
    b.deprecated_by_user_id,
    b.activated_at,
    b.suspended_at,
    b.deprecated_at,
    b.created_at,
    b.updated_at
  FROM greenhouse_core.sister_platform_bindings AS b
  LEFT JOIN greenhouse_core.organizations AS org
    ON org.organization_id = b.organization_id
  LEFT JOIN greenhouse_core.clients AS c
    ON c.client_id = b.client_id
  LEFT JOIN greenhouse_core.spaces AS sp
    ON sp.space_id = b.space_id
`

const toIsoString = (value: string | Date | null) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const sanitizeOptionalText = (value: unknown) => {
  if (typeof value !== 'string') return null

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : null
}

const sanitizeRequiredText = (value: unknown, fieldName: string) => {
  const normalized = sanitizeOptionalText(value)

  if (!normalized) {
    throw new SisterPlatformBindingError(`${fieldName} es requerido.`)
  }

  return normalized
}

const sanitizeJson = (value: Record<string, unknown> | null | undefined) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value
}

const mapBindingRow = (row: SisterPlatformBindingRow): SisterPlatformBindingRecord => ({
  bindingId: row.binding_id,
  publicId: row.public_id,
  sisterPlatformKey: row.sister_platform_key,
  externalScopeType: row.external_scope_type,
  externalScopeId: row.external_scope_id,
  externalScopeParentId: row.external_scope_parent_id,
  externalDisplayName: row.external_display_name,
  greenhouseScopeType: row.greenhouse_scope_type,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  clientId: row.client_id,
  clientName: row.client_name,
  spaceId: row.space_id,
  spaceName: row.space_name,
  bindingRole: row.binding_role,
  bindingStatus: row.binding_status,
  notes: row.notes,
  metadata: row.metadata_json ?? {},
  lastVerifiedAt: toIsoString(row.last_verified_at),
  createdByUserId: row.created_by_user_id,
  activatedByUserId: row.activated_by_user_id,
  suspendedByUserId: row.suspended_by_user_id,
  deprecatedByUserId: row.deprecated_by_user_id,
  activatedAt: toIsoString(row.activated_at),
  suspendedAt: toIsoString(row.suspended_at),
  deprecatedAt: toIsoString(row.deprecated_at),
  createdAt: toIsoString(row.created_at) || new Date(0).toISOString(),
  updatedAt: toIsoString(row.updated_at) || new Date(0).toISOString()
})

const buildAccessConditions = (tenant?: AccessTenant | null) => {
  const conditions = [sql<boolean>`TRUE`]

  if (!tenant) {
    return conditions
  }

  if (tenant.spaceId) {
    conditions.push(sql<boolean>`b.space_id = ${tenant.spaceId}`)
  } else if (tenant.clientId) {
    conditions.push(sql<boolean>`b.client_id = ${tenant.clientId}`)
  } else if (tenant.organizationId) {
    conditions.push(sql<boolean>`b.organization_id = ${tenant.organizationId}`)
  }

  return conditions
}

const assertTenantScopeAccess = (scope: ScopeSnapshot, tenant?: AccessTenant | null) => {
  if (!tenant) return

  if (tenant.spaceId && scope.spaceId !== tenant.spaceId) {
    throw new SisterPlatformBindingError('El binding queda fuera del scope del tenant actual.', 403)
  }

  if (!tenant.spaceId && tenant.clientId && scope.clientId !== tenant.clientId) {
    throw new SisterPlatformBindingError('El binding queda fuera del cliente autorizado.', 403)
  }

  if (!tenant.spaceId && !tenant.clientId && tenant.organizationId && scope.organizationId !== tenant.organizationId) {
    throw new SisterPlatformBindingError('El binding queda fuera de la organización autorizada.', 403)
  }
}

const resolveScopeSnapshot = async (input: {
  greenhouseScopeType: SisterPlatformGreenhouseScopeType
  organizationId?: string | null
  clientId?: string | null
  spaceId?: string | null
}): Promise<ScopeSnapshot> => {
  const db = await getDb()

  if (input.greenhouseScopeType === 'internal') {
    if (input.organizationId || input.clientId || input.spaceId) {
      throw new SisterPlatformBindingError('Los bindings internal no aceptan organizationId, clientId ni spaceId.')
    }

    return {
      greenhouseScopeType: 'internal',
      organizationId: null,
      organizationName: null,
      clientId: null,
      clientName: null,
      spaceId: null,
      spaceName: null
    }
  }

  if (input.greenhouseScopeType === 'space') {
    const spaceId = sanitizeRequiredText(input.spaceId, 'spaceId')

    const result = await sql<ScopeSnapshot>`
      SELECT
        'space'::text AS "greenhouseScopeType",
        sp.organization_id AS "organizationId",
        org.organization_name AS "organizationName",
        sp.client_id AS "clientId",
        c.client_name AS "clientName",
        sp.space_id AS "spaceId",
        sp.space_name AS "spaceName"
      FROM greenhouse_core.spaces AS sp
      INNER JOIN greenhouse_core.clients AS c
        ON c.client_id = sp.client_id
      INNER JOIN greenhouse_core.organizations AS org
        ON org.organization_id = sp.organization_id
      WHERE sp.space_id = ${spaceId}
      LIMIT 1
    `.execute(db)

    const row = result.rows[0]

    if (!row) {
      throw new SisterPlatformBindingError(`spaceId '${spaceId}' no existe.`, 404)
    }

    if (input.clientId && row.clientId !== input.clientId) {
      throw new SisterPlatformBindingError('El space no pertenece al clientId informado.')
    }

    if (input.organizationId && row.organizationId !== input.organizationId) {
      throw new SisterPlatformBindingError('El space no pertenece al organizationId informado.')
    }

    return row
  }

  if (input.greenhouseScopeType === 'client') {
    const clientId = sanitizeRequiredText(input.clientId, 'clientId')

    const result = await sql<ScopeSnapshot>`
      SELECT
        'client'::text AS "greenhouseScopeType",
        c.organization_id AS "organizationId",
        org.organization_name AS "organizationName",
        c.client_id AS "clientId",
        c.client_name AS "clientName",
        NULL::text AS "spaceId",
        NULL::text AS "spaceName"
      FROM greenhouse_core.clients AS c
      INNER JOIN greenhouse_core.organizations AS org
        ON org.organization_id = c.organization_id
      WHERE c.client_id = ${clientId}
      LIMIT 1
    `.execute(db)

    const row = result.rows[0]

    if (!row) {
      throw new SisterPlatformBindingError(`clientId '${clientId}' no existe.`, 404)
    }

    if (input.organizationId && row.organizationId !== input.organizationId) {
      throw new SisterPlatformBindingError('El cliente no pertenece al organizationId informado.')
    }

    return row
  }

  const organizationId = sanitizeRequiredText(input.organizationId, 'organizationId')

  const result = await sql<ScopeSnapshot>`
    SELECT
      'organization'::text AS "greenhouseScopeType",
      org.organization_id AS "organizationId",
      org.organization_name AS "organizationName",
      NULL::text AS "clientId",
      NULL::text AS "clientName",
      NULL::text AS "spaceId",
      NULL::text AS "spaceName"
    FROM greenhouse_core.organizations AS org
    WHERE org.organization_id = ${organizationId}
    LIMIT 1
  `.execute(db)

  const row = result.rows[0]

  if (!row) {
    throw new SisterPlatformBindingError(`organizationId '${organizationId}' no existe.`, 404)
  }

  return row
}

const loadBindingById = async ({
  bindingId,
  tenant
}: {
  bindingId: string
  tenant?: AccessTenant | null
}): Promise<SisterPlatformBindingRecord | null> => {
  const db = await getDb()
  const conditions = buildAccessConditions(tenant)

  conditions.push(sql<boolean>`b.sister_platform_binding_id = ${bindingId}`)

  const result = await sql<SisterPlatformBindingRow>`
    ${BINDING_SELECT}
    WHERE ${sql.join(conditions, sql` AND `)}
    LIMIT 1
  `.execute(db)

  const row = result.rows[0]

  return row ? mapBindingRow(row) : null
}

const nextPublicId = async (client?: TransactionClient) => {
  const text = `
    SELECT 'EO-SPB-' || LPAD(nextval('greenhouse_core.seq_sister_platform_binding_public_id')::text, 4, '0') AS public_id
  `

  if (client) {
    const result = await client.query(text)

    return String(result.rows[0]?.public_id || '')
  }

  const rows = await query<{ public_id: string }>(text)

  return String(rows[0]?.public_id || '')
}

const eventTypeForStatus = (status: SisterPlatformBindingStatus) => {
  switch (status) {
    case 'active':
      return EVENT_TYPES.sisterPlatformBindingActivated
    case 'suspended':
      return EVENT_TYPES.sisterPlatformBindingSuspended
    case 'deprecated':
      return EVENT_TYPES.sisterPlatformBindingDeprecated
    default:
      return EVENT_TYPES.sisterPlatformBindingUpdated
  }
}

export const listSisterPlatformBindings = async ({
  tenant,
  sisterPlatformKey,
  bindingStatus,
  limit = 50
}: {
  tenant?: AccessTenant | null
  sisterPlatformKey?: string | null
  bindingStatus?: SisterPlatformBindingStatus | null
  limit?: number
} = {}) => {
  const db = await getDb()
  const conditions = buildAccessConditions(tenant)

  if (sisterPlatformKey) {
    conditions.push(sql<boolean>`b.sister_platform_key = ${sanitizeRequiredText(sisterPlatformKey, 'sisterPlatformKey')}`)
  }

  if (bindingStatus) {
    conditions.push(sql<boolean>`b.binding_status = ${bindingStatus}`)
  }

  const result = await sql<SisterPlatformBindingRow>`
    ${BINDING_SELECT}
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY
      CASE b.binding_status
        WHEN 'active' THEN 0
        WHEN 'draft' THEN 1
        WHEN 'suspended' THEN 2
        ELSE 3
      END,
      b.sister_platform_key ASC,
      COALESCE(sp.space_name, c.client_name, org.organization_name) ASC,
      b.created_at DESC
    LIMIT ${Math.max(1, Math.min(limit, 200))}
  `.execute(db)

  return result.rows.map(mapBindingRow)
}

export const getSisterPlatformBinding = async ({
  bindingId,
  tenant
}: {
  bindingId: string
  tenant?: AccessTenant | null
}) => {
  return loadBindingById({ bindingId, tenant })
}

export const resolveSisterPlatformBinding = async ({
  sisterPlatformKey,
  externalScopeType,
  externalScopeId,
  tenant
}: {
  sisterPlatformKey: string
  externalScopeType: SisterPlatformExternalScopeType
  externalScopeId: string
  tenant?: AccessTenant | null
}): Promise<SisterPlatformBindingResolution | null> => {
  const db = await getDb()
  const conditions = buildAccessConditions(tenant)

  conditions.push(sql<boolean>`b.sister_platform_key = ${sanitizeRequiredText(sisterPlatformKey, 'sisterPlatformKey').toLowerCase()}`)
  conditions.push(sql<boolean>`b.external_scope_type = ${externalScopeType}`)
  conditions.push(sql<boolean>`b.external_scope_id = ${sanitizeRequiredText(externalScopeId, 'externalScopeId')}`)
  conditions.push(sql<boolean>`b.binding_status = 'active'`)

  const result = await sql<SisterPlatformBindingRow>`
    ${BINDING_SELECT}
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY
      CASE b.binding_role WHEN 'primary' THEN 0 WHEN 'secondary' THEN 1 ELSE 2 END,
      b.updated_at DESC
    LIMIT 1
  `.execute(db)

  const row = result.rows[0]

  if (!row) {
    return null
  }

  return {
    sisterPlatformKey: row.sister_platform_key,
    externalScopeType: row.external_scope_type,
    externalScopeId: row.external_scope_id,
    bindingStatus: row.binding_status,
    greenhouseScopeType: row.greenhouse_scope_type,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    clientId: row.client_id,
    clientName: row.client_name,
    spaceId: row.space_id,
    spaceName: row.space_name,
    bindingId: row.binding_id,
    publicId: row.public_id
  }
}

export const createSisterPlatformBinding = async ({
  input,
  tenant
}: {
  input: CreateSisterPlatformBindingInput
  tenant?: AccessTenant | null
}) => {
  const normalizedPlatformKey = sanitizeRequiredText(input.sisterPlatformKey, 'sisterPlatformKey').toLowerCase()
  const externalScopeId = sanitizeRequiredText(input.externalScopeId, 'externalScopeId')
  const scope = await resolveScopeSnapshot(input)

  assertTenantScopeAccess(scope, tenant)

  const bindingId = `spb-${randomUUID()}`
  const bindingRole = input.bindingRole ?? 'primary'
  const bindingStatus = input.bindingStatus ?? 'draft'
  const externalDisplayName = sanitizeOptionalText(input.externalDisplayName)
  const externalScopeParentId = sanitizeOptionalText(input.externalScopeParentId)
  const notes = sanitizeOptionalText(input.notes)
  const metadata = sanitizeJson(input.metadata)
  const actorUserId = tenant?.userId ?? 'system'
  const lastVerifiedAt = sanitizeOptionalText(input.lastVerifiedAt)

  await withTransaction(async client => {
    const publicId = await nextPublicId(client as TransactionClient)

    await client.query(
      `
        INSERT INTO greenhouse_core.sister_platform_bindings (
          sister_platform_binding_id,
          public_id,
          sister_platform_key,
          external_scope_type,
          external_scope_id,
          external_scope_parent_id,
          external_display_name,
          greenhouse_scope_type,
          organization_id,
          client_id,
          space_id,
          binding_role,
          binding_status,
          notes,
          metadata_json,
          last_verified_at,
          created_by_user_id,
          activated_by_user_id,
          suspended_by_user_id,
          deprecated_by_user_id,
          activated_at,
          suspended_at,
          deprecated_at,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16,
          $17,
          CASE WHEN $13 = 'active' THEN $17 ELSE NULL END,
          CASE WHEN $13 = 'suspended' THEN $17 ELSE NULL END,
          CASE WHEN $13 = 'deprecated' THEN $17 ELSE NULL END,
          CASE WHEN $13 = 'active' THEN CURRENT_TIMESTAMP ELSE NULL END,
          CASE WHEN $13 = 'suspended' THEN CURRENT_TIMESTAMP ELSE NULL END,
          CASE WHEN $13 = 'deprecated' THEN CURRENT_TIMESTAMP ELSE NULL END,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `,
      [
        bindingId,
        publicId,
        normalizedPlatformKey,
        input.externalScopeType,
        externalScopeId,
        externalScopeParentId,
        externalDisplayName,
        scope.greenhouseScopeType,
        scope.organizationId,
        scope.clientId,
        scope.spaceId,
        bindingRole,
        bindingStatus,
        notes,
        JSON.stringify(metadata),
        lastVerifiedAt,
        actorUserId
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.sisterPlatformBinding,
        aggregateId: bindingId,
        eventType: EVENT_TYPES.sisterPlatformBindingCreated,
        payload: {
          bindingId,
          publicId,
          sisterPlatformKey: normalizedPlatformKey,
          externalScopeType: input.externalScopeType,
          externalScopeId,
          greenhouseScopeType: scope.greenhouseScopeType,
          organizationId: scope.organizationId,
          clientId: scope.clientId,
          spaceId: scope.spaceId,
          bindingStatus,
          bindingRole
        }
      },
      client
    )

    if (bindingStatus !== 'draft') {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.sisterPlatformBinding,
          aggregateId: bindingId,
          eventType: eventTypeForStatus(bindingStatus),
          payload: {
            bindingId,
            publicId,
            bindingStatus,
            changedByUserId: actorUserId
          }
        },
        client
      )
    }
  })

  const created = await loadBindingById({ bindingId, tenant })

  if (!created) {
    throw new SisterPlatformBindingError('No fue posible leer el binding recién creado.', 500)
  }

  return created
}

export const updateSisterPlatformBinding = async ({
  bindingId,
  input,
  tenant
}: {
  bindingId: string
  input: UpdateSisterPlatformBindingInput
  tenant?: AccessTenant | null
}) => {
  const existing = await loadBindingById({ bindingId, tenant })

  if (!existing) {
    throw new SisterPlatformBindingError(`Binding '${bindingId}' no encontrado.`, 404)
  }

  const mergedScopeType = input.greenhouseScopeType ?? existing.greenhouseScopeType

  const scope = await resolveScopeSnapshot({
    greenhouseScopeType: mergedScopeType,
    organizationId: input.organizationId ?? existing.organizationId,
    clientId: input.clientId ?? existing.clientId,
    spaceId: input.spaceId ?? existing.spaceId
  })

  assertTenantScopeAccess(scope, tenant)

  const sisterPlatformKey = sanitizeRequiredText(input.sisterPlatformKey ?? existing.sisterPlatformKey, 'sisterPlatformKey').toLowerCase()
  const externalScopeId = sanitizeRequiredText(input.externalScopeId ?? existing.externalScopeId, 'externalScopeId')

  const externalScopeParentId = input.externalScopeParentId === undefined
    ? existing.externalScopeParentId
    : sanitizeOptionalText(input.externalScopeParentId)

  const externalDisplayName = input.externalDisplayName === undefined
    ? existing.externalDisplayName
    : sanitizeOptionalText(input.externalDisplayName)

  const notes = input.notes === undefined ? existing.notes : sanitizeOptionalText(input.notes)
  const metadata = input.metadata === undefined ? existing.metadata : sanitizeJson(input.metadata)
  const bindingRole = input.bindingRole ?? existing.bindingRole
  const nextStatus = input.bindingStatus ?? existing.bindingStatus
  const lastVerifiedAt = input.lastVerifiedAt === undefined ? existing.lastVerifiedAt : sanitizeOptionalText(input.lastVerifiedAt)
  const actorUserId = tenant?.userId ?? 'system'
  const statusChanged = nextStatus !== existing.bindingStatus

  await withTransaction(async client => {
    await client.query(
      `
        UPDATE greenhouse_core.sister_platform_bindings
        SET
          sister_platform_key = $2,
          external_scope_type = $3,
          external_scope_id = $4,
          external_scope_parent_id = $5,
          external_display_name = $6,
          greenhouse_scope_type = $7,
          organization_id = $8,
          client_id = $9,
          space_id = $10,
          binding_role = $11,
          binding_status = $12,
          notes = $13,
          metadata_json = $14::jsonb,
          last_verified_at = $15,
          activated_by_user_id = CASE WHEN $12 = 'active' THEN $16 ELSE activated_by_user_id END,
          suspended_by_user_id = CASE WHEN $12 = 'suspended' THEN $16 ELSE suspended_by_user_id END,
          deprecated_by_user_id = CASE WHEN $12 = 'deprecated' THEN $16 ELSE deprecated_by_user_id END,
          activated_at = CASE
            WHEN $12 = 'active' AND activated_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE activated_at
          END,
          suspended_at = CASE
            WHEN $12 = 'suspended' AND suspended_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE suspended_at
          END,
          deprecated_at = CASE
            WHEN $12 = 'deprecated' AND deprecated_at IS NULL THEN CURRENT_TIMESTAMP
            ELSE deprecated_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE sister_platform_binding_id = $1
      `,
      [
        bindingId,
        sisterPlatformKey,
        input.externalScopeType ?? existing.externalScopeType,
        externalScopeId,
        externalScopeParentId,
        externalDisplayName,
        scope.greenhouseScopeType,
        scope.organizationId,
        scope.clientId,
        scope.spaceId,
        bindingRole,
        nextStatus,
        notes,
        JSON.stringify(metadata),
        lastVerifiedAt,
        actorUserId
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.sisterPlatformBinding,
        aggregateId: bindingId,
        eventType: EVENT_TYPES.sisterPlatformBindingUpdated,
        payload: {
          bindingId,
          publicId: existing.publicId,
          sisterPlatformKey,
          greenhouseScopeType: scope.greenhouseScopeType,
          organizationId: scope.organizationId,
          clientId: scope.clientId,
          spaceId: scope.spaceId,
          bindingRole,
          bindingStatus: nextStatus,
          changedByUserId: actorUserId
        }
      },
      client
    )

    if (statusChanged) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.sisterPlatformBinding,
          aggregateId: bindingId,
          eventType: eventTypeForStatus(nextStatus),
          payload: {
            bindingId,
            publicId: existing.publicId,
            previousStatus: existing.bindingStatus,
            bindingStatus: nextStatus,
            changedByUserId: actorUserId
          }
        },
        client
      )
    }
  })

  const updated = await loadBindingById({ bindingId, tenant })

  if (!updated) {
    throw new SisterPlatformBindingError('No fue posible leer el binding actualizado.', 500)
  }

  return updated
}
