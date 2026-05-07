import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { assertEngagementServiceEligible, buildEligibleServicePredicate } from './eligibility'
import { isUniqueConstraintError, toDateString, toIsoDateKey, toIsoTimestamp, toTimestampString, trimRequired } from './shared'

export const ENGAGEMENT_PHASE_KINDS = ['kickoff', 'operation', 'reporting', 'decision', 'custom'] as const
export const ENGAGEMENT_PHASE_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const

export type EngagementPhaseKind = typeof ENGAGEMENT_PHASE_KINDS[number]
export type EngagementPhaseStatus = typeof ENGAGEMENT_PHASE_STATUSES[number]

export interface EngagementPhase {
  phaseId: string
  serviceId: string
  phaseName: string
  phaseKind: EngagementPhaseKind
  phaseOrder: number
  startDate: string
  endDate: string | null
  status: EngagementPhaseStatus
  deliverables: Record<string, unknown> | null
  completedAt: string | null
  completedBy: string | null
}

export interface DeclarePhaseInput {
  serviceId: string
  phaseName: string
  phaseKind: EngagementPhaseKind
  phaseOrder: number
  startDate: Date | string
  endDate?: Date | string | null
  status?: EngagementPhaseStatus
  deliverables?: Record<string, unknown> | null
}

export interface CompletePhaseInput {
  phaseId: string
  completedBy: string
  completedAt?: Date | string
}

interface PhaseRow extends Record<string, unknown> {
  phase_id: string
  service_id: string
  phase_name: string
  phase_kind: EngagementPhaseKind
  phase_order: number
  start_date: Date | string
  end_date: Date | string | null
  status: EngagementPhaseStatus
  deliverables_json: Record<string, unknown> | null
  completed_at: Date | string | null
  completed_by: string | null
}

export class EngagementPhaseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementPhaseValidationError'
  }
}

export class EngagementPhaseConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementPhaseConflictError'
  }
}

export class EngagementPhaseNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementPhaseNotFoundError'
  }
}

const isPhaseKind = (value: string): value is EngagementPhaseKind => {
  return (ENGAGEMENT_PHASE_KINDS as readonly string[]).includes(value)
}

const isPhaseStatus = (value: string): value is EngagementPhaseStatus => {
  return (ENGAGEMENT_PHASE_STATUSES as readonly string[]).includes(value)
}

const normalizePhase = (row: PhaseRow): EngagementPhase => ({
  phaseId: row.phase_id,
  serviceId: row.service_id,
  phaseName: row.phase_name,
  phaseKind: row.phase_kind,
  phaseOrder: row.phase_order,
  startDate: toDateString(row.start_date) ?? '',
  endDate: toDateString(row.end_date),
  status: row.status,
  deliverables: row.deliverables_json ?? null,
  completedAt: toTimestampString(row.completed_at),
  completedBy: row.completed_by ?? null
})

const assertDeclarePhaseInput = (input: DeclarePhaseInput) => {
  const serviceId = trimRequired(input.serviceId, 'serviceId')
  const phaseName = trimRequired(input.phaseName, 'phaseName')
  const status = input.status ?? 'pending'

  if (!isPhaseKind(input.phaseKind)) throw new EngagementPhaseValidationError('phaseKind is not supported.')
  if (!isPhaseStatus(status)) throw new EngagementPhaseValidationError('status is not supported.')
  if (status === 'completed') throw new EngagementPhaseValidationError('declarePhase cannot create completed phases.')

  if (!Number.isInteger(input.phaseOrder) || input.phaseOrder <= 0) {
    throw new EngagementPhaseValidationError('phaseOrder must be a positive integer.')
  }

  const startDate = toIsoDateKey(input.startDate, 'startDate')
  const endDate = input.endDate == null ? null : toIsoDateKey(input.endDate, 'endDate')

  if (endDate && endDate < startDate) {
    throw new EngagementPhaseValidationError('endDate must be on or after startDate.')
  }

  return {
    serviceId,
    phaseName,
    phaseKind: input.phaseKind,
    phaseOrder: input.phaseOrder,
    startDate,
    endDate,
    status,
    deliverables: input.deliverables ?? null
  }
}

const assertCompletePhaseInput = (input: CompletePhaseInput) => {
  const phaseId = trimRequired(input.phaseId, 'phaseId')
  const completedBy = trimRequired(input.completedBy, 'completedBy')

  const completedAt = input.completedAt == null
    ? new Date().toISOString()
    : toIsoTimestamp(input.completedAt, 'completedAt')

  return { phaseId, completedBy, completedAt }
}

const assertPhaseServiceEligible = async (client: PoolClient, phaseId: string): Promise<void> => {
  const result = await client.query<{ service_id: string }>(
    `SELECT service_id
     FROM greenhouse_commercial.engagement_phases
     WHERE phase_id = $1
     LIMIT 1`,
    [phaseId]
  )

  const serviceId = result.rows[0]?.service_id

  if (!serviceId) throw new EngagementPhaseNotFoundError(`Phase ${phaseId} does not exist.`)

  await assertEngagementServiceEligible(client, serviceId)
}

export const declarePhase = async (input: DeclarePhaseInput): Promise<{ phaseId: string }> => {
  const normalized = assertDeclarePhaseInput(input)

  try {
    return await withTransaction(async client => {
      await assertEngagementServiceEligible(client, normalized.serviceId)

      const result = await client.query<{ phase_id: string }>(
        `INSERT INTO greenhouse_commercial.engagement_phases (
           service_id, phase_name, phase_kind, phase_order, start_date, end_date,
           status, deliverables_json
         ) VALUES (
           $1, $2, $3, $4, $5::date, $6::date, $7, $8::jsonb
         )
         RETURNING phase_id`,
        [
          normalized.serviceId,
          normalized.phaseName,
          normalized.phaseKind,
          normalized.phaseOrder,
          normalized.startDate,
          normalized.endDate,
          normalized.status,
          normalized.deliverables == null ? null : JSON.stringify(normalized.deliverables)
        ]
      )

      const phaseId = result.rows[0]?.phase_id

      if (!phaseId) throw new Error('Failed to declare engagement phase.')

      return { phaseId }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EngagementPhaseConflictError(
        `Service ${normalized.serviceId} already has a phase with order ${normalized.phaseOrder}.`
      )
    }

    throw error
  }
}

export const completePhase = async (input: CompletePhaseInput): Promise<EngagementPhase> => {
  const normalized = assertCompletePhaseInput(input)

  return withTransaction(async client => {
    await assertPhaseServiceEligible(client, normalized.phaseId)

    const result = await client.query<PhaseRow>(
      `UPDATE greenhouse_commercial.engagement_phases
       SET status = 'completed',
           completed_at = $2::timestamptz,
           completed_by = $3,
           updated_at = now()
       WHERE phase_id = $1
       RETURNING *`,
      [normalized.phaseId, normalized.completedAt, normalized.completedBy]
    )

    const row = result.rows[0]

    if (!row) throw new EngagementPhaseNotFoundError(`Phase ${normalized.phaseId} does not exist.`)

    return normalizePhase(row)
  })
}

export const listPhasesForService = async (serviceId: string): Promise<EngagementPhase[]> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')

  const rows = await query<PhaseRow>(
    `SELECT p.*
     FROM greenhouse_commercial.engagement_phases p
     JOIN greenhouse_core.services s ON s.service_id = p.service_id
     WHERE p.service_id = $1
       AND ${buildEligibleServicePredicate('s')}
     ORDER BY p.phase_order ASC, p.start_date ASC`,
    [normalizedServiceId]
  )

  return rows.map(normalizePhase)
}
