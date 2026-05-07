import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { assertEngagementServiceEligible, buildEligibleServicePredicate } from './eligibility'
import { isUniqueConstraintError, toDateString, toIsoDateKey, toTimestampString, trimRequired } from './shared'

export const ENGAGEMENT_LINEAGE_RELATIONSHIP_KINDS = [
  'converted_to',
  'spawned_from',
  'replaced_by',
  'renewed_from',
  'adjusted_into'
] as const

export type EngagementLineageRelationshipKind = typeof ENGAGEMENT_LINEAGE_RELATIONSHIP_KINDS[number]

export interface EngagementLineage {
  lineageId: string
  parentServiceId: string
  childServiceId: string
  relationshipKind: EngagementLineageRelationshipKind
  transitionDate: string
  transitionReason: string
  recordedBy: string | null
  recordedAt: string
  depth?: number
}

export interface AddLineageInput {
  parentServiceId: string
  childServiceId: string
  relationshipKind: EngagementLineageRelationshipKind
  transitionDate: Date | string
  transitionReason: string
  recordedBy: string
}

interface LineageRow extends Record<string, unknown> {
  lineage_id: string
  parent_service_id: string
  child_service_id: string
  relationship_kind: EngagementLineageRelationshipKind
  transition_date: Date | string
  transition_reason: string
  recorded_by: string | null
  recorded_at: Date | string
  depth?: number
}

export class EngagementLineageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementLineageValidationError'
  }
}

export class EngagementLineageConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementLineageConflictError'
  }
}

const isRelationshipKind = (value: string): value is EngagementLineageRelationshipKind => {
  return (ENGAGEMENT_LINEAGE_RELATIONSHIP_KINDS as readonly string[]).includes(value)
}

const normalizeLineage = (row: LineageRow): EngagementLineage => ({
  lineageId: row.lineage_id,
  parentServiceId: row.parent_service_id,
  childServiceId: row.child_service_id,
  relationshipKind: row.relationship_kind,
  transitionDate: toDateString(row.transition_date) ?? '',
  transitionReason: row.transition_reason,
  recordedBy: row.recorded_by,
  recordedAt: toTimestampString(row.recorded_at) ?? '',
  depth: row.depth == null ? undefined : Number(row.depth)
})

const assertAddLineageInput = (input: AddLineageInput) => {
  const parentServiceId = trimRequired(input.parentServiceId, 'parentServiceId')
  const childServiceId = trimRequired(input.childServiceId, 'childServiceId')
  const transitionReason = trimRequired(input.transitionReason, 'transitionReason')
  const recordedBy = trimRequired(input.recordedBy, 'recordedBy')

  if (parentServiceId === childServiceId) {
    throw new EngagementLineageValidationError('parentServiceId and childServiceId must be different.')
  }

  if (!isRelationshipKind(input.relationshipKind)) {
    throw new EngagementLineageValidationError('relationshipKind is not supported.')
  }

  if (transitionReason.length < 10) {
    throw new EngagementLineageValidationError('transitionReason must contain at least 10 characters.')
  }

  return {
    parentServiceId,
    childServiceId,
    relationshipKind: input.relationshipKind,
    transitionDate: toIsoDateKey(input.transitionDate, 'transitionDate'),
    transitionReason,
    recordedBy
  }
}

export const addLineage = async (input: AddLineageInput): Promise<{ lineageId: string }> => {
  const normalized = assertAddLineageInput(input)

  try {
    return await withTransaction(async client => {
      await assertEngagementServiceEligible(client, normalized.parentServiceId)
      await assertEngagementServiceEligible(client, normalized.childServiceId)

      const result = await client.query<{ lineage_id: string }>(
        `INSERT INTO greenhouse_commercial.engagement_lineage (
           parent_service_id, child_service_id, relationship_kind,
           transition_date, transition_reason, recorded_by
         ) VALUES (
           $1, $2, $3, $4::date, $5, $6
         )
         RETURNING lineage_id`,
        [
          normalized.parentServiceId,
          normalized.childServiceId,
          normalized.relationshipKind,
          normalized.transitionDate,
          normalized.transitionReason,
          normalized.recordedBy
        ]
      )

      const lineageId = result.rows[0]?.lineage_id

      if (!lineageId) throw new Error('Failed to add engagement lineage.')

      return { lineageId }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EngagementLineageConflictError('This engagement lineage relationship already exists.')
    }

    throw error
  }
}

export const getAncestors = async (serviceId: string): Promise<EngagementLineage[]> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')

  const rows = await query<LineageRow>(
    `WITH RECURSIVE ancestors AS (
       SELECT l.*, 1::int AS depth
       FROM greenhouse_commercial.engagement_lineage l
       JOIN greenhouse_core.services parent_s ON parent_s.service_id = l.parent_service_id
       JOIN greenhouse_core.services child_s ON child_s.service_id = l.child_service_id
       WHERE l.child_service_id = $1
         AND ${buildEligibleServicePredicate('parent_s')}
         AND ${buildEligibleServicePredicate('child_s')}
       UNION ALL
       SELECT parent_l.*, ancestors.depth + 1
       FROM greenhouse_commercial.engagement_lineage parent_l
       JOIN ancestors ON ancestors.parent_service_id = parent_l.child_service_id
       JOIN greenhouse_core.services parent_s ON parent_s.service_id = parent_l.parent_service_id
       JOIN greenhouse_core.services child_s ON child_s.service_id = parent_l.child_service_id
       WHERE ${buildEligibleServicePredicate('parent_s')}
         AND ${buildEligibleServicePredicate('child_s')}
         AND ancestors.depth < 25
     )
     SELECT *
     FROM ancestors
     ORDER BY depth ASC, transition_date DESC`,
    [normalizedServiceId]
  )

  return rows.map(normalizeLineage)
}

export const getDescendants = async (serviceId: string): Promise<EngagementLineage[]> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')

  const rows = await query<LineageRow>(
    `WITH RECURSIVE descendants AS (
       SELECT l.*, 1::int AS depth
       FROM greenhouse_commercial.engagement_lineage l
       JOIN greenhouse_core.services parent_s ON parent_s.service_id = l.parent_service_id
       JOIN greenhouse_core.services child_s ON child_s.service_id = l.child_service_id
       WHERE l.parent_service_id = $1
         AND ${buildEligibleServicePredicate('parent_s')}
         AND ${buildEligibleServicePredicate('child_s')}
       UNION ALL
       SELECT child_l.*, descendants.depth + 1
       FROM greenhouse_commercial.engagement_lineage child_l
       JOIN descendants ON descendants.child_service_id = child_l.parent_service_id
       JOIN greenhouse_core.services parent_s ON parent_s.service_id = child_l.parent_service_id
       JOIN greenhouse_core.services child_s ON child_s.service_id = child_l.child_service_id
       WHERE ${buildEligibleServicePredicate('parent_s')}
         AND ${buildEligibleServicePredicate('child_s')}
         AND descendants.depth < 25
     )
     SELECT *
     FROM descendants
     ORDER BY depth ASC, transition_date DESC`,
    [normalizedServiceId]
  )

  return rows.map(normalizeLineage)
}
