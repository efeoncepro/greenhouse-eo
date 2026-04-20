import 'server-only'

import { query } from '@/lib/db'

import type { EmploymentTypeEntry } from './sellable-roles-store'
import { getEmploymentTypeByCode } from './sellable-roles-store'
import {
  PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM,
  type EmploymentTypeAliasSourceSystem,
  normalizeEmploymentTypeAliasValue
} from './employment-type-alias-normalization'

export const EMPLOYMENT_TYPE_ALIAS_RESOLUTION_STATUSES = ['mapped', 'needs_review', 'deprecated'] as const
export type EmploymentTypeAliasResolutionStatus = (typeof EMPLOYMENT_TYPE_ALIAS_RESOLUTION_STATUSES)[number]

export const EMPLOYMENT_TYPE_ALIAS_CONFIDENCE_LEVELS = ['canonical', 'high', 'medium', 'low'] as const
export type EmploymentTypeAliasConfidence = (typeof EMPLOYMENT_TYPE_ALIAS_CONFIDENCE_LEVELS)[number]

type EmploymentTypeAliasRow = {
  source_system: EmploymentTypeAliasSourceSystem
  source_value: string
  source_value_normalized: string
  employment_type_code: string | null
  resolution_status: EmploymentTypeAliasResolutionStatus
  confidence: EmploymentTypeAliasConfidence
  notes: string | null
  active: boolean
  created_at: string | Date
  updated_at: string | Date
}

const toTimestampString = (value: string | Date | null | undefined) => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return value
}

export interface EmploymentTypeAliasEntry {
  sourceSystem: EmploymentTypeAliasSourceSystem
  sourceValue: string
  normalizedSourceValue: string
  employmentTypeCode: string | null
  resolutionStatus: EmploymentTypeAliasResolutionStatus
  confidence: EmploymentTypeAliasConfidence
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ResolveEmploymentTypeAliasInput {
  sourceSystem: EmploymentTypeAliasSourceSystem
  sourceValue: string | null | undefined
}

export interface EmploymentTypeAliasResolution {
  matched: boolean
  sourceSystem: EmploymentTypeAliasSourceSystem
  sourceValue: string
  normalizedSourceValue: string
  employmentTypeCode: string | null
  resolutionStatus: EmploymentTypeAliasResolutionStatus
  confidence: EmploymentTypeAliasConfidence
  notes: string | null
  active: boolean
  employmentType: EmploymentTypeEntry | null
  warning: string | null
}

export interface ListEmploymentTypeAliasesInput {
  sourceSystem?: EmploymentTypeAliasSourceSystem | null
  activeOnly?: boolean | null
}

const mapAliasRow = (row: EmploymentTypeAliasRow): EmploymentTypeAliasEntry => ({
  sourceSystem: row.source_system,
  sourceValue: row.source_value,
  normalizedSourceValue: row.source_value_normalized,
  employmentTypeCode: row.employment_type_code,
  resolutionStatus: row.resolution_status,
  confidence: row.confidence,
  notes: row.notes,
  active: row.active,
  createdAt: toTimestampString(row.created_at),
  updatedAt: toTimestampString(row.updated_at)
})

const buildWhereClause = (input: ListEmploymentTypeAliasesInput = {}) => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (condition: string, value: unknown) => {
    idx += 1
    conditions.push(condition.replace('$?', `$${idx}`))
    values.push(value)
  }

  if (input.sourceSystem) {
    push('source_system = $?', input.sourceSystem)
  }

  if (input.activeOnly !== false) {
    push('active = $?', true)
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  }
}

export const listEmploymentTypeAliases = async (
  input: ListEmploymentTypeAliasesInput = {}
): Promise<EmploymentTypeAliasEntry[]> => {
  const { whereClause, values } = buildWhereClause(input)

  const rows = await query<EmploymentTypeAliasRow>(
    `SELECT source_system, source_value, source_value_normalized, employment_type_code,
            resolution_status, confidence, notes, active, created_at, updated_at
     FROM greenhouse_commercial.employment_type_aliases
     ${whereClause}
     ORDER BY source_system ASC, source_value_normalized ASC`,
    values
  )

  return rows.map(mapAliasRow)
}

export const resolveEmploymentTypeAlias = async (
  input: ResolveEmploymentTypeAliasInput
): Promise<EmploymentTypeAliasResolution> => {
  const normalizedSourceValue = normalizeEmploymentTypeAliasValue(input.sourceValue)
  const sourceValue = String(input.sourceValue ?? '').trim()

  if (!normalizedSourceValue) {
    return {
      matched: false,
      sourceSystem: input.sourceSystem,
      sourceValue,
      normalizedSourceValue,
      employmentTypeCode: null,
      resolutionStatus: 'needs_review',
      confidence: 'low',
      notes: null,
      active: false,
      employmentType: null,
      warning: 'empty_source_value'
    }
  }

  const rows = await query<EmploymentTypeAliasRow>(
    `SELECT source_system, source_value, source_value_normalized, employment_type_code,
            resolution_status, confidence, notes, active, created_at, updated_at
     FROM greenhouse_commercial.employment_type_aliases
     WHERE source_system = $1
       AND source_value_normalized = $2
     LIMIT 1`,
    [input.sourceSystem, normalizedSourceValue]
  )

  const row = rows[0]

  if (!row) {
    return {
      matched: false,
      sourceSystem: input.sourceSystem,
      sourceValue,
      normalizedSourceValue,
      employmentTypeCode: null,
      resolutionStatus: 'needs_review',
      confidence: 'low',
      notes: null,
      active: false,
      employmentType: null,
      warning: 'alias_not_found'
    }
  }

  const employmentType = row.employment_type_code
    ? await getEmploymentTypeByCode(row.employment_type_code)
    : null

  return {
    matched: true,
    sourceSystem: row.source_system,
    sourceValue: row.source_value,
    normalizedSourceValue: row.source_value_normalized,
    employmentTypeCode: row.employment_type_code,
    resolutionStatus: row.resolution_status,
    confidence: row.confidence,
    notes: row.notes,
    active: row.active,
    employmentType,
    warning: !row.active ? 'alias_inactive' : row.employment_type_code && !employmentType ? 'employment_type_not_found' : null
  }
}

export const resolvePayrollContractTypeToEmploymentType = async (contractType: string | null | undefined) =>
  resolveEmploymentTypeAlias({
    sourceSystem: PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM,
    sourceValue: contractType
  })
