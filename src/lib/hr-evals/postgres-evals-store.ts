import 'server-only'

import { randomUUID } from 'node:crypto'

import type {
  EvalCompetency,
  EvalCycle,
  EvalCycleStatus,
  EvalCycleType,
  EvalAssignment,
  EvalType,
  AssignmentStatus,
  EvalResponse,
  EvalSummary,
  CompetencyCategory,
  CreateEvalCycleInput,
  Rating
} from '@/types/hr-evals'
import { EVAL_CYCLE_STATUSES } from '@/types/hr-evals'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

// ── Row types (snake_case, matching DB columns) ──

type CompetencyRow = {
  competency_id: string
  competency_name: string
  description: string | null
  category: string
  applicable_levels: string[] | null
  active: boolean
  sort_order: number | string
  created_at: string | Date
}

type EvalCycleRow = {
  eval_cycle_id: string
  cycle_name: string
  cycle_type: string
  start_date: string | Date
  end_date: string | Date
  self_eval_deadline: string | Date | null
  peer_eval_deadline: string | Date | null
  manager_deadline: string | Date | null
  status: string
  competency_ids: string[] | null
  min_tenure_days: number | string
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

type AssignmentRow = {
  assignment_id: string
  eval_cycle_id: string
  evaluatee_id: string
  evaluator_id: string
  eval_type: string
  status: string
  submitted_at: string | Date | null
  created_at: string | Date
}

type ResponseRow = {
  response_id: string
  assignment_id: string
  competency_id: string
  rating: number | string
  comments: string | null
  created_at: string | Date
}

type SummaryRow = {
  summary_id: string
  eval_cycle_id: string
  member_id: string
  overall_rating: number | string | null
  self_rating: number | string | null
  peer_rating: number | string | null
  manager_rating: number | string | null
  ico_rpa_avg: number | string | null
  ico_otd_percent: number | string | null
  goal_completion_pct: number | string | null
  strengths: string | null
  development_areas: string | null
  hr_notes: string | null
  finalized_by: string | null
  finalized_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

// ── ID generation ──

const generateId = (prefix: string): string => {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8)

  return `${prefix}-${suffix}`
}

// ── Normalizers (row -> domain) ──

const toDateStr = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return typeof value === 'string' ? value.slice(0, 10) : ''
}

const toNullableDateStr = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return typeof value === 'string' ? value.slice(0, 10) : null
}

const toTimestampStr = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return typeof value === 'string' ? value : ''
}

const toNullableTimestampStr = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return typeof value === 'string' ? value : null
}

const toNum = (value: number | string | null): number => {
  if (value === null || value === undefined) return 0
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toNullableNum = (value: number | string | null): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

// ── Mappers ──

const mapCompetency = (row: CompetencyRow): EvalCompetency => ({
  competencyId: row.competency_id,
  competencyName: row.competency_name,
  description: row.description,
  category: row.category as CompetencyCategory,
  applicableLevels: row.applicable_levels ?? [],
  active: row.active,
  sortOrder: toNum(row.sort_order),
  createdAt: toTimestampStr(row.created_at)
})

const mapCycle = (row: EvalCycleRow): EvalCycle => ({
  evalCycleId: row.eval_cycle_id,
  cycleName: row.cycle_name,
  cycleType: row.cycle_type as EvalCycleType,
  startDate: toDateStr(row.start_date),
  endDate: toDateStr(row.end_date),
  selfEvalDeadline: toNullableDateStr(row.self_eval_deadline),
  peerEvalDeadline: toNullableDateStr(row.peer_eval_deadline),
  managerDeadline: toNullableDateStr(row.manager_deadline),
  status: row.status as EvalCycleStatus,
  competencyIds: row.competency_ids ?? [],
  minTenureDays: toNum(row.min_tenure_days),
  createdBy: row.created_by,
  createdAt: toTimestampStr(row.created_at),
  updatedAt: toTimestampStr(row.updated_at)
})

const mapAssignment = (row: AssignmentRow): EvalAssignment => ({
  assignmentId: row.assignment_id,
  evalCycleId: row.eval_cycle_id,
  evaluateeId: row.evaluatee_id,
  evaluatorId: row.evaluator_id,
  evalType: row.eval_type as EvalType,
  status: row.status as AssignmentStatus,
  submittedAt: toNullableTimestampStr(row.submitted_at),
  createdAt: toTimestampStr(row.created_at)
})

const mapResponse = (row: ResponseRow): EvalResponse => ({
  responseId: row.response_id,
  assignmentId: row.assignment_id,
  competencyId: row.competency_id,
  rating: toNum(row.rating) as Rating,
  comments: row.comments,
  createdAt: toTimestampStr(row.created_at)
})

const mapSummary = (row: SummaryRow): EvalSummary => ({
  summaryId: row.summary_id,
  evalCycleId: row.eval_cycle_id,
  memberId: row.member_id,
  overallRating: toNullableNum(row.overall_rating),
  selfRating: toNullableNum(row.self_rating),
  peerRating: toNullableNum(row.peer_rating),
  managerRating: toNullableNum(row.manager_rating),
  icoRpaAvg: toNullableNum(row.ico_rpa_avg),
  icoOtdPercent: toNullableNum(row.ico_otd_percent),
  goalCompletionPct: toNullableNum(row.goal_completion_pct),
  strengths: row.strengths,
  developmentAreas: row.development_areas,
  hrNotes: row.hr_notes,
  finalizedBy: row.finalized_by,
  finalizedAt: toNullableTimestampStr(row.finalized_at),
  createdAt: toTimestampStr(row.created_at),
  updatedAt: toTimestampStr(row.updated_at)
})

// ── Competencies ──

export async function listCompetencies(activeOnly?: boolean): Promise<EvalCompetency[]> {
  const whereClause = activeOnly ? 'WHERE active = true' : ''

  const rows = await runGreenhousePostgresQuery<CompetencyRow>(
    `
      SELECT
        competency_id, competency_name, description,
        category, applicable_levels, active,
        sort_order, created_at
      FROM greenhouse_hr.eval_competencies
      ${whereClause}
      ORDER BY sort_order ASC, competency_name ASC
    `
  )

  return rows.map(mapCompetency)
}

// ── Cycles ──

export async function listEvalCycles(
  filters?: { status?: string }
): Promise<EvalCycle[]> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (filters?.status) {
    conditions.push(`status = $${paramIndex}`)
    values.push(filters.status)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await runGreenhousePostgresQuery<EvalCycleRow>(
    `
      SELECT
        eval_cycle_id, cycle_name, cycle_type,
        start_date, end_date,
        self_eval_deadline, peer_eval_deadline, manager_deadline,
        status, competency_ids, min_tenure_days,
        created_by, created_at, updated_at
      FROM greenhouse_hr.eval_cycles
      ${whereClause}
      ORDER BY start_date DESC, created_at DESC
    `,
    values
  )

  return rows.map(mapCycle)
}

export async function getEvalCycleById(cycleId: string): Promise<EvalCycle | null> {
  const rows = await runGreenhousePostgresQuery<EvalCycleRow>(
    `
      SELECT
        eval_cycle_id, cycle_name, cycle_type,
        start_date, end_date,
        self_eval_deadline, peer_eval_deadline, manager_deadline,
        status, competency_ids, min_tenure_days,
        created_by, created_at, updated_at
      FROM greenhouse_hr.eval_cycles
      WHERE eval_cycle_id = $1
      LIMIT 1
    `,
    [cycleId]
  )

  return rows.length > 0 ? mapCycle(rows[0]) : null
}

export async function createEvalCycle(
  input: CreateEvalCycleInput & { createdBy: string }
): Promise<EvalCycle> {
  const cycleId = generateId('ec')

  const rows = await runGreenhousePostgresQuery<EvalCycleRow>(
    `
      INSERT INTO greenhouse_hr.eval_cycles (
        eval_cycle_id, cycle_name, cycle_type,
        start_date, end_date,
        self_eval_deadline, peer_eval_deadline, manager_deadline,
        status, competency_ids, min_tenure_days,
        created_by
      )
      VALUES ($1, $2, $3, $4::date, $5::date, $6::date, $7::date, $8::date, 'draft', $9, $10, $11)
      RETURNING
        eval_cycle_id, cycle_name, cycle_type,
        start_date, end_date,
        self_eval_deadline, peer_eval_deadline, manager_deadline,
        status, competency_ids, min_tenure_days,
        created_by, created_at, updated_at
    `,
    [
      cycleId,
      input.cycleName,
      input.cycleType,
      input.startDate,
      input.endDate,
      input.selfEvalDeadline ?? null,
      input.peerEvalDeadline ?? null,
      input.managerDeadline ?? null,
      input.competencyIds ?? [],
      input.minTenureDays ?? 90,
      input.createdBy
    ]
  )

  return mapCycle(rows[0])
}

export async function updateEvalCycle(
  cycleId: string,
  updates: Partial<{
    cycleName: string
    startDate: string
    endDate: string
    selfEvalDeadline: string
    peerEvalDeadline: string
    managerDeadline: string
    status: string
    competencyIds: string[]
    minTenureDays: number
  }>
): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (updates.cycleName !== undefined) {
    setClauses.push(`cycle_name = $${paramIndex}`)
    values.push(updates.cycleName)
    paramIndex++
  }

  if (updates.startDate !== undefined) {
    setClauses.push(`start_date = $${paramIndex}::date`)
    values.push(updates.startDate)
    paramIndex++
  }

  if (updates.endDate !== undefined) {
    setClauses.push(`end_date = $${paramIndex}::date`)
    values.push(updates.endDate)
    paramIndex++
  }

  if (updates.selfEvalDeadline !== undefined) {
    setClauses.push(`self_eval_deadline = $${paramIndex}::date`)
    values.push(updates.selfEvalDeadline)
    paramIndex++
  }

  if (updates.peerEvalDeadline !== undefined) {
    setClauses.push(`peer_eval_deadline = $${paramIndex}::date`)
    values.push(updates.peerEvalDeadline)
    paramIndex++
  }

  if (updates.managerDeadline !== undefined) {
    setClauses.push(`manager_deadline = $${paramIndex}::date`)
    values.push(updates.managerDeadline)
    paramIndex++
  }

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex}`)
    values.push(updates.status)
    paramIndex++
  }

  if (updates.competencyIds !== undefined) {
    setClauses.push(`competency_ids = $${paramIndex}`)
    values.push(updates.competencyIds)
    paramIndex++
  }

  if (updates.minTenureDays !== undefined) {
    setClauses.push(`min_tenure_days = $${paramIndex}`)
    values.push(updates.minTenureDays)
    paramIndex++
  }

  if (setClauses.length === 0) return

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(cycleId)

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_hr.eval_cycles
      SET ${setClauses.join(', ')}
      WHERE eval_cycle_id = $${paramIndex}
    `,
    values
  )
}

/**
 * Advance an eval cycle to its next phase.
 *
 * Lifecycle: draft -> self_eval -> peer_eval -> manager_review -> calibration -> closed
 *
 * Publishes evalCyclePhaseAdvanced on each transition and evalCycleClosed when reaching closed.
 *
 * @returns The new status after advancing.
 * @throws If the cycle is already closed or not found.
 */
export async function advanceCyclePhase(cycleId: string): Promise<string> {
  const cycle = await getEvalCycleById(cycleId)

  if (!cycle) {
    throw new Error(`Eval cycle ${cycleId} not found`)
  }

  const currentIndex = EVAL_CYCLE_STATUSES.indexOf(cycle.status)

  if (currentIndex === -1 || cycle.status === 'closed') {
    throw new Error(`Eval cycle ${cycleId} is already closed or in an invalid state: ${cycle.status}`)
  }

  const nextStatus = EVAL_CYCLE_STATUSES[currentIndex + 1]

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_hr.eval_cycles
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE eval_cycle_id = $2
    `,
    [nextStatus, cycleId]
  )

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.evalCycle,
    aggregateId: cycleId,
    eventType: EVENT_TYPES.evalCyclePhaseAdvanced,
    payload: {
      cycleId,
      cycleName: cycle.cycleName,
      previousStatus: cycle.status,
      newStatus: nextStatus
    }
  })

  if (nextStatus === 'closed') {
    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.evalCycle,
      aggregateId: cycleId,
      eventType: EVENT_TYPES.evalCycleClosed,
      payload: {
        cycleId,
        cycleName: cycle.cycleName
      }
    })
  }

  return nextStatus
}

// ── Assignments ──

export async function listAssignments(
  filters: { cycleId?: string; evaluateeId?: string; evaluatorId?: string; evalType?: string; status?: string }
): Promise<EvalAssignment[]> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (filters.cycleId) {
    conditions.push(`eval_cycle_id = $${paramIndex}`)
    values.push(filters.cycleId)
    paramIndex++
  }

  if (filters.evaluateeId) {
    conditions.push(`evaluatee_id = $${paramIndex}`)
    values.push(filters.evaluateeId)
    paramIndex++
  }

  if (filters.evaluatorId) {
    conditions.push(`evaluator_id = $${paramIndex}`)
    values.push(filters.evaluatorId)
    paramIndex++
  }

  if (filters.evalType) {
    conditions.push(`eval_type = $${paramIndex}`)
    values.push(filters.evalType)
    paramIndex++
  }

  if (filters.status) {
    conditions.push(`status = $${paramIndex}`)
    values.push(filters.status)
    paramIndex++
  }

  const rows = await runGreenhousePostgresQuery<AssignmentRow>(
    `
      SELECT
        assignment_id, eval_cycle_id, evaluatee_id, evaluator_id,
        eval_type, status, submitted_at, created_at
      FROM greenhouse_hr.eval_assignments
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY created_at ASC
    `,
    values
  )

  return rows.map(mapAssignment)
}

export async function createAssignment(input: {
  evalCycleId: string
  evaluateeId: string
  evaluatorId: string
  evalType: string
}): Promise<EvalAssignment> {
  const assignmentId = generateId('ea')

  const rows = await runGreenhousePostgresQuery<AssignmentRow>(
    `
      INSERT INTO greenhouse_hr.eval_assignments (
        assignment_id, eval_cycle_id, evaluatee_id, evaluator_id, eval_type
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        assignment_id, eval_cycle_id, evaluatee_id, evaluator_id,
        eval_type, status, submitted_at, created_at
    `,
    [assignmentId, input.evalCycleId, input.evaluateeId, input.evaluatorId, input.evalType]
  )

  return mapAssignment(rows[0])
}

/**
 * Mark an assignment as submitted.
 * Sets status to 'submitted' and submitted_at to NOW().
 * Publishes evalAssignmentSubmitted event.
 */
export async function submitAssignment(assignmentId: string): Promise<void> {
  const rows = await runGreenhousePostgresQuery<AssignmentRow>(
    `
      UPDATE greenhouse_hr.eval_assignments
      SET status = 'submitted', submitted_at = NOW()
      WHERE assignment_id = $1
      RETURNING
        assignment_id, eval_cycle_id, evaluatee_id, evaluator_id,
        eval_type, status, submitted_at, created_at
    `,
    [assignmentId]
  )

  if (rows.length === 0) {
    throw new Error(`Assignment ${assignmentId} not found`)
  }

  const assignment = rows[0]

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.evalAssignment,
    aggregateId: assignmentId,
    eventType: EVENT_TYPES.evalAssignmentSubmitted,
    payload: {
      assignmentId,
      evalCycleId: assignment.eval_cycle_id,
      evaluateeId: assignment.evaluatee_id,
      evaluatorId: assignment.evaluator_id,
      evalType: assignment.eval_type
    }
  })
}

/**
 * Bulk-create assignments for a cycle.
 * Skips duplicates (same cycle + evaluatee + evaluator + eval_type).
 *
 * @returns The number of assignments created.
 */
export async function bulkCreateAssignments(
  cycleId: string,
  assignments: Array<{ evaluateeId: string; evaluatorId: string; evalType: string }>
): Promise<number> {
  if (assignments.length === 0) return 0

  const valuePlaceholders: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  for (const a of assignments) {
    const id = generateId('ea')

    valuePlaceholders.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`
    )
    values.push(id, cycleId, a.evaluateeId, a.evaluatorId, a.evalType)
    paramIndex += 5
  }

  const rows = await runGreenhousePostgresQuery<{ assignment_id: string }>(
    `
      INSERT INTO greenhouse_hr.eval_assignments (
        assignment_id, eval_cycle_id, evaluatee_id, evaluator_id, eval_type
      )
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT DO NOTHING
      RETURNING assignment_id
    `,
    values
  )

  return rows.length
}

// ── Responses ──

export async function listResponses(assignmentId: string): Promise<EvalResponse[]> {
  const rows = await runGreenhousePostgresQuery<ResponseRow>(
    `
      SELECT
        response_id, assignment_id, competency_id,
        rating, comments, created_at
      FROM greenhouse_hr.eval_responses
      WHERE assignment_id = $1
      ORDER BY created_at ASC
    `,
    [assignmentId]
  )

  return rows.map(mapResponse)
}

/**
 * Upsert a response for a given assignment + competency.
 *
 * Uses a SELECT-first approach since there is no UNIQUE constraint
 * on (assignment_id, competency_id).
 */
export async function upsertResponse(input: {
  assignmentId: string
  competencyId: string
  rating: number
  comments?: string
}): Promise<EvalResponse> {
  const existing = await runGreenhousePostgresQuery<ResponseRow>(
    `
      SELECT response_id
      FROM greenhouse_hr.eval_responses
      WHERE assignment_id = $1 AND competency_id = $2
      LIMIT 1
    `,
    [input.assignmentId, input.competencyId]
  )

  if (existing.length > 0) {
    const rows = await runGreenhousePostgresQuery<ResponseRow>(
      `
        UPDATE greenhouse_hr.eval_responses
        SET rating = $1, comments = $2
        WHERE response_id = $3
        RETURNING
          response_id, assignment_id, competency_id,
          rating, comments, created_at
      `,
      [input.rating, input.comments ?? null, existing[0].response_id]
    )

    return mapResponse(rows[0])
  }

  const responseId = generateId('er')

  const rows = await runGreenhousePostgresQuery<ResponseRow>(
    `
      INSERT INTO greenhouse_hr.eval_responses (
        response_id, assignment_id, competency_id, rating, comments
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        response_id, assignment_id, competency_id,
        rating, comments, created_at
    `,
    [responseId, input.assignmentId, input.competencyId, input.rating, input.comments ?? null]
  )

  return mapResponse(rows[0])
}

// ── Summaries ──

export async function getEvalSummary(
  cycleId: string,
  memberId: string
): Promise<EvalSummary | null> {
  const rows = await runGreenhousePostgresQuery<SummaryRow>(
    `
      SELECT
        summary_id, eval_cycle_id, member_id,
        overall_rating, self_rating, peer_rating, manager_rating,
        ico_rpa_avg, ico_otd_percent, goal_completion_pct,
        strengths, development_areas, hr_notes,
        finalized_by, finalized_at,
        created_at, updated_at
      FROM greenhouse_hr.eval_summaries
      WHERE eval_cycle_id = $1 AND member_id = $2
      LIMIT 1
    `,
    [cycleId, memberId]
  )

  return rows.length > 0 ? mapSummary(rows[0]) : null
}

export async function listEvalSummaries(cycleId?: string, memberId?: string): Promise<EvalSummary[]> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (cycleId) {
    conditions.push(`eval_cycle_id = $${idx++}`)
    values.push(cycleId)
  }

  if (memberId) {
    conditions.push(`member_id = $${idx++}`)
    values.push(memberId)
  }

  const rows = await runGreenhousePostgresQuery<SummaryRow>(
    `
      SELECT
        summary_id, eval_cycle_id, member_id,
        overall_rating, self_rating, peer_rating, manager_rating,
        ico_rpa_avg, ico_otd_percent, goal_completion_pct,
        strengths, development_areas, hr_notes,
        finalized_by, finalized_at,
        created_at, updated_at
      FROM greenhouse_hr.eval_summaries
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY member_id ASC
    `,
    values
  )

  return rows.map(mapSummary)
}

/**
 * Upsert an eval summary for a member in a cycle.
 * Uses the UNIQUE (eval_cycle_id, member_id) constraint for ON CONFLICT.
 */
export async function upsertEvalSummary(input: {
  evalCycleId: string
  memberId: string
  overallRating?: number | null
  selfRating?: number | null
  peerRating?: number | null
  managerRating?: number | null
  icoRpaAvg?: number | null
  icoOtdPercent?: number | null
  goalCompletionPct?: number | null
  strengths?: string | null
  developmentAreas?: string | null
  hrNotes?: string | null
}): Promise<EvalSummary> {
  const summaryId = generateId('es')

  const rows = await runGreenhousePostgresQuery<SummaryRow>(
    `
      INSERT INTO greenhouse_hr.eval_summaries (
        summary_id, eval_cycle_id, member_id,
        overall_rating, self_rating, peer_rating, manager_rating,
        ico_rpa_avg, ico_otd_percent, goal_completion_pct,
        strengths, development_areas, hr_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (eval_cycle_id, member_id) DO UPDATE SET
        overall_rating = COALESCE(EXCLUDED.overall_rating, greenhouse_hr.eval_summaries.overall_rating),
        self_rating = COALESCE(EXCLUDED.self_rating, greenhouse_hr.eval_summaries.self_rating),
        peer_rating = COALESCE(EXCLUDED.peer_rating, greenhouse_hr.eval_summaries.peer_rating),
        manager_rating = COALESCE(EXCLUDED.manager_rating, greenhouse_hr.eval_summaries.manager_rating),
        ico_rpa_avg = COALESCE(EXCLUDED.ico_rpa_avg, greenhouse_hr.eval_summaries.ico_rpa_avg),
        ico_otd_percent = COALESCE(EXCLUDED.ico_otd_percent, greenhouse_hr.eval_summaries.ico_otd_percent),
        goal_completion_pct = COALESCE(EXCLUDED.goal_completion_pct, greenhouse_hr.eval_summaries.goal_completion_pct),
        strengths = COALESCE(EXCLUDED.strengths, greenhouse_hr.eval_summaries.strengths),
        development_areas = COALESCE(EXCLUDED.development_areas, greenhouse_hr.eval_summaries.development_areas),
        hr_notes = COALESCE(EXCLUDED.hr_notes, greenhouse_hr.eval_summaries.hr_notes),
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        summary_id, eval_cycle_id, member_id,
        overall_rating, self_rating, peer_rating, manager_rating,
        ico_rpa_avg, ico_otd_percent, goal_completion_pct,
        strengths, development_areas, hr_notes,
        finalized_by, finalized_at,
        created_at, updated_at
    `,
    [
      summaryId,
      input.evalCycleId,
      input.memberId,
      input.overallRating ?? null,
      input.selfRating ?? null,
      input.peerRating ?? null,
      input.managerRating ?? null,
      input.icoRpaAvg ?? null,
      input.icoOtdPercent ?? null,
      input.goalCompletionPct ?? null,
      input.strengths ?? null,
      input.developmentAreas ?? null,
      input.hrNotes ?? null
    ]
  )

  return mapSummary(rows[0])
}

/**
 * Finalize an eval summary.
 * Sets finalized_by and finalized_at, then publishes evalSummaryFinalized.
 */
export async function finalizeEvalSummary(
  summaryId: string,
  finalizedBy: string
): Promise<void> {
  const rows = await runGreenhousePostgresQuery<SummaryRow>(
    `
      UPDATE greenhouse_hr.eval_summaries
      SET finalized_by = $1, finalized_at = NOW(), updated_at = CURRENT_TIMESTAMP
      WHERE summary_id = $2
      RETURNING
        summary_id, eval_cycle_id, member_id,
        overall_rating, self_rating, peer_rating, manager_rating,
        ico_rpa_avg, ico_otd_percent, goal_completion_pct,
        strengths, development_areas, hr_notes,
        finalized_by, finalized_at,
        created_at, updated_at
    `,
    [finalizedBy, summaryId]
  )

  if (rows.length === 0) {
    throw new Error(`Eval summary ${summaryId} not found`)
  }

  const summary = rows[0]

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.evalSummary,
    aggregateId: summaryId,
    eventType: EVENT_TYPES.evalSummaryFinalized,
    payload: {
      summaryId,
      evalCycleId: summary.eval_cycle_id,
      memberId: summary.member_id,
      overallRating: toNullableNum(summary.overall_rating),
      finalizedBy
    }
  })
}
