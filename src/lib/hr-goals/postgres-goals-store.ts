import 'server-only'

import { randomUUID } from 'node:crypto'

import type {
  GoalCycle,
  Goal,
  GoalKeyResult,
  GoalProgress,
  GoalWithDetails,
  GoalStatus
} from '@/types/hr-goals'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

// ── Row types (snake_case, matching DB columns) ──

type GoalCycleRow = {
  cycle_id: string
  cycle_name: string
  cycle_type: string
  start_date: string | Date
  end_date: string | Date
  status: string
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

type GoalRow = {
  goal_id: string
  cycle_id: string
  owner_type: string
  owner_member_id: string | null
  owner_department_id: string | null
  title: string
  description: string | null
  progress_percent: number | string
  status: string
  parent_goal_id: string | null
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

type GoalRowWithCycleStatus = GoalRow & {
  cycle_status: string | null
}

type GoalKeyResultRow = {
  kr_id: string
  goal_id: string
  title: string
  target_value: number | string | null
  current_value: number | string
  unit: string | null
  sort_order: number | string
  created_at: string | Date
  updated_at: string | Date
}

type GoalProgressRow = {
  progress_id: string
  goal_id: string
  recorded_by: string
  recorded_at: string | Date
  progress_percent: number | string
  notes: string | null
}

// ── Extended return types for API route compatibility ──

/**
 * Goal + cycle_status (joined), with both camelCase and snake_case aliases
 * for key_results to support existing API route consumers.
 */
export type GoalWithDetailsExtended = GoalWithDetails & {
  cycle_status: string | null
  key_results: GoalKeyResult[]
  goal_id: string
  owner_type: string
  owner_member_id: string | null
  owner_department_id: string | null
  progress_percent: number
  parent_goal_id: string | null
}

/**
 * GoalCycle with a `name` alias for `cycleName` to support existing route consumers.
 */
export type GoalCycleExtended = GoalCycle & {
  name: string
}

/**
 * Goal with snake_case aliases for API route consumers.
 */
export type GoalExtended = Goal & {
  goal_id: string
  owner_type: string
  owner_member_id: string | null
  owner_department_id: string | null
  progress_percent: number
  parent_goal_id: string | null
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

const toTimestampStr = (value: string | Date | null): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return typeof value === 'string' ? value : ''
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

const mapGoalCycle = (row: GoalCycleRow): GoalCycleExtended => ({
  cycleId: row.cycle_id,
  cycleName: row.cycle_name,
  cycleType: row.cycle_type as GoalCycle['cycleType'],
  startDate: toDateStr(row.start_date),
  endDate: toDateStr(row.end_date),
  status: row.status as GoalCycle['status'],
  createdBy: row.created_by,
  createdAt: toTimestampStr(row.created_at),
  updatedAt: toTimestampStr(row.updated_at),

  // snake_case alias for API route consumers
  name: row.cycle_name
})

const mapGoal = (row: GoalRow): GoalExtended => ({
  goalId: row.goal_id,
  cycleId: row.cycle_id,
  ownerType: row.owner_type as Goal['ownerType'],
  ownerMemberId: row.owner_member_id || null,
  ownerDepartmentId: row.owner_department_id || null,
  title: row.title,
  description: row.description || null,
  progressPercent: toNum(row.progress_percent),
  status: row.status as GoalStatus,
  parentGoalId: row.parent_goal_id || null,
  createdBy: row.created_by,
  createdAt: toTimestampStr(row.created_at),
  updatedAt: toTimestampStr(row.updated_at),

  // snake_case aliases for API route consumers
  goal_id: row.goal_id,
  owner_type: row.owner_type,
  owner_member_id: row.owner_member_id || null,
  owner_department_id: row.owner_department_id || null,
  progress_percent: toNum(row.progress_percent),
  parent_goal_id: row.parent_goal_id || null
})

const mapKeyResult = (row: GoalKeyResultRow): GoalKeyResult => ({
  krId: row.kr_id,
  goalId: row.goal_id,
  title: row.title,
  targetValue: toNullableNum(row.target_value),
  currentValue: toNum(row.current_value),
  unit: (row.unit as GoalKeyResult['unit']) || null,
  sortOrder: toNum(row.sort_order),
  createdAt: toTimestampStr(row.created_at),
  updatedAt: toTimestampStr(row.updated_at)
})

const mapProgress = (row: GoalProgressRow): GoalProgress & { progress_entry_id: string } => ({
  progressId: row.progress_id,
  goalId: row.goal_id,
  recordedBy: row.recorded_by,
  recordedAt: toTimestampStr(row.recorded_at),
  progressPercent: toNum(row.progress_percent),
  notes: row.notes || null,

  // snake_case alias for API route consumers
  progress_entry_id: row.progress_id
})

// ── Cycles ──

export const listGoalCycles = async (
  filters?: { status?: string | null; year?: number | null }
): Promise<GoalCycleExtended[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (filters?.status) {
    conditions.push(`status = $${paramIndex}`)
    values.push(filters.status)
    paramIndex++
  }

  if (filters?.year) {
    conditions.push(`EXTRACT(YEAR FROM start_date) = $${paramIndex}`)
    values.push(filters.year)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await runGreenhousePostgresQuery<GoalCycleRow>(
    `
      SELECT
        cycle_id, cycle_name, cycle_type,
        start_date, end_date, status,
        created_by, created_at, updated_at
      FROM greenhouse_hr.goal_cycles
      ${whereClause}
      ORDER BY start_date DESC, created_at DESC
    `,
    values
  )

  return rows.map(mapGoalCycle)
}

export const getGoalCycleById = async (cycleId: string): Promise<GoalCycleExtended | null> => {
  const rows = await runGreenhousePostgresQuery<GoalCycleRow>(
    `
      SELECT
        cycle_id, cycle_name, cycle_type,
        start_date, end_date, status,
        created_by, created_at, updated_at
      FROM greenhouse_hr.goal_cycles
      WHERE cycle_id = $1
      LIMIT 1
    `,
    [cycleId]
  )

  return rows.length > 0 ? mapGoalCycle(rows[0]) : null
}

/**
 * Create a goal cycle. Accepts a raw Record body from API routes.
 */
export const createGoalCycle = async (
  input: Record<string, unknown>
): Promise<GoalCycleExtended> => {
  const cycleId = generateId('gc')
  const cycleName = (input.cycleName ?? input.cycle_name) as string
  const cycleType = (input.cycleType ?? input.cycle_type ?? 'quarterly') as string
  const startDate = (input.startDate ?? input.start_date) as string
  const endDate = (input.endDate ?? input.end_date) as string
  const status = ((input.status as string) || 'draft')
  const createdBy = ((input.createdBy ?? input.created_by) as string) || 'system'

  const rows = await runGreenhousePostgresQuery<GoalCycleRow>(
    `
      INSERT INTO greenhouse_hr.goal_cycles (
        cycle_id, cycle_name, cycle_type,
        start_date, end_date, status, created_by
      )
      VALUES ($1, $2, $3, $4::date, $5::date, $6, $7)
      RETURNING
        cycle_id, cycle_name, cycle_type,
        start_date, end_date, status,
        created_by, created_at, updated_at
    `,
    [cycleId, cycleName, cycleType, startDate, endDate, status, createdBy]
  )

  const cycle = mapGoalCycle(rows[0])

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.goalCycle,
    aggregateId: cycleId,
    eventType: EVENT_TYPES.goalCycleActivated,
    payload: { cycleId, cycleName, cycleType }
  })

  return cycle
}

/**
 * Update a goal cycle. Returns the updated cycle.
 */
export const updateGoalCycle = async (
  cycleId: string,
  updates: Partial<{ cycleName: string; startDate: string; endDate: string; status: string }>
): Promise<GoalCycleExtended> => {
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

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex}`)
    values.push(updates.status)
    paramIndex++
  }

  if (setClauses.length === 0) {
    const current = await getGoalCycleById(cycleId)

    return current!
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(cycleId)

  const rows = await runGreenhousePostgresQuery<GoalCycleRow>(
    `
      UPDATE greenhouse_hr.goal_cycles
      SET ${setClauses.join(', ')}
      WHERE cycle_id = $${paramIndex}
      RETURNING
        cycle_id, cycle_name, cycle_type,
        start_date, end_date, status,
        created_by, created_at, updated_at
    `,
    values
  )

  const cycle = mapGoalCycle(rows[0])

  if (updates.status === 'active') {
    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.goalCycle,
      aggregateId: cycleId,
      eventType: EVENT_TYPES.goalCycleActivated,
      payload: { cycleId }
    })
  }

  if (updates.status === 'closed') {
    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.goalCycle,
      aggregateId: cycleId,
      eventType: EVENT_TYPES.goalCycleClosed,
      payload: { cycleId }
    })
  }

  return cycle
}

export const getActiveCycle = async (): Promise<GoalCycleExtended | null> => {
  const rows = await runGreenhousePostgresQuery<GoalCycleRow>(
    `
      SELECT
        cycle_id, cycle_name, cycle_type,
        start_date, end_date, status,
        created_by, created_at, updated_at
      FROM greenhouse_hr.goal_cycles
      WHERE status = 'active'
      ORDER BY start_date DESC
      LIMIT 1
    `
  )

  return rows.length > 0 ? mapGoalCycle(rows[0]) : null
}

// ── Goals ──

export const listGoals = async (
  filters?: {
    cycleId?: string | null
    ownerMemberId?: string | null
    ownerType?: string | null
    ownerId?: string | null
    status?: string | null
  }
): Promise<GoalExtended[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (filters?.cycleId) {
    conditions.push(`cycle_id = $${paramIndex}`)
    values.push(filters.cycleId)
    paramIndex++
  }

  if (filters?.ownerMemberId) {
    conditions.push(`owner_member_id = $${paramIndex}`)
    values.push(filters.ownerMemberId)
    paramIndex++
  } else if (filters?.ownerId) {
    // Generic owner filter — could be member_id or department_id
    conditions.push(`(owner_member_id = $${paramIndex} OR owner_department_id = $${paramIndex})`)
    values.push(filters.ownerId)
    paramIndex++
  }

  if (filters?.ownerType) {
    conditions.push(`owner_type = $${paramIndex}`)
    values.push(filters.ownerType)
    paramIndex++
  }

  if (filters?.status) {
    conditions.push(`status = $${paramIndex}`)
    values.push(filters.status)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await runGreenhousePostgresQuery<GoalRow>(
    `
      SELECT
        goal_id, cycle_id, owner_type,
        owner_member_id, owner_department_id,
        title, description, progress_percent, status,
        parent_goal_id, created_by, created_at, updated_at
      FROM greenhouse_hr.goals
      ${whereClause}
      ORDER BY created_at DESC
    `,
    values
  )

  return rows.map(mapGoal)
}

export const getGoalById = async (goalId: string): Promise<GoalWithDetailsExtended | null> => {
  const goalRows = await runGreenhousePostgresQuery<GoalRowWithCycleStatus>(
    `
      SELECT
        g.goal_id, g.cycle_id, g.owner_type,
        g.owner_member_id, g.owner_department_id,
        g.title, g.description, g.progress_percent, g.status,
        g.parent_goal_id, g.created_by, g.created_at, g.updated_at,
        c.status AS cycle_status
      FROM greenhouse_hr.goals AS g
      LEFT JOIN greenhouse_hr.goal_cycles AS c ON c.cycle_id = g.cycle_id
      WHERE g.goal_id = $1
      LIMIT 1
    `,
    [goalId]
  )

  if (goalRows.length === 0) return null

  const goalBase = mapGoal(goalRows[0])
  const cycleStatus = goalRows[0].cycle_status || null

  const krRows = await runGreenhousePostgresQuery<GoalKeyResultRow>(
    `
      SELECT
        kr_id, goal_id, title,
        target_value, current_value, unit,
        sort_order, created_at, updated_at
      FROM greenhouse_hr.goal_key_results
      WHERE goal_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `,
    [goalId]
  )

  const progressRows = await runGreenhousePostgresQuery<GoalProgressRow>(
    `
      SELECT
        progress_id, goal_id, recorded_by,
        recorded_at, progress_percent, notes
      FROM greenhouse_hr.goal_progress
      WHERE goal_id = $1
      ORDER BY recorded_at DESC
    `,
    [goalId]
  )

  const keyResults = krRows.map(mapKeyResult)

  return {
    ...goalBase,
    cycle_status: cycleStatus,
    keyResults,
    key_results: keyResults,
    progress: progressRows.map(mapProgress)
  }
}

/**
 * Create a goal. Accepts a raw Record body from API routes.
 */
export const createGoal = async (
  input: Record<string, unknown>
): Promise<GoalExtended> => {
  const goalId = generateId('goal')
  const cycleId = (input.cycleId ?? input.cycle_id) as string
  const ownerType = (input.ownerType ?? input.owner_type ?? 'individual') as string
  const ownerMemberId = ((input.ownerMemberId ?? input.owner_member_id) as string) || null
  const ownerDepartmentId = ((input.ownerDepartmentId ?? input.owner_department_id) as string) || null
  const title = input.title as string
  const description = ((input.description as string) || null)
  const parentGoalId = ((input.parentGoalId ?? input.parent_goal_id) as string) || null
  const createdBy = ((input.createdBy ?? input.created_by) as string) || 'system'

  const rows = await runGreenhousePostgresQuery<GoalRow>(
    `
      INSERT INTO greenhouse_hr.goals (
        goal_id, cycle_id, owner_type,
        owner_member_id, owner_department_id,
        title, description, status,
        parent_goal_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'on_track', $8, $9)
      RETURNING
        goal_id, cycle_id, owner_type,
        owner_member_id, owner_department_id,
        title, description, progress_percent, status,
        parent_goal_id, created_by, created_at, updated_at
    `,
    [
      goalId,
      cycleId,
      ownerType,
      ownerMemberId,
      ownerDepartmentId,
      title,
      description,
      parentGoalId,
      createdBy
    ]
  )

  return mapGoal(rows[0])
}

/**
 * Update a goal. Accepts both camelCase and snake_case keys for compatibility
 * with API route consumers that forward raw request bodies.
 * Returns the updated goal.
 */
export const updateGoal = async (
  goalId: string,
  updates: Record<string, unknown>
): Promise<GoalExtended> => {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  const title = updates.title as string | undefined

  if (title !== undefined) {
    setClauses.push(`title = $${paramIndex}`)
    values.push(title)
    paramIndex++
  }

  const description = updates.description as string | undefined

  if (description !== undefined) {
    setClauses.push(`description = $${paramIndex}`)
    values.push(description)
    paramIndex++
  }

  const status = updates.status as string | undefined

  if (status !== undefined) {
    setClauses.push(`status = $${paramIndex}`)
    values.push(status)
    paramIndex++
  }

  // Accept both camelCase and snake_case
  const progressPercent = (updates.progressPercent ?? updates.progress_percent) as number | undefined

  if (progressPercent !== undefined) {
    setClauses.push(`progress_percent = $${paramIndex}`)
    values.push(progressPercent)
    paramIndex++
  }

  if (setClauses.length === 0) {
    const rows = await runGreenhousePostgresQuery<GoalRow>(
      `
        SELECT
          goal_id, cycle_id, owner_type,
          owner_member_id, owner_department_id,
          title, description, progress_percent, status,
          parent_goal_id, created_by, created_at, updated_at
        FROM greenhouse_hr.goals
        WHERE goal_id = $1
        LIMIT 1
      `,
      [goalId]
    )

    return mapGoal(rows[0])
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(goalId)

  const rows = await runGreenhousePostgresQuery<GoalRow>(
    `
      UPDATE greenhouse_hr.goals
      SET ${setClauses.join(', ')}
      WHERE goal_id = $${paramIndex}
      RETURNING
        goal_id, cycle_id, owner_type,
        owner_member_id, owner_department_id,
        title, description, progress_percent, status,
        parent_goal_id, created_by, created_at, updated_at
    `,
    values
  )

  const goal = mapGoal(rows[0])

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.goal,
    aggregateId: goalId,
    eventType: EVENT_TYPES.goalUpdated,
    payload: { goalId, updates }
  })

  return goal
}

export const deleteGoal = async (goalId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_hr.goal_progress WHERE goal_id = $1`,
    [goalId]
  )

  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_hr.goal_key_results WHERE goal_id = $1`,
    [goalId]
  )

  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_hr.goals WHERE goal_id = $1`,
    [goalId]
  )
}

export const getMyGoals = async (
  memberId: string,
  cycleId?: string | null
): Promise<GoalWithDetails[]> => {
  const conditions = ['g.owner_member_id = $1', "g.owner_type = 'individual'"]
  const values: unknown[] = [memberId]

  if (cycleId) {
    conditions.push('g.cycle_id = $2')
    values.push(cycleId)
  }

  const goalRows = await runGreenhousePostgresQuery<GoalRow>(
    `
      SELECT
        g.goal_id, g.cycle_id, g.owner_type,
        g.owner_member_id, g.owner_department_id,
        g.title, g.description, g.progress_percent, g.status,
        g.parent_goal_id, g.created_by, g.created_at, g.updated_at
      FROM greenhouse_hr.goals AS g
      WHERE ${conditions.join(' AND ')}
      ORDER BY g.created_at DESC
    `,
    values
  )

  if (goalRows.length === 0) return []

  const goalIds = goalRows.map(r => r.goal_id)

  const krRows = await runGreenhousePostgresQuery<GoalKeyResultRow>(
    `
      SELECT
        kr_id, goal_id, title,
        target_value, current_value, unit,
        sort_order, created_at, updated_at
      FROM greenhouse_hr.goal_key_results
      WHERE goal_id = ANY($1::text[])
      ORDER BY sort_order ASC, created_at ASC
    `,
    [goalIds]
  )

  const progressRows = await runGreenhousePostgresQuery<GoalProgressRow>(
    `
      SELECT
        progress_id, goal_id, recorded_by,
        recorded_at, progress_percent, notes
      FROM greenhouse_hr.goal_progress
      WHERE goal_id = ANY($1::text[])
      ORDER BY recorded_at DESC
    `,
    [goalIds]
  )

  const krsByGoal = new Map<string, GoalKeyResult[]>()

  for (const kr of krRows.map(mapKeyResult)) {
    const list = krsByGoal.get(kr.goalId) || []

    list.push(kr)
    krsByGoal.set(kr.goalId, list)
  }

  const progressByGoal = new Map<string, GoalProgress[]>()

  for (const p of progressRows.map(mapProgress)) {
    const list = progressByGoal.get(p.goalId) || []

    list.push(p)
    progressByGoal.set(p.goalId, list)
  }

  return goalRows.map(row => {
    const goal = mapGoal(row)

    return {
      ...goal,
      keyResults: krsByGoal.get(goal.goalId) || [],
      progress: progressByGoal.get(goal.goalId) || []
    }
  })
}

export const getDepartmentGoals = async (
  departmentId: string,
  cycleId?: string | null
): Promise<GoalExtended[]> => {
  const conditions = ['owner_department_id = $1', "owner_type = 'department'"]
  const values: unknown[] = [departmentId]

  if (cycleId) {
    conditions.push('cycle_id = $2')
    values.push(cycleId)
  }

  const rows = await runGreenhousePostgresQuery<GoalRow>(
    `
      SELECT
        goal_id, cycle_id, owner_type,
        owner_member_id, owner_department_id,
        title, description, progress_percent, status,
        parent_goal_id, created_by, created_at, updated_at
      FROM greenhouse_hr.goals
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `,
    values
  )

  return rows.map(mapGoal)
}

export const getCompanyGoals = async (cycleId?: string | null): Promise<GoalExtended[]> => {
  const conditions = ["owner_type = 'company'"]
  const values: unknown[] = []

  if (cycleId) {
    conditions.push('cycle_id = $1')
    values.push(cycleId)
  }

  const rows = await runGreenhousePostgresQuery<GoalRow>(
    `
      SELECT
        goal_id, cycle_id, owner_type,
        owner_member_id, owner_department_id,
        title, description, progress_percent, status,
        parent_goal_id, created_by, created_at, updated_at
      FROM greenhouse_hr.goals
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `,
    values
  )

  return rows.map(mapGoal)
}

// ── Key Results ──

/**
 * Create a key result for a goal.
 * Signature: createKeyResult(goalId, body) to match API route callers.
 */
export const createKeyResult = async (
  goalId: string,
  input: Record<string, unknown>
): Promise<GoalKeyResult> => {
  const krId = generateId('kr')

  const rows = await runGreenhousePostgresQuery<GoalKeyResultRow>(
    `
      INSERT INTO greenhouse_hr.goal_key_results (
        kr_id, goal_id, title,
        target_value, current_value, unit, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        kr_id, goal_id, title,
        target_value, current_value, unit,
        sort_order, created_at, updated_at
    `,
    [
      krId,
      goalId,
      input.title as string,
      (input.targetValue ?? input.target_value) ?? null,
      0,
      (input.unit as string) || null,
      (input.sortOrder ?? input.sort_order) ?? 0
    ]
  )

  return mapKeyResult(rows[0])
}

/**
 * Update a key result.
 * Signature: updateKeyResult(goalId, krId, updates) to match API route callers.
 */
export const updateKeyResult = async (
  _goalId: string,
  krId: string,
  updates: Record<string, unknown>
): Promise<GoalKeyResult> => {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  const title = updates.title as string | undefined

  if (title !== undefined) {
    setClauses.push(`title = $${paramIndex}`)
    values.push(title)
    paramIndex++
  }

  const targetValue = (updates.targetValue ?? updates.target_value) as number | null | undefined

  if (targetValue !== undefined) {
    setClauses.push(`target_value = $${paramIndex}`)
    values.push(targetValue)
    paramIndex++
  }

  const currentValue = (updates.currentValue ?? updates.current_value) as number | undefined

  if (currentValue !== undefined) {
    setClauses.push(`current_value = $${paramIndex}`)
    values.push(currentValue)
    paramIndex++
  }

  const unit = updates.unit as string | undefined

  if (unit !== undefined) {
    setClauses.push(`unit = $${paramIndex}`)
    values.push(unit)
    paramIndex++
  }

  const sortOrder = (updates.sortOrder ?? updates.sort_order) as number | undefined

  if (sortOrder !== undefined) {
    setClauses.push(`sort_order = $${paramIndex}`)
    values.push(sortOrder)
    paramIndex++
  }

  if (setClauses.length === 0) {
    const rows = await runGreenhousePostgresQuery<GoalKeyResultRow>(
      `
        SELECT
          kr_id, goal_id, title,
          target_value, current_value, unit,
          sort_order, created_at, updated_at
        FROM greenhouse_hr.goal_key_results
        WHERE kr_id = $1
        LIMIT 1
      `,
      [krId]
    )

    return mapKeyResult(rows[0])
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(krId)

  const rows = await runGreenhousePostgresQuery<GoalKeyResultRow>(
    `
      UPDATE greenhouse_hr.goal_key_results
      SET ${setClauses.join(', ')}
      WHERE kr_id = $${paramIndex}
      RETURNING
        kr_id, goal_id, title,
        target_value, current_value, unit,
        sort_order, created_at, updated_at
    `,
    values
  )

  return mapKeyResult(rows[0])
}

/**
 * Delete a key result.
 * Signature: deleteKeyResult(goalId, krId) to match API route callers.
 */
export const deleteKeyResult = async (_goalId: string, krId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_hr.goal_key_results WHERE kr_id = $1`,
    [krId]
  )
}

// ── Progress ──

/**
 * Record a progress entry for a goal.
 * Signature: recordProgress(goalId, body) to match API route callers.
 */
export const recordProgress = async (
  goalId: string,
  input: Record<string, unknown>
): Promise<GoalProgress & { progress_entry_id: string }> => {
  const progressId = generateId('gp')
  const progressPercent = (input.progressPercent ?? input.progress_percent) as number
  const notes = ((input.notes as string) || null)
  const recordedBy = ((input.recordedBy ?? input.recorded_by) as string) || 'system'

  const rows = await runGreenhousePostgresQuery<GoalProgressRow>(
    `
      INSERT INTO greenhouse_hr.goal_progress (
        progress_id, goal_id, recorded_by,
        progress_percent, notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        progress_id, goal_id, recorded_by,
        recorded_at, progress_percent, notes
    `,
    [progressId, goalId, recordedBy, progressPercent, notes]
  )

  const progress = mapProgress(rows[0])

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_hr.goals
      SET progress_percent = $1, updated_at = CURRENT_TIMESTAMP
      WHERE goal_id = $2
    `,
    [progressPercent, goalId]
  )

  return progress
}

export const getProgressHistory = async (goalId: string): Promise<GoalProgress[]> => {
  const rows = await runGreenhousePostgresQuery<GoalProgressRow>(
    `
      SELECT
        progress_id, goal_id, recorded_by,
        recorded_at, progress_percent, notes
      FROM greenhouse_hr.goal_progress
      WHERE goal_id = $1
      ORDER BY recorded_at DESC
    `,
    [goalId]
  )

  return rows.map(mapProgress)
}
