import 'server-only'

import type { PoolClient } from 'pg'

import { isInternalCommercialAssignment } from '@/lib/commercial-cost-attribution/assignment-classification'
import { query } from '@/lib/db'
import { DEFAULT_MAX_FTE } from '@/lib/team-capacity/units'
import { toDateString, toIsoDateKey, trimRequired } from './shared'

export interface ConflictingAssignment {
  assignmentId: string
  clientId: string
  clientName: string | null
  serviceId: string | null
  fte: number
  startDate: string | null
  endDate: string | null
}

export interface MemberCapacityForPeriod {
  memberId: string
  totalFte: number
  allocatedFte: number
  availableFte: number
  conflictingAssignments: ConflictingAssignment[]
}

interface AssignmentRow extends Record<string, unknown> {
  assignment_id: string
  client_id: string
  client_name: string | null
  service_id: string | null
  fte_allocation: string | number | null
  hours_per_month: string | number | null
  contracted_hours_month: string | number | null
  start_date: Date | string | null
  end_date: Date | string | null
}

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const normalizeAssignment = (row: AssignmentRow): ConflictingAssignment | null => {
  if (isInternalCommercialAssignment({ clientId: row.client_id, clientName: row.client_name })) {
    return null
  }

  const explicitFte = toNumber(row.fte_allocation)
  const hours = toNumber(row.hours_per_month)
  const contractedHours = toNumber(row.contracted_hours_month)
  const fteFromHours = contractedHours > 0 ? hours / contractedHours : 0
  const fte = explicitFte > 0 ? explicitFte : fteFromHours

  if (!Number.isFinite(fte) || fte <= 0) return null

  return {
    assignmentId: row.assignment_id,
    clientId: row.client_id,
    clientName: row.client_name ?? null,
    serviceId: row.service_id ?? null,
    fte,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date)
  }
}

const buildCapacity = (memberId: string, rows: AssignmentRow[]): MemberCapacityForPeriod => {
  const conflictingAssignments = rows
    .map(normalizeAssignment)
    .filter((assignment): assignment is ConflictingAssignment => assignment !== null)

  const allocatedFte = conflictingAssignments.reduce((sum, assignment) => sum + assignment.fte, 0)

  return {
    memberId,
    totalFte: DEFAULT_MAX_FTE,
    allocatedFte,
    availableFte: DEFAULT_MAX_FTE - allocatedFte,
    conflictingAssignments
  }
}

export const getMemberCapacityForPeriodUsingClient = async (
  client: PoolClient,
  memberId: string,
  fromDate: Date | string,
  toDate: Date | string
): Promise<MemberCapacityForPeriod> => {
  const normalizedMemberId = trimRequired(memberId, 'memberId')
  const normalizedFromDate = toIsoDateKey(fromDate, 'fromDate')
  const normalizedToDate = toIsoDateKey(toDate, 'toDate')

  if (normalizedToDate < normalizedFromDate) {
    throw new Error('toDate must be on or after fromDate.')
  }

  const result = await client.query<AssignmentRow>(
    `SELECT
       a.assignment_id,
       a.client_id,
       c.client_name,
       a.service_id,
       a.fte_allocation,
       a.hours_per_month,
       a.contracted_hours_month,
       a.start_date,
       a.end_date
     FROM greenhouse_core.client_team_assignments a
     LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
     WHERE a.member_id = $1
       AND a.active = TRUE
       AND COALESCE(a.start_date, DATE '1900-01-01') <= $3::date
       AND COALESCE(a.end_date, DATE '9999-12-31') >= $2::date
     ORDER BY a.start_date NULLS FIRST, a.assignment_id`,
    [normalizedMemberId, normalizedFromDate, normalizedToDate]
  )

  return buildCapacity(normalizedMemberId, result.rows)
}

export const getMemberCapacityForPeriod = async (
  memberId: string,
  fromDate: Date | string,
  toDate: Date | string
): Promise<MemberCapacityForPeriod> => {
  const normalizedMemberId = trimRequired(memberId, 'memberId')
  const normalizedFromDate = toIsoDateKey(fromDate, 'fromDate')
  const normalizedToDate = toIsoDateKey(toDate, 'toDate')

  if (normalizedToDate < normalizedFromDate) {
    throw new Error('toDate must be on or after fromDate.')
  }

  const rows = await query<AssignmentRow>(
    `SELECT
       a.assignment_id,
       a.client_id,
       c.client_name,
       a.service_id,
       a.fte_allocation,
       a.hours_per_month,
       a.contracted_hours_month,
       a.start_date,
       a.end_date
     FROM greenhouse_core.client_team_assignments a
     LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
     WHERE a.member_id = $1
       AND a.active = TRUE
       AND COALESCE(a.start_date, DATE '1900-01-01') <= $3::date
       AND COALESCE(a.end_date, DATE '9999-12-31') >= $2::date
     ORDER BY a.start_date NULLS FIRST, a.assignment_id`,
    [normalizedMemberId, normalizedFromDate, normalizedToDate]
  )

  return buildCapacity(normalizedMemberId, rows)
}
