import 'server-only'

import type { PoolClient } from 'pg'

import {
  generatePersonLegalEntityRelationshipId,
  nextPublicId
} from '@/lib/account-360/id-generation'
import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { query, withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  PERSON_LEGAL_ENTITY_RELATIONSHIP_TYPES,
  PERSON_LEGAL_ENTITY_SOURCE_OF_TRUTH,
  type PersonLegalEntityRelationship,
  type PersonLegalEntityRelationshipType
} from '@/types/person-legal-entity'

type QueryableClient = Pick<PoolClient, 'query'>

type RelationshipRow = {
  relationship_id: string
  public_id: string
  profile_id: string
  legal_entity_organization_id: string
  legal_entity_name: string | null
  space_id: string | null
  relationship_type: string
  status: string
  source_of_truth: string
  source_record_type: string | null
  source_record_id: string | null
  role_label: string | null
  notes: string | null
  effective_from: string | Date
  effective_to: string | Date | null
  metadata_json: Record<string, unknown> | null
  created_by_user_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type MemberContextRow = {
  identity_profile_id: string | null
  role_title: string | null
  active: boolean
}

type ExistingRelationshipRow = {
  relationship_id: string
  role_label: string | null
  status: string
  space_id: string | null
}

export type OperatingEntityEmployeeRelationshipSyncResult =
  | { action: 'created' | 'reactivated' | 'updated' | 'deactivated'; relationshipId: string }
  | { action: 'noop' | 'skipped'; relationshipId: null }

const EMPLOYEE_RELATIONSHIP_TYPE: PersonLegalEntityRelationshipType = 'employee'

const normalizeString = (value: string | null | undefined) => value?.trim() || null

const toDateString = (value: string | Date | null) => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const toTimestampString = (value: string | Date | null) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const mapRelationshipRow = (row: RelationshipRow): PersonLegalEntityRelationship => ({
  relationshipId: row.relationship_id,
  publicId: row.public_id,
  profileId: row.profile_id,
  legalEntityOrganizationId: row.legal_entity_organization_id,
  legalEntityName: normalizeString(row.legal_entity_name),
  spaceId: normalizeString(row.space_id),
  relationshipType: row.relationship_type as PersonLegalEntityRelationshipType,
  status: row.status as PersonLegalEntityRelationship['status'],
  sourceOfTruth: row.source_of_truth,
  sourceRecordType: normalizeString(row.source_record_type),
  sourceRecordId: normalizeString(row.source_record_id),
  roleLabel: normalizeString(row.role_label),
  notes: normalizeString(row.notes),
  effectiveFrom: toDateString(row.effective_from) || new Date().toISOString().slice(0, 10),
  effectiveTo: toDateString(row.effective_to),
  metadata: row.metadata_json ?? {},
  createdByUserId: normalizeString(row.created_by_user_id),
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const buildRelationshipQuery = ({
  profileId,
  legalEntityOrganizationId,
  relationshipTypes,
  includeInactive = false,
  activeOnly = false,
  spaceId
}: {
  profileId?: string
  legalEntityOrganizationId?: string
  relationshipTypes?: readonly PersonLegalEntityRelationshipType[]
  includeInactive?: boolean
  activeOnly?: boolean
  spaceId?: string | null
}) => {
  const values: unknown[] = []
  const clauses: string[] = []

  if (profileId) {
    values.push(profileId)
    clauses.push(`pler.profile_id = $${values.length}`)
  }

  if (legalEntityOrganizationId) {
    values.push(legalEntityOrganizationId)
    clauses.push(`pler.legal_entity_organization_id = $${values.length}`)
  }

  if (spaceId) {
    values.push(spaceId)
    clauses.push(`pler.space_id = $${values.length}`)
  }

  if (relationshipTypes?.length) {
    values.push(relationshipTypes)
    clauses.push(`pler.relationship_type = ANY($${values.length}::text[])`)
  }

  if (!includeInactive || activeOnly) {
    clauses.push(`pler.status = 'active'`)
  }

  if (activeOnly) {
    clauses.push(`pler.effective_to IS NULL`)
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join('\n       AND ')}` : ''

  return {
    sql: `
      SELECT
        pler.relationship_id,
        pler.public_id,
        pler.profile_id,
        pler.legal_entity_organization_id,
        o.organization_name AS legal_entity_name,
        pler.space_id,
        pler.relationship_type,
        pler.status,
        pler.source_of_truth,
        pler.source_record_type,
        pler.source_record_id,
        pler.role_label,
        pler.notes,
        pler.effective_from,
        pler.effective_to,
        pler.metadata_json,
        pler.created_by_user_id,
        pler.created_at,
        pler.updated_at
      FROM greenhouse_core.person_legal_entity_relationships pler
      INNER JOIN greenhouse_core.organizations o
        ON o.organization_id = pler.legal_entity_organization_id
      ${whereClause}
      ORDER BY pler.relationship_type ASC, pler.effective_from DESC, pler.updated_at DESC
    `,
    values
  }
}

export const listPersonLegalEntityRelationshipsByProfile = async (params: {
  profileId: string
  spaceId?: string | null
  relationshipTypes?: readonly PersonLegalEntityRelationshipType[]
  includeInactive?: boolean
}) => {
  const statement = buildRelationshipQuery({
    profileId: params.profileId,
    spaceId: params.spaceId,
    relationshipTypes: params.relationshipTypes,
    includeInactive: params.includeInactive
  })

  const rows = await query<RelationshipRow>(statement.sql, statement.values)

  return rows.map(mapRelationshipRow)
}

export const listPersonLegalEntityRelationshipsByLegalEntity = async (params: {
  legalEntityOrganizationId: string
  spaceId?: string | null
  relationshipTypes?: readonly PersonLegalEntityRelationshipType[]
  includeInactive?: boolean
}) => {
  const statement = buildRelationshipQuery({
    legalEntityOrganizationId: params.legalEntityOrganizationId,
    spaceId: params.spaceId,
    relationshipTypes: params.relationshipTypes,
    includeInactive: params.includeInactive
  })

  const rows = await query<RelationshipRow>(statement.sql, statement.values)

  return rows.map(mapRelationshipRow)
}

export const resolveActivePersonLegalEntityRelationships = async (params: {
  profileId?: string
  legalEntityOrganizationId?: string
  relationshipTypes?: readonly PersonLegalEntityRelationshipType[]
  spaceId?: string | null
}) => {
  const statement = buildRelationshipQuery({
    profileId: params.profileId,
    legalEntityOrganizationId: params.legalEntityOrganizationId,
    relationshipTypes: params.relationshipTypes,
    activeOnly: true,
    spaceId: params.spaceId
  })

  const rows = await query<RelationshipRow>(statement.sql, statement.values)

  return rows.map(mapRelationshipRow)
}

const getOrganizationDefaultSpaceId = async (
  organizationId: string,
  client?: QueryableClient
): Promise<string | null> => {
  const sql = `
    SELECT space_id
    FROM greenhouse_core.spaces
    WHERE organization_id = $1
      AND active = TRUE
    ORDER BY created_at ASC, space_id ASC
    LIMIT 1
  `

  const rows = client
    ? await client.query<{ space_id: string }>(sql, [organizationId]).then(result => result.rows)
    : await query<{ space_id: string }>(sql, [organizationId])

  return normalizeString(rows[0]?.space_id)
}

const publishRelationshipEvent = async (
  params: {
    relationshipId: string
    profileId: string
    legalEntityOrganizationId: string
    spaceId: string | null
    eventType: string
  },
  client: QueryableClient
) => publishOutboxEvent(
  {
    aggregateType: AGGREGATE_TYPES.personLegalEntityRelationship,
    aggregateId: params.relationshipId,
    eventType: params.eventType,
    payload: {
      relationshipId: params.relationshipId,
      profileId: params.profileId,
      legalEntityOrganizationId: params.legalEntityOrganizationId,
      spaceId: params.spaceId,
      relationshipType: EMPLOYEE_RELATIONSHIP_TYPE,
      sourceOfTruth: PERSON_LEGAL_ENTITY_SOURCE_OF_TRUTH.operatingEntityMemberRuntime
    }
  },
  client
)

export const syncOperatingEntityEmployeeLegalRelationshipForMember = async (
  memberId: string
): Promise<OperatingEntityEmployeeRelationshipSyncResult> => {
  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    return { action: 'skipped', relationshipId: null }
  }

  const [member] = await query<MemberContextRow>(
    `SELECT identity_profile_id, role_title, active
     FROM greenhouse_core.members
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  )

  const profileId = normalizeString(member?.identity_profile_id)

  if (!profileId) {
    return { action: 'skipped', relationshipId: null }
  }

  return withTransaction(async (client) => {
    const legalEntitySpaceId = await getOrganizationDefaultSpaceId(operatingEntity.organizationId, client)

    const result = await client.query<ExistingRelationshipRow>(
      `SELECT relationship_id, role_label, status, space_id
       FROM greenhouse_core.person_legal_entity_relationships
       WHERE profile_id = $1
         AND legal_entity_organization_id = $2
         AND relationship_type = $3
       ORDER BY
         CASE WHEN status = 'active' AND effective_to IS NULL THEN 0 ELSE 1 END,
         updated_at DESC NULLS LAST,
         created_at DESC NULLS LAST,
         relationship_id ASC
       LIMIT 1
       FOR UPDATE`,
      [profileId, operatingEntity.organizationId, EMPLOYEE_RELATIONSHIP_TYPE]
    )

    const existing = result.rows[0]

    if (!member.active) {
      if (!existing || existing.status !== 'active') {
        return { action: 'noop', relationshipId: null }
      }

      await client.query(
        `UPDATE greenhouse_core.person_legal_entity_relationships
         SET status = 'ended',
             effective_to = CURRENT_DATE,
             updated_at = CURRENT_TIMESTAMP
         WHERE relationship_id = $1`,
        [existing.relationship_id]
      )

      await publishRelationshipEvent({
        relationshipId: existing.relationship_id,
        profileId,
        legalEntityOrganizationId: operatingEntity.organizationId,
        spaceId: legalEntitySpaceId,
        eventType: EVENT_TYPES.personLegalEntityRelationshipDeactivated
      }, client)

      return { action: 'deactivated', relationshipId: existing.relationship_id }
    }

    const desiredRoleLabel = normalizeString(member.role_title)

    if (!existing) {
      const relationshipId = generatePersonLegalEntityRelationshipId()
      const publicId = await nextPublicId('EO-PLR')

      await client.query(
        `INSERT INTO greenhouse_core.person_legal_entity_relationships (
           relationship_id,
           public_id,
           profile_id,
           legal_entity_organization_id,
           space_id,
           relationship_type,
           status,
           source_of_truth,
           source_record_type,
           source_record_id,
           role_label,
           effective_from,
           metadata_json,
           created_at,
           updated_at
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, 'active', $7, 'member', $8, $9, CURRENT_DATE,
           $10::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         )`,
        [
          relationshipId,
          publicId,
          profileId,
          operatingEntity.organizationId,
          legalEntitySpaceId,
          EMPLOYEE_RELATIONSHIP_TYPE,
          PERSON_LEGAL_ENTITY_SOURCE_OF_TRUTH.operatingEntityMemberRuntime,
          memberId,
          desiredRoleLabel,
          JSON.stringify({
            schemaVersion: 1,
            synchronizedFrom: 'member.created_or_updated'
          })
        ]
      )

      await publishRelationshipEvent({
        relationshipId,
        profileId,
        legalEntityOrganizationId: operatingEntity.organizationId,
        spaceId: legalEntitySpaceId,
        eventType: EVENT_TYPES.personLegalEntityRelationshipCreated
      }, client)

      return { action: 'created', relationshipId }
    }

    if (existing.status !== 'active') {
      await client.query(
        `UPDATE greenhouse_core.person_legal_entity_relationships
         SET status = 'active',
             effective_to = NULL,
             source_of_truth = $2,
             source_record_type = 'member',
             source_record_id = $3,
             role_label = $4,
             space_id = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE relationship_id = $1`,
        [
          existing.relationship_id,
          PERSON_LEGAL_ENTITY_SOURCE_OF_TRUTH.operatingEntityMemberRuntime,
          memberId,
          desiredRoleLabel,
          legalEntitySpaceId
        ]
      )

      await publishRelationshipEvent({
        relationshipId: existing.relationship_id,
        profileId,
        legalEntityOrganizationId: operatingEntity.organizationId,
        spaceId: legalEntitySpaceId,
        eventType: EVENT_TYPES.personLegalEntityRelationshipUpdated
      }, client)

      return { action: 'reactivated', relationshipId: existing.relationship_id }
    }

    const roleChanged = normalizeString(existing.role_label) !== desiredRoleLabel
    const spaceChanged = normalizeString(existing.space_id) !== legalEntitySpaceId

    if (!roleChanged && !spaceChanged) {
      return { action: 'noop', relationshipId: null }
    }

    await client.query(
      `UPDATE greenhouse_core.person_legal_entity_relationships
       SET role_label = $2,
           space_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE relationship_id = $1`,
      [existing.relationship_id, desiredRoleLabel, legalEntitySpaceId]
    )

    await publishRelationshipEvent({
      relationshipId: existing.relationship_id,
      profileId,
      legalEntityOrganizationId: operatingEntity.organizationId,
      spaceId: legalEntitySpaceId,
      eventType: EVENT_TYPES.personLegalEntityRelationshipUpdated
    }, client)

    return { action: 'updated', relationshipId: existing.relationship_id }
  })
}

export const isSupportedPersonLegalEntityRelationshipType = (
  value: string | null | undefined
): value is PersonLegalEntityRelationshipType =>
  PERSON_LEGAL_ENTITY_RELATIONSHIP_TYPES.includes(
    (value || '') as PersonLegalEntityRelationshipType
  )
