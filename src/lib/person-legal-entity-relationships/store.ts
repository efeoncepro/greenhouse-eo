import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { HrCoreValidationError, assertDateString, normalizeNullableString } from '@/lib/hr-core/shared'

import type {
  CreateContractorRelationshipInput,
  EndRelationshipInput,
  PersonLegalEntityRelationship,
  PersonLegalEntityRelationshipStatus,
  PersonLegalEntityRelationshipType
} from './types'

type RelationshipRow = {
  relationship_id: string
  public_id: string
  profile_id: string
  legal_entity_organization_id: string
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
  metadata_json: unknown
  created_by_user_id: string | null
  created_at: string | Date
  updated_at: string | Date
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const toTimestampString = (value: string | Date): string =>
  typeof value === 'string' ? value : value.toISOString()

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

export const mapPersonLegalEntityRelationship = (row: RelationshipRow): PersonLegalEntityRelationship => ({
  relationshipId: row.relationship_id,
  publicId: row.public_id,
  profileId: row.profile_id,
  legalEntityOrganizationId: row.legal_entity_organization_id,
  spaceId: row.space_id,
  relationshipType: row.relationship_type as PersonLegalEntityRelationshipType,
  status: row.status as PersonLegalEntityRelationshipStatus,
  sourceOfTruth: row.source_of_truth,
  sourceRecordType: row.source_record_type,
  sourceRecordId: row.source_record_id,
  roleLabel: row.role_label,
  notes: row.notes,
  effectiveFrom: toDateString(row.effective_from) ?? '',
  effectiveTo: toDateString(row.effective_to),
  metadata: toRecord(row.metadata_json),
  createdByUserId: row.created_by_user_id,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const publishRelationshipEvent = async (
  client: PoolClient,
  relationship: PersonLegalEntityRelationship,
  eventType: string,
  payload: Record<string, unknown> = {}
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.personLegalEntityRelationship,
      aggregateId: relationship.relationshipId,
      eventType,
      payload: {
        schemaVersion: 1,
        relationshipId: relationship.relationshipId,
        publicId: relationship.publicId,
        profileId: relationship.profileId,
        legalEntityOrganizationId: relationship.legalEntityOrganizationId,
        relationshipType: relationship.relationshipType,
        status: relationship.status,
        effectiveFrom: relationship.effectiveFrom,
        effectiveTo: relationship.effectiveTo,
        ...payload
      }
    },
    client
  )
}

export const listPersonLegalEntityRelationshipsByProfile = async (
  profileId: string,
  client?: PoolClient
): Promise<PersonLegalEntityRelationship[]> => {
  const runner = client
    ? (text: string, values: unknown[]) => client.query<RelationshipRow>(text, values).then(result => result.rows)
    : (text: string, values: unknown[]) => query<RelationshipRow>(text, values)

  const rows = await runner(
    `
      SELECT *
      FROM greenhouse_core.person_legal_entity_relationships
      WHERE profile_id = $1
      ORDER BY effective_from DESC, created_at DESC
    `,
    [profileId]
  )

  return rows.map(mapPersonLegalEntityRelationship)
}

export const endPersonLegalEntityRelationship = async (
  client: PoolClient,
  input: EndRelationshipInput
): Promise<PersonLegalEntityRelationship> => {
  const effectiveTo = assertDateString(input.effectiveTo, 'effectiveTo')

  const result = await client.query<RelationshipRow>(
    `
      UPDATE greenhouse_core.person_legal_entity_relationships
      SET
        status = 'ended',
        effective_to = $2::date,
        notes = COALESCE($3, notes),
        metadata_json = metadata_json || $4::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE relationship_id = $1
        AND status = 'active'
        AND effective_to IS NULL
      RETURNING *
    `,
    [
      input.relationshipId,
      effectiveTo,
      normalizeNullableString(input.notes),
      JSON.stringify({
        ...(input.metadataPatch ?? {}),
        endedByUserId: input.actorUserId,
        endedAt: new Date().toISOString()
      })
    ]
  )

  const row = result.rows[0]

  if (!row) {
    throw new HrCoreValidationError('Active person legal entity relationship not found or already closed.', 409, {
      relationshipId: input.relationshipId
    })
  }

  const relationship = mapPersonLegalEntityRelationship(row)

  await publishRelationshipEvent(client, relationship, EVENT_TYPES.personLegalEntityRelationshipDeactivated, {
    actorUserId: input.actorUserId,
    reason: input.notes ?? null
  })

  return relationship
}

export const createContractorLegalEntityRelationship = async (
  client: PoolClient,
  input: CreateContractorRelationshipInput
): Promise<PersonLegalEntityRelationship> => {
  const effectiveFrom = assertDateString(input.effectiveFrom, 'effectiveFrom')

  const metadata = {
    ...(input.metadata ?? {}),
    relationshipSubtype: input.subtype,
    createdByCommand: 'employee_to_contractor_transition'
  }

  const result = await client.query<RelationshipRow>(
    `
      INSERT INTO greenhouse_core.person_legal_entity_relationships (
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
        notes,
        effective_from,
        metadata_json,
        created_by_user_id
      )
      VALUES (
        $1,
        'EO-PLR-' || LPAD(nextval('greenhouse_core.seq_person_legal_entity_relationship_public_id')::text, 4, '0'),
        $2,
        $3,
        $4,
        'contractor',
        'active',
        $5,
        $6,
        $7,
        $8,
        $9,
        $10::date,
        $11::jsonb,
        $12
      )
      RETURNING *
    `,
    [
      `pler-${randomUUID()}`,
      input.profileId,
      input.legalEntityOrganizationId,
      input.spaceId ?? null,
      input.sourceOfTruth,
      normalizeNullableString(input.sourceRecordType),
      normalizeNullableString(input.sourceRecordId),
      normalizeNullableString(input.roleLabel),
      normalizeNullableString(input.notes),
      effectiveFrom,
      JSON.stringify(metadata),
      input.actorUserId
    ]
  )

  const relationship = mapPersonLegalEntityRelationship(result.rows[0])

  await publishRelationshipEvent(client, relationship, EVENT_TYPES.personLegalEntityRelationshipCreated, {
    actorUserId: input.actorUserId,
    relationshipSubtype: input.subtype
  })

  return relationship
}
