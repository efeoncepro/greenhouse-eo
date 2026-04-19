import 'server-only'

import { sql } from 'kysely'

import { getLastBusinessDayOfMonth } from '@/lib/calendar/operational-calendar'
import { getDb } from '@/lib/db'
import { listEmploymentTypeAliases } from '@/lib/commercial/employment-type-alias-store'
import { PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM } from '@/lib/commercial/employment-type-alias-normalization'

export type MemberRoleCostBasisMappingSource =
  | 'assignment_role_title_override'
  | 'person_membership_role_label'
  | 'member_role_title'
  | 'unmapped'

export type PeopleCostBasisConfidenceLabel = 'high' | 'medium' | 'low'
export type MemberRoleCostBasisSnapshotStatus = 'mapped' | 'partial' | 'unresolved'
export type RoleBlendedCostBasisSnapshotStatus = 'complete' | 'partial' | 'unresolved'

export interface MemberRoleCostBasisSnapshot {
  snapshotId: string
  snapshotKey: string
  memberId: string
  roleId: string | null
  roleSku: string | null
  roleCode: string | null
  roleLabel: string | null
  employmentTypeCode: string | null
  periodYear: number
  periodMonth: number
  periodId: string
  snapshotDate: string
  mappingSource: MemberRoleCostBasisMappingSource
  mappingSourceRef: string | null
  sourceKind: 'member_capacity_economics'
  sourceRef: string | null
  resolvedCurrency: string
  loadedCostAmount: number | null
  costPerHourAmount: number | null
  totalLaborCostAmount: number | null
  directOverheadAmount: number | null
  sharedOverheadAmount: number | null
  contractedFte: number
  commercialAvailabilityHours: number
  snapshotStatus: MemberRoleCostBasisSnapshotStatus
  confidenceScore: number
  confidenceLabel: PeopleCostBasisConfidenceLabel
  detail: Record<string, unknown>
  materializedAt: string
  createdAt: string
  updatedAt: string
}

export interface RoleBlendedCostBasisSnapshot {
  snapshotId: string
  snapshotKey: string
  roleId: string
  roleSku: string
  roleCode: string
  roleLabel: string
  employmentTypeCode: string
  periodYear: number
  periodMonth: number
  periodId: string
  snapshotDate: string
  sourceKind: 'people_blended'
  sourceRef: string | null
  resolvedCurrency: string
  blendedLoadedCostAmount: number
  blendedCostPerHourAmount: number | null
  blendedTotalLaborCostAmount: number | null
  blendedDirectOverheadAmount: number
  blendedSharedOverheadAmount: number
  weightedFte: number
  weightedHours: number
  sampleSize: number
  memberCount: number
  freshestMemberSnapshotAt: string | null
  oldestMemberSnapshotAt: string | null
  freshnessDays: number
  freshnessStatus: 'fresh' | 'stale' | 'unknown'
  confidenceScore: number
  confidenceLabel: PeopleCostBasisConfidenceLabel
  snapshotStatus: RoleBlendedCostBasisSnapshotStatus
  detail: Record<string, unknown>
  materializedAt: string
  createdAt: string
  updatedAt: string
}

export interface MemberActualCostBasisSnapshot {
  memberId: string
  periodYear: number
  periodMonth: number
  periodId: string
  snapshotDate: string
  sourceKind: 'member_actual'
  sourceRef: string | null
  currency: string
  loadedCostAmount: number | null
  costPerHourAmount: number | null
  totalLaborCostAmount: number | null
  directOverheadAmount: number | null
  sharedOverheadAmount: number | null
  contractedFte: number
  contractedHours: number
  commercialAvailabilityHours: number
  snapshotStatus: string
  confidenceScore: number
  confidenceLabel: PeopleCostBasisConfidenceLabel
  sourceCompensationVersionId: string | null
  sourcePayrollPeriodId: string | null
  roleId: string | null
  roleSku: string | null
  roleCode: string | null
  roleLabel: string | null
  employmentTypeCode: string | null
  detail: Record<string, unknown>
}

type MemberRoleSnapshotRow = {
  snapshot_id: string
  snapshot_key: string
  member_id: string
  role_id: string | null
  role_sku: string | null
  role_code: string | null
  role_label: string | null
  employment_type_code: string | null
  period_year: number | string
  period_month: number | string
  period_id: string
  snapshot_date: string | Date
  mapping_source: MemberRoleCostBasisMappingSource
  mapping_source_ref: string | null
  source_kind: 'member_capacity_economics'
  source_ref: string | null
  resolved_currency: string
  loaded_cost_amount: number | string | null
  cost_per_hour_amount: number | string | null
  total_labor_cost_amount: number | string | null
  direct_overhead_amount: number | string | null
  shared_overhead_amount: number | string | null
  contracted_fte: number | string | null
  commercial_availability_hours: number | string | null
  snapshot_status: MemberRoleCostBasisSnapshotStatus
  confidence_score: number | string | null
  confidence_label: PeopleCostBasisConfidenceLabel
  detail_jsonb: Record<string, unknown> | null
  materialized_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}

type RoleBlendedSnapshotRow = {
  snapshot_id: string
  snapshot_key: string
  role_id: string
  role_sku: string
  role_code: string
  role_label: string
  employment_type_code: string
  period_year: number | string
  period_month: number | string
  period_id: string
  snapshot_date: string | Date
  source_kind: 'people_blended'
  source_ref: string | null
  resolved_currency: string
  blended_loaded_cost_amount: number | string | null
  blended_cost_per_hour_amount: number | string | null
  blended_total_labor_cost_amount: number | string | null
  blended_direct_overhead_amount: number | string | null
  blended_shared_overhead_amount: number | string | null
  weighted_fte: number | string | null
  weighted_hours: number | string | null
  sample_size: number | string | null
  member_count: number | string | null
  freshest_member_snapshot_at: string | Date | null
  oldest_member_snapshot_at: string | Date | null
  freshness_days: number | string | null
  freshness_status: 'fresh' | 'stale' | 'unknown'
  confidence_score: number | string | null
  confidence_label: PeopleCostBasisConfidenceLabel
  snapshot_status: RoleBlendedCostBasisSnapshotStatus
  detail_jsonb: Record<string, unknown> | null
  materialized_at: string | Date
  created_at: string | Date
  updated_at: string | Date
}

type MemberActualReaderRow = {
  period_year: number | string
  period_month: number | string
  target_currency: string
  loaded_cost_target: number | string | null
  cost_per_hour_target: number | string | null
  total_labor_cost_target: number | string | null
  direct_overhead_target: number | string | null
  shared_overhead_target: number | string | null
  contracted_fte: number | string | null
  contracted_hours: number | string | null
  commercial_availability_hours: number | string | null
  snapshot_status: string
  source_compensation_version_id: string | null
  source_payroll_period_id: string | null
  materialized_at: string | Date | null
  role_id: string | null
  role_sku: string | null
  role_code: string | null
  role_label: string | null
  employment_type_code: string | null
  bridge_snapshot_status: MemberRoleCostBasisSnapshotStatus | null
  bridge_confidence_score: number | string | null
  bridge_confidence_label: PeopleCostBasisConfidenceLabel | null
  detail_jsonb: Record<string, unknown> | null
}

type MemberFactRow = {
  member_id: string
  role_title: string | null
  membership_role_label: string | null
  assignment_role_title_override: string | null
  assignment_role_title_override_count: number | string | null
  contract_type: string | null
  target_currency: string
  loaded_cost_target: number | string | null
  cost_per_hour_target: number | string | null
  total_labor_cost_target: number | string | null
  direct_overhead_target: number | string | null
  shared_overhead_target: number | string | null
  contracted_fte: number | string | null
  contracted_hours: number | string | null
  commercial_availability_hours: number | string | null
  snapshot_status: string
  source_compensation_version_id: string | null
  source_payroll_period_id: string | null
  materialized_at: string | Date | null
}

type RoleCatalogRow = {
  role_id: string
  role_sku: string
  role_code: string
  role_label_es: string
  role_label_en: string | null
  employment_type_code: string | null
  is_default: boolean | null
  allowed: boolean | null
}

type RoleCompatibility = {
  employmentTypeCode: string
  isDefault: boolean
}

type RoleCatalogEntry = {
  roleId: string
  roleSku: string
  roleCode: string
  roleLabel: string
  compatibilities: RoleCompatibility[]
}

type EmploymentAliasEntry = {
  employmentTypeCode: string | null
  resolutionStatus: string
  confidence: string
}

type RoleMatch = {
  role: RoleCatalogEntry
  mappingSource: MemberRoleCostBasisMappingSource
  mappingSourceRef: string
  confidenceScore: number
}

type MemberRoleUpsert = Omit<MemberRoleCostBasisSnapshot, 'snapshotId' | 'createdAt' | 'updatedAt'>
type RoleBlendedUpsert = Omit<RoleBlendedCostBasisSnapshot, 'snapshotId' | 'createdAt' | 'updatedAt'>

type RoleAggregate = {
  role: RoleCatalogEntry
  employmentTypeCode: string
  weightedLoadedCost: number
  weightedCostPerHour: number
  weightedLaborCost: number
  weightedDirectOverhead: number
  weightedSharedOverhead: number
  weightTotal: number
  weightedFte: number
  weightedHours: number
  sampleSize: number
  memberIds: string[]
  mappingScores: number[]
  freshestMaterializedAt: string | null
  oldestMaterializedAt: string | null
}

const round2 = (value: number) => Math.round(value * 100) / 100
const round4 = (value: number) => Math.round(value * 10_000) / 10_000

const pad2 = (value: number) => String(value).padStart(2, '0')

const getPeriodId = (year: number, month: number) => `${year}-${pad2(month)}`

const getPeriodStart = (year: number, month: number) => `${year}-${pad2(month)}-01`

const getPeriodEnd = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 0))

  return date.toISOString().slice(0, 10)
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown) => (value == null ? null : toNumber(value))

const toDateString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toTimestampString = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return value
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const normalizeRoleMatchValue = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const classifyConfidenceLabel = (score: number): PeopleCostBasisConfidenceLabel => {
  if (score >= 0.8) return 'high'
  if (score >= 0.55) return 'medium'

  return 'low'
}

const classifyFreshnessStatus = (days: number): 'fresh' | 'stale' | 'unknown' => {
  if (!Number.isFinite(days) || days < 0) return 'unknown'
  if (days <= 45) return 'fresh'

  return 'stale'
}

const getFreshnessDays = (snapshotDate: string) => {
  const parsed = new Date(`${snapshotDate}T12:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) return 0

  const diffMs = Date.now() - parsed.getTime()

  return Math.max(0, Math.floor(diffMs / 86_400_000))
}

const buildMemberActualConfidence = (snapshotStatus: string) => {
  switch (snapshotStatus) {
    case 'complete':
      return 0.95
    case 'partial':
      return 0.72
    default:
      return 0.45
  }
}

const buildRoleCatalog = (rows: RoleCatalogRow[]) => {
  const roles = new Map<string, RoleCatalogEntry>()
  const aliasIndex = new Map<string, Set<string>>()

  const registerAlias = (alias: string | null | undefined, roleId: string) => {
    const normalized = normalizeRoleMatchValue(alias)

    if (!normalized) return

    const current = aliasIndex.get(normalized) ?? new Set<string>()

    current.add(roleId)
    aliasIndex.set(normalized, current)
  }

  for (const row of rows) {
    const current =
      roles.get(row.role_id) ??
      {
        roleId: row.role_id,
        roleSku: row.role_sku,
        roleCode: row.role_code,
        roleLabel: row.role_label_es,
        compatibilities: []
      }

    if (row.employment_type_code && row.allowed !== false) {
      current.compatibilities.push({
        employmentTypeCode: row.employment_type_code,
        isDefault: row.is_default === true
      })
    }

    roles.set(row.role_id, current)

    registerAlias(row.role_code, row.role_id)
    registerAlias(row.role_label_es, row.role_id)
    registerAlias(row.role_label_en, row.role_id)
  }

  return { roles, aliasIndex }
}

const resolveRoleMatch = (
  fact: MemberFactRow,
  roles: Map<string, RoleCatalogEntry>,
  aliasIndex: Map<string, Set<string>>
): RoleMatch | null => {
  const candidates: Array<{
    value: string | null
    source: MemberRoleCostBasisMappingSource
    confidence: number
  }> = []

  if (toNumber(fact.assignment_role_title_override_count) === 1) {
    candidates.push({
      value: fact.assignment_role_title_override,
      source: 'assignment_role_title_override',
      confidence: 0.95
    })
  }

  candidates.push(
    {
      value: fact.membership_role_label,
      source: 'person_membership_role_label',
      confidence: 0.88
    },
    {
      value: fact.role_title,
      source: 'member_role_title',
      confidence: 0.8
    }
  )

  for (const candidate of candidates) {
    const normalized = normalizeRoleMatchValue(candidate.value)

    if (!normalized) continue

    const matchedRoleIds = Array.from(aliasIndex.get(normalized) ?? [])

    if (matchedRoleIds.length !== 1) {
      continue
    }

    const role = roles.get(matchedRoleIds[0])

    if (!role) continue

    return {
      role,
      mappingSource: candidate.source,
      mappingSourceRef: String(candidate.value ?? '').trim(),
      confidenceScore: candidate.confidence
    }
  }

  return null
}

const resolveEmploymentTypeCode = (
  contractType: string | null,
  role: RoleCatalogEntry | null,
  aliasMap: Map<string, EmploymentAliasEntry>
) => {
  const normalizedContractType = normalizeRoleMatchValue(contractType)
  const alias = normalizedContractType ? aliasMap.get(normalizedContractType) ?? null : null

  if (alias?.employmentTypeCode && alias.resolutionStatus === 'mapped') {
    return {
      employmentTypeCode: alias.employmentTypeCode,
      confidenceFactor: alias.confidence === 'canonical' ? 1 : alias.confidence === 'high' ? 0.95 : alias.confidence === 'medium' ? 0.85 : 0.7
    }
  }

  if (!role) {
    return {
      employmentTypeCode: null,
      confidenceFactor: 1
    }
  }

  const defaultCompatibility = role.compatibilities.find(entry => entry.isDefault) ?? role.compatibilities[0] ?? null

  if (!defaultCompatibility) {
    return {
      employmentTypeCode: null,
      confidenceFactor: 1
    }
  }

  return {
    employmentTypeCode: defaultCompatibility.employmentTypeCode,
    confidenceFactor: 0.65
  }
}

const mapMemberRoleRow = (row: MemberRoleSnapshotRow): MemberRoleCostBasisSnapshot => ({
  snapshotId: row.snapshot_id,
  snapshotKey: row.snapshot_key,
  memberId: row.member_id,
  roleId: row.role_id,
  roleSku: row.role_sku,
  roleCode: row.role_code,
  roleLabel: row.role_label,
  employmentTypeCode: row.employment_type_code,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  periodId: row.period_id,
  snapshotDate: toDateString(row.snapshot_date) ?? '',
  mappingSource: row.mapping_source,
  mappingSourceRef: row.mapping_source_ref,
  sourceKind: row.source_kind,
  sourceRef: row.source_ref,
  resolvedCurrency: row.resolved_currency,
  loadedCostAmount: toNullableNumber(row.loaded_cost_amount),
  costPerHourAmount: toNullableNumber(row.cost_per_hour_amount),
  totalLaborCostAmount: toNullableNumber(row.total_labor_cost_amount),
  directOverheadAmount: toNullableNumber(row.direct_overhead_amount),
  sharedOverheadAmount: toNullableNumber(row.shared_overhead_amount),
  contractedFte: toNumber(row.contracted_fte),
  commercialAvailabilityHours: toNumber(row.commercial_availability_hours),
  snapshotStatus: row.snapshot_status,
  confidenceScore: round4(toNumber(row.confidence_score)),
  confidenceLabel: row.confidence_label,
  detail: row.detail_jsonb ?? {},
  materializedAt: toTimestampString(row.materialized_at) ?? '',
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

const mapRoleBlendedRow = (row: RoleBlendedSnapshotRow): RoleBlendedCostBasisSnapshot => ({
  snapshotId: row.snapshot_id,
  snapshotKey: row.snapshot_key,
  roleId: row.role_id,
  roleSku: row.role_sku,
  roleCode: row.role_code,
  roleLabel: row.role_label,
  employmentTypeCode: row.employment_type_code,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  periodId: row.period_id,
  snapshotDate: toDateString(row.snapshot_date) ?? '',
  sourceKind: row.source_kind,
  sourceRef: row.source_ref,
  resolvedCurrency: row.resolved_currency,
  blendedLoadedCostAmount: round2(toNumber(row.blended_loaded_cost_amount)),
  blendedCostPerHourAmount: toNullableNumber(row.blended_cost_per_hour_amount),
  blendedTotalLaborCostAmount: toNullableNumber(row.blended_total_labor_cost_amount),
  blendedDirectOverheadAmount: round2(toNumber(row.blended_direct_overhead_amount)),
  blendedSharedOverheadAmount: round2(toNumber(row.blended_shared_overhead_amount)),
  weightedFte: round4(toNumber(row.weighted_fte)),
  weightedHours: round2(toNumber(row.weighted_hours)),
  sampleSize: toNumber(row.sample_size),
  memberCount: toNumber(row.member_count),
  freshestMemberSnapshotAt: toTimestampString(row.freshest_member_snapshot_at),
  oldestMemberSnapshotAt: toTimestampString(row.oldest_member_snapshot_at),
  freshnessDays: toNumber(row.freshness_days),
  freshnessStatus: row.freshness_status,
  confidenceScore: round4(toNumber(row.confidence_score)),
  confidenceLabel: row.confidence_label,
  snapshotStatus: row.snapshot_status,
  detail: row.detail_jsonb ?? {},
  materializedAt: toTimestampString(row.materialized_at) ?? '',
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

const buildMemberRoleSourceRef = (fact: MemberFactRow) =>
  fact.source_payroll_period_id?.trim() ||
  fact.source_compensation_version_id?.trim() ||
  null

const buildMemberRoleSnapshotStatus = (roleMatch: RoleMatch | null, employmentTypeCode: string | null) => {
  if (!roleMatch) return 'unresolved' as const
  if (!employmentTypeCode) return 'partial' as const

  return 'mapped' as const
}

const buildMemberRoleSnapshots = async (year: number, month: number): Promise<MemberRoleUpsert[]> => {
  const db = await getDb()
  const periodId = getPeriodId(year, month)
  const periodStart = getPeriodStart(year, month)
  const periodEnd = getPeriodEnd(year, month)
  const snapshotDate = getLastBusinessDayOfMonth(year, month)

  const [memberFactsResult, roleCatalogResult, aliasEntries] = await Promise.all([
    sql<MemberFactRow>`
      WITH current_compensation AS (
        SELECT DISTINCT ON (cv.member_id)
          cv.member_id,
          cv.contract_type
        FROM greenhouse_payroll.compensation_versions cv
        WHERE cv.effective_from <= ${periodEnd}::date
          AND (cv.effective_to IS NULL OR cv.effective_to >= ${periodStart}::date)
        ORDER BY cv.member_id, cv.effective_from DESC
      ),
      primary_membership AS (
        SELECT profile_id, role_label
        FROM (
          SELECT
            pm.profile_id,
            pm.role_label,
            ROW_NUMBER() OVER (
              PARTITION BY pm.profile_id
              ORDER BY pm.is_primary DESC, pm.updated_at DESC, pm.created_at DESC
            ) AS rn
          FROM greenhouse_core.person_memberships pm
          WHERE pm.active = TRUE
            AND pm.membership_type = 'team_member'
        ) ranked
        WHERE rn = 1
      ),
      assignment_override AS (
        SELECT
          a.member_id,
          MIN(NULLIF(BTRIM(a.role_title_override), '')) AS role_title_override,
          COUNT(DISTINCT NULLIF(BTRIM(a.role_title_override), '')) AS role_title_override_count
        FROM greenhouse_core.client_team_assignments a
        WHERE a.active = TRUE
          AND a.start_date <= ${periodEnd}::date
          AND (a.end_date IS NULL OR a.end_date >= ${periodStart}::date)
        GROUP BY a.member_id
      )
      SELECT
        mce.member_id,
        m.role_title,
        pm.role_label AS membership_role_label,
        ao.role_title_override AS assignment_role_title_override,
        ao.role_title_override_count,
        cc.contract_type,
        mce.target_currency,
        mce.loaded_cost_target,
        mce.cost_per_hour_target,
        mce.total_labor_cost_target,
        mce.direct_overhead_target,
        mce.shared_overhead_target,
        mce.contracted_fte,
        mce.contracted_hours,
        mce.commercial_availability_hours,
        mce.snapshot_status,
        mce.source_compensation_version_id,
        mce.source_payroll_period_id,
        mce.materialized_at
      FROM greenhouse_serving.member_capacity_economics mce
      JOIN greenhouse_core.members m
        ON m.member_id = mce.member_id
       AND m.active = TRUE
      LEFT JOIN primary_membership pm
        ON pm.profile_id = m.identity_profile_id
      LEFT JOIN assignment_override ao
        ON ao.member_id = m.member_id
      LEFT JOIN current_compensation cc
        ON cc.member_id = m.member_id
      WHERE mce.period_year = ${year}
        AND mce.period_month = ${month}
    `.execute(db),
    sql<RoleCatalogRow>`
      SELECT
        sr.role_id,
        sr.role_sku,
        sr.role_code,
        sr.role_label_es,
        sr.role_label_en,
        rec.employment_type_code,
        rec.is_default,
        rec.allowed
      FROM greenhouse_commercial.sellable_roles sr
      LEFT JOIN greenhouse_commercial.role_employment_compatibility rec
        ON rec.role_id = sr.role_id
      WHERE sr.active = TRUE
      ORDER BY sr.role_sku ASC, rec.is_default DESC, rec.employment_type_code ASC
    `.execute(db),
    listEmploymentTypeAliases({
      sourceSystem: PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM,
      activeOnly: true
    })
  ])

  const { roles, aliasIndex } = buildRoleCatalog(roleCatalogResult.rows)
  const aliasMap = new Map<string, EmploymentAliasEntry>()

  for (const entry of aliasEntries) {
    aliasMap.set(normalizeRoleMatchValue(entry.normalizedSourceValue), {
      employmentTypeCode: entry.employmentTypeCode,
      resolutionStatus: entry.resolutionStatus,
      confidence: entry.confidence
    })
  }

  return memberFactsResult.rows.map(fact => {
    const roleMatch = resolveRoleMatch(fact, roles, aliasIndex)
    const employmentType = resolveEmploymentTypeCode(fact.contract_type, roleMatch?.role ?? null, aliasMap)
    const snapshotStatus = buildMemberRoleSnapshotStatus(roleMatch, employmentType.employmentTypeCode)

    const confidenceScore = clamp(
      (roleMatch?.confidenceScore ?? 0) * employmentType.confidenceFactor,
      0,
      1
    )

    const detail: Record<string, unknown> = {
      memberRoleTitle: fact.role_title,
      membershipRoleLabel: fact.membership_role_label,
      assignmentRoleTitleOverride:
        toNumber(fact.assignment_role_title_override_count) === 1
          ? fact.assignment_role_title_override
          : null,
      assignmentRoleTitleOverrideCount: toNumber(fact.assignment_role_title_override_count),
      contractType: fact.contract_type,
      sourcePayrollPeriodId: fact.source_payroll_period_id,
      sourceCompensationVersionId: fact.source_compensation_version_id
    }

    return {
      snapshotKey: `mrb:${fact.member_id}:${periodId}`,
      memberId: fact.member_id,
      roleId: roleMatch?.role.roleId ?? null,
      roleSku: roleMatch?.role.roleSku ?? null,
      roleCode: roleMatch?.role.roleCode ?? null,
      roleLabel: roleMatch?.role.roleLabel ?? null,
      employmentTypeCode: employmentType.employmentTypeCode,
      periodYear: year,
      periodMonth: month,
      periodId,
      snapshotDate,
      mappingSource: roleMatch?.mappingSource ?? 'unmapped',
      mappingSourceRef: roleMatch?.mappingSourceRef ?? null,
      sourceKind: 'member_capacity_economics' as const,
      sourceRef: buildMemberRoleSourceRef(fact),
      resolvedCurrency: fact.target_currency,
      loadedCostAmount: toNullableNumber(fact.loaded_cost_target),
      costPerHourAmount: toNullableNumber(fact.cost_per_hour_target),
      totalLaborCostAmount: toNullableNumber(fact.total_labor_cost_target),
      directOverheadAmount: toNullableNumber(fact.direct_overhead_target),
      sharedOverheadAmount: toNullableNumber(fact.shared_overhead_target),
      contractedFte: round4(toNumber(fact.contracted_fte)),
      commercialAvailabilityHours: round2(toNumber(fact.commercial_availability_hours)),
      snapshotStatus,
      confidenceScore: round4(confidenceScore),
      confidenceLabel: classifyConfidenceLabel(confidenceScore),
      detail,
      materializedAt: toTimestampString(fact.materialized_at) ?? new Date().toISOString()
    }
  })
}

const buildRoleBlendedSnapshots = (
  snapshots: MemberRoleUpsert[],
  year: number,
  month: number
): RoleBlendedUpsert[] => {
  const periodId = getPeriodId(year, month)
  const snapshotDate = getLastBusinessDayOfMonth(year, month)
  const aggregates = new Map<string, RoleAggregate>()

  for (const snapshot of snapshots) {
    if (!snapshot.roleId || !snapshot.roleSku || !snapshot.roleCode || !snapshot.roleLabel) continue
    if (!snapshot.employmentTypeCode) continue
    if (snapshot.loadedCostAmount == null || snapshot.loadedCostAmount <= 0) continue

    const weight =
      snapshot.contractedFte > 0
        ? snapshot.contractedFte
        : snapshot.commercialAvailabilityHours > 0
          ? snapshot.commercialAvailabilityHours / 160
          : 1

    const key = `${snapshot.roleId}:${snapshot.employmentTypeCode}`

    const current =
      aggregates.get(key) ??
      {
        role: {
          roleId: snapshot.roleId,
          roleSku: snapshot.roleSku,
          roleCode: snapshot.roleCode,
          roleLabel: snapshot.roleLabel,
          compatibilities: []
        },
        employmentTypeCode: snapshot.employmentTypeCode,
        weightedLoadedCost: 0,
        weightedCostPerHour: 0,
        weightedLaborCost: 0,
        weightedDirectOverhead: 0,
        weightedSharedOverhead: 0,
        weightTotal: 0,
        weightedFte: 0,
        weightedHours: 0,
        sampleSize: 0,
        memberIds: [],
        mappingScores: [],
        freshestMaterializedAt: null,
        oldestMaterializedAt: null
      }

    current.weightedLoadedCost += (snapshot.loadedCostAmount ?? 0) * weight
    current.weightedCostPerHour += (snapshot.costPerHourAmount ?? 0) * weight
    current.weightedLaborCost += (snapshot.totalLaborCostAmount ?? 0) * weight
    current.weightedDirectOverhead += (snapshot.directOverheadAmount ?? 0) * weight
    current.weightedSharedOverhead += (snapshot.sharedOverheadAmount ?? 0) * weight
    current.weightTotal += weight
    current.weightedFte += snapshot.contractedFte
    current.weightedHours += snapshot.commercialAvailabilityHours
    current.sampleSize += 1
    current.mappingScores.push(snapshot.confidenceScore)

    if (!current.memberIds.includes(snapshot.memberId) && current.memberIds.length < 25) {
      current.memberIds.push(snapshot.memberId)
    }

    if (!current.freshestMaterializedAt || snapshot.materializedAt > current.freshestMaterializedAt) {
      current.freshestMaterializedAt = snapshot.materializedAt
    }

    if (!current.oldestMaterializedAt || snapshot.materializedAt < current.oldestMaterializedAt) {
      current.oldestMaterializedAt = snapshot.materializedAt
    }

    aggregates.set(key, current)
  }

  return Array.from(aggregates.values()).map(entry => {
    const sampleFactor = entry.sampleSize >= 3 ? 1 : entry.sampleSize === 2 ? 0.85 : 0.7

    const averageMappingScore =
      entry.mappingScores.length > 0
        ? entry.mappingScores.reduce((sum, score) => sum + score, 0) / entry.mappingScores.length
        : 0

    const confidenceScore = round4(clamp(averageMappingScore * sampleFactor, 0, 1))
    const freshnessDays = getFreshnessDays(snapshotDate)

    return {
      snapshotKey: `rbs:${entry.role.roleId}:${entry.employmentTypeCode}:${periodId}`,
      roleId: entry.role.roleId,
      roleSku: entry.role.roleSku,
      roleCode: entry.role.roleCode,
      roleLabel: entry.role.roleLabel,
      employmentTypeCode: entry.employmentTypeCode,
      periodYear: year,
      periodMonth: month,
      periodId,
      snapshotDate,
      sourceKind: 'people_blended' as const,
      sourceRef: `mrb:${periodId}`,
      resolvedCurrency: 'CLP',
      blendedLoadedCostAmount: round2(entry.weightedLoadedCost / Math.max(entry.weightTotal, 1)),
      blendedCostPerHourAmount:
        entry.weightedCostPerHour > 0 ? round4(entry.weightedCostPerHour / Math.max(entry.weightTotal, 1)) : null,
      blendedTotalLaborCostAmount:
        entry.weightedLaborCost > 0 ? round2(entry.weightedLaborCost / Math.max(entry.weightTotal, 1)) : null,
      blendedDirectOverheadAmount: round2(entry.weightedDirectOverhead / Math.max(entry.weightTotal, 1)),
      blendedSharedOverheadAmount: round2(entry.weightedSharedOverhead / Math.max(entry.weightTotal, 1)),
      weightedFte: round4(entry.weightedFte),
      weightedHours: round2(entry.weightedHours),
      sampleSize: entry.sampleSize,
      memberCount: entry.sampleSize,
      freshestMemberSnapshotAt: entry.freshestMaterializedAt,
      oldestMemberSnapshotAt: entry.oldestMaterializedAt,
      freshnessDays,
      freshnessStatus: classifyFreshnessStatus(freshnessDays),
      confidenceScore,
      confidenceLabel: classifyConfidenceLabel(confidenceScore),
      snapshotStatus: entry.sampleSize > 0 ? 'complete' : 'unresolved',
      detail: {
        sampleMemberIds: entry.memberIds,
        weightTotal: round4(entry.weightTotal),
        sampleSize: entry.sampleSize
      },
      materializedAt: new Date().toISOString()
    }
  })
}

const upsertMemberRoleSnapshots = async (snapshots: MemberRoleUpsert[]) => {
  const db = await getDb()

  for (const snapshot of snapshots) {
    await sql`
      INSERT INTO greenhouse_commercial.member_role_cost_basis_snapshots (
        snapshot_key,
        member_id,
        role_id,
        role_sku,
        role_code,
        role_label,
        employment_type_code,
        period_year,
        period_month,
        period_id,
        snapshot_date,
        mapping_source,
        mapping_source_ref,
        source_kind,
        source_ref,
        resolved_currency,
        loaded_cost_amount,
        cost_per_hour_amount,
        total_labor_cost_amount,
        direct_overhead_amount,
        shared_overhead_amount,
        contracted_fte,
        commercial_availability_hours,
        snapshot_status,
        confidence_score,
        confidence_label,
        detail_jsonb,
        materialized_at,
        updated_at
      ) VALUES (
        ${snapshot.snapshotKey},
        ${snapshot.memberId},
        ${snapshot.roleId},
        ${snapshot.roleSku},
        ${snapshot.roleCode},
        ${snapshot.roleLabel},
        ${snapshot.employmentTypeCode},
        ${snapshot.periodYear},
        ${snapshot.periodMonth},
        ${snapshot.periodId},
        ${snapshot.snapshotDate}::date,
        ${snapshot.mappingSource},
        ${snapshot.mappingSourceRef},
        ${snapshot.sourceKind},
        ${snapshot.sourceRef},
        ${snapshot.resolvedCurrency},
        ${snapshot.loadedCostAmount},
        ${snapshot.costPerHourAmount},
        ${snapshot.totalLaborCostAmount},
        ${snapshot.directOverheadAmount},
        ${snapshot.sharedOverheadAmount},
        ${snapshot.contractedFte},
        ${snapshot.commercialAvailabilityHours},
        ${snapshot.snapshotStatus},
        ${snapshot.confidenceScore},
        ${snapshot.confidenceLabel},
        ${JSON.stringify(snapshot.detail)}::jsonb,
        ${snapshot.materializedAt}::timestamptz,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (snapshot_key)
      DO UPDATE SET
        role_id = EXCLUDED.role_id,
        role_sku = EXCLUDED.role_sku,
        role_code = EXCLUDED.role_code,
        role_label = EXCLUDED.role_label,
        employment_type_code = EXCLUDED.employment_type_code,
        mapping_source = EXCLUDED.mapping_source,
        mapping_source_ref = EXCLUDED.mapping_source_ref,
        source_ref = EXCLUDED.source_ref,
        resolved_currency = EXCLUDED.resolved_currency,
        loaded_cost_amount = EXCLUDED.loaded_cost_amount,
        cost_per_hour_amount = EXCLUDED.cost_per_hour_amount,
        total_labor_cost_amount = EXCLUDED.total_labor_cost_amount,
        direct_overhead_amount = EXCLUDED.direct_overhead_amount,
        shared_overhead_amount = EXCLUDED.shared_overhead_amount,
        contracted_fte = EXCLUDED.contracted_fte,
        commercial_availability_hours = EXCLUDED.commercial_availability_hours,
        snapshot_status = EXCLUDED.snapshot_status,
        confidence_score = EXCLUDED.confidence_score,
        confidence_label = EXCLUDED.confidence_label,
        detail_jsonb = EXCLUDED.detail_jsonb,
        materialized_at = EXCLUDED.materialized_at,
        updated_at = CURRENT_TIMESTAMP
    `.execute(db)
  }
}

const upsertRoleBlendedSnapshots = async (snapshots: RoleBlendedUpsert[]) => {
  const db = await getDb()

  for (const snapshot of snapshots) {
    await sql`
      INSERT INTO greenhouse_commercial.role_blended_cost_basis_snapshots (
        snapshot_key,
        role_id,
        role_sku,
        role_code,
        role_label,
        employment_type_code,
        period_year,
        period_month,
        period_id,
        snapshot_date,
        source_kind,
        source_ref,
        resolved_currency,
        blended_loaded_cost_amount,
        blended_cost_per_hour_amount,
        blended_total_labor_cost_amount,
        blended_direct_overhead_amount,
        blended_shared_overhead_amount,
        weighted_fte,
        weighted_hours,
        sample_size,
        member_count,
        freshest_member_snapshot_at,
        oldest_member_snapshot_at,
        freshness_days,
        freshness_status,
        confidence_score,
        confidence_label,
        snapshot_status,
        detail_jsonb,
        materialized_at,
        updated_at
      ) VALUES (
        ${snapshot.snapshotKey},
        ${snapshot.roleId},
        ${snapshot.roleSku},
        ${snapshot.roleCode},
        ${snapshot.roleLabel},
        ${snapshot.employmentTypeCode},
        ${snapshot.periodYear},
        ${snapshot.periodMonth},
        ${snapshot.periodId},
        ${snapshot.snapshotDate}::date,
        ${snapshot.sourceKind},
        ${snapshot.sourceRef},
        ${snapshot.resolvedCurrency},
        ${snapshot.blendedLoadedCostAmount},
        ${snapshot.blendedCostPerHourAmount},
        ${snapshot.blendedTotalLaborCostAmount},
        ${snapshot.blendedDirectOverheadAmount},
        ${snapshot.blendedSharedOverheadAmount},
        ${snapshot.weightedFte},
        ${snapshot.weightedHours},
        ${snapshot.sampleSize},
        ${snapshot.memberCount},
        ${snapshot.freshestMemberSnapshotAt}::timestamptz,
        ${snapshot.oldestMemberSnapshotAt}::timestamptz,
        ${snapshot.freshnessDays},
        ${snapshot.freshnessStatus},
        ${snapshot.confidenceScore},
        ${snapshot.confidenceLabel},
        ${snapshot.snapshotStatus},
        ${JSON.stringify(snapshot.detail)}::jsonb,
        ${snapshot.materializedAt}::timestamptz,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (snapshot_key)
      DO UPDATE SET
        blended_loaded_cost_amount = EXCLUDED.blended_loaded_cost_amount,
        blended_cost_per_hour_amount = EXCLUDED.blended_cost_per_hour_amount,
        blended_total_labor_cost_amount = EXCLUDED.blended_total_labor_cost_amount,
        blended_direct_overhead_amount = EXCLUDED.blended_direct_overhead_amount,
        blended_shared_overhead_amount = EXCLUDED.blended_shared_overhead_amount,
        weighted_fte = EXCLUDED.weighted_fte,
        weighted_hours = EXCLUDED.weighted_hours,
        sample_size = EXCLUDED.sample_size,
        member_count = EXCLUDED.member_count,
        freshest_member_snapshot_at = EXCLUDED.freshest_member_snapshot_at,
        oldest_member_snapshot_at = EXCLUDED.oldest_member_snapshot_at,
        freshness_days = EXCLUDED.freshness_days,
        freshness_status = EXCLUDED.freshness_status,
        confidence_score = EXCLUDED.confidence_score,
        confidence_label = EXCLUDED.confidence_label,
        snapshot_status = EXCLUDED.snapshot_status,
        detail_jsonb = EXCLUDED.detail_jsonb,
        materialized_at = EXCLUDED.materialized_at,
        updated_at = CURRENT_TIMESTAMP
    `.execute(db)
  }
}

export const materializeMemberRoleCostBasisSnapshotsForPeriod = async (
  year: number,
  month: number
): Promise<MemberRoleCostBasisSnapshot[]> => {
  const snapshots = await buildMemberRoleSnapshots(year, month)

  await upsertMemberRoleSnapshots(snapshots)

  const db = await getDb()

  const result = await sql<MemberRoleSnapshotRow>`
    SELECT *
    FROM greenhouse_commercial.member_role_cost_basis_snapshots
    WHERE period_year = ${year}
      AND period_month = ${month}
    ORDER BY member_id ASC
  `.execute(db)

  return result.rows.map(mapMemberRoleRow)
}

export const materializeRoleBlendedCostBasisSnapshotsForPeriod = async (
  year: number,
  month: number
): Promise<RoleBlendedCostBasisSnapshot[]> => {
  const memberSnapshots = await buildMemberRoleSnapshots(year, month)
  const roleSnapshots = buildRoleBlendedSnapshots(memberSnapshots, year, month)

  await upsertMemberRoleSnapshots(memberSnapshots)
  await upsertRoleBlendedSnapshots(roleSnapshots)

  const db = await getDb()

  const result = await sql<RoleBlendedSnapshotRow>`
    SELECT *
    FROM greenhouse_commercial.role_blended_cost_basis_snapshots
    WHERE period_year = ${year}
      AND period_month = ${month}
    ORDER BY role_sku ASC, employment_type_code ASC
  `.execute(db)

  return result.rows.map(mapRoleBlendedRow)
}

export const materializePeopleCostBasisSnapshotsForPeriod = async (
  year: number,
  month: number
): Promise<{
  memberRoleSnapshots: MemberRoleCostBasisSnapshot[]
  roleBlendedSnapshots: RoleBlendedCostBasisSnapshot[]
}> => {
  const memberSnapshots = await buildMemberRoleSnapshots(year, month)
  const roleSnapshots = buildRoleBlendedSnapshots(memberSnapshots, year, month)

  await upsertMemberRoleSnapshots(memberSnapshots)
  await upsertRoleBlendedSnapshots(roleSnapshots)

  const db = await getDb()

  const [memberResult, roleResult] = await Promise.all([
    sql<MemberRoleSnapshotRow>`
      SELECT *
      FROM greenhouse_commercial.member_role_cost_basis_snapshots
      WHERE period_year = ${year}
        AND period_month = ${month}
      ORDER BY member_id ASC
    `.execute(db),
    sql<RoleBlendedSnapshotRow>`
      SELECT *
      FROM greenhouse_commercial.role_blended_cost_basis_snapshots
      WHERE period_year = ${year}
        AND period_month = ${month}
      ORDER BY role_sku ASC, employment_type_code ASC
    `.execute(db)
  ])

  return {
    memberRoleSnapshots: memberResult.rows.map(mapMemberRoleRow),
    roleBlendedSnapshots: roleResult.rows.map(mapRoleBlendedRow)
  }
}

export const getPreferredRoleBlendedCostBasisByRoleId = async (
  roleId: string,
  employmentTypeCode?: string | null,
  input: { year?: number | null; month?: number | null } = {}
): Promise<RoleBlendedCostBasisSnapshot | null> => {
  const db = await getDb()
  const year = input.year ?? null
  const month = input.month ?? null

  const result = await sql<RoleBlendedSnapshotRow>`
    SELECT snapshot.*
    FROM greenhouse_commercial.role_blended_cost_basis_snapshots AS snapshot
    WHERE snapshot.role_id = ${roleId}
      AND (${employmentTypeCode ?? null}::text IS NULL OR snapshot.employment_type_code = ${employmentTypeCode ?? null})
    ORDER BY
      CASE
        WHEN ${year}::integer IS NOT NULL
         AND ${month}::integer IS NOT NULL
         AND snapshot.period_year = ${year}
         AND snapshot.period_month = ${month}
        THEN 0
        ELSE 1
      END,
      snapshot.period_year DESC,
      snapshot.period_month DESC,
      snapshot.updated_at DESC
    LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapRoleBlendedRow(result.rows[0]) : null
}

export const getPreferredMemberActualCostBasis = async (
  memberId: string,
  input: { year?: number | null; month?: number | null } = {}
): Promise<MemberActualCostBasisSnapshot | null> => {
  const db = await getDb()
  const year = input.year ?? null
  const month = input.month ?? null

  const result = await sql<MemberActualReaderRow>`
    SELECT
      mce.period_year,
      mce.period_month,
      mce.target_currency,
      mce.loaded_cost_target,
      mce.cost_per_hour_target,
      mce.total_labor_cost_target,
      mce.direct_overhead_target,
      mce.shared_overhead_target,
      mce.contracted_fte,
      mce.contracted_hours,
      mce.commercial_availability_hours,
      mce.snapshot_status,
      mce.source_compensation_version_id,
      mce.source_payroll_period_id,
      mce.materialized_at,
      bridge.role_id,
      bridge.role_sku,
      bridge.role_code,
      bridge.role_label,
      bridge.employment_type_code,
      bridge.snapshot_status AS bridge_snapshot_status,
      bridge.confidence_score AS bridge_confidence_score,
      bridge.confidence_label AS bridge_confidence_label,
      bridge.detail_jsonb
    FROM greenhouse_serving.member_capacity_economics mce
    LEFT JOIN greenhouse_commercial.member_role_cost_basis_snapshots bridge
      ON bridge.member_id = mce.member_id
     AND bridge.period_year = mce.period_year
     AND bridge.period_month = mce.period_month
    WHERE mce.member_id = ${memberId}
    ORDER BY
      CASE
        WHEN ${year}::integer IS NOT NULL
         AND ${month}::integer IS NOT NULL
         AND mce.period_year = ${year}
         AND mce.period_month = ${month}
        THEN 0
        ELSE 1
      END,
      mce.period_year DESC,
      mce.period_month DESC
    LIMIT 1
  `.execute(db)

  const row = result.rows[0]

  if (!row) return null

  const periodYear = toNumber(row.period_year)
  const periodMonth = toNumber(row.period_month)
  const snapshotDate = toDateString(row.materialized_at) ?? `${periodYear}-${pad2(periodMonth)}-01`
  const confidenceScore = round4(buildMemberActualConfidence(row.snapshot_status))

  return {
    memberId,
    periodYear,
    periodMonth,
    periodId: getPeriodId(periodYear, periodMonth),
    snapshotDate,
    sourceKind: 'member_actual',
    sourceRef: row.source_payroll_period_id ?? row.source_compensation_version_id ?? null,
    currency: row.target_currency,
    loadedCostAmount: toNullableNumber(row.loaded_cost_target),
    costPerHourAmount: toNullableNumber(row.cost_per_hour_target),
    totalLaborCostAmount: toNullableNumber(row.total_labor_cost_target),
    directOverheadAmount: toNullableNumber(row.direct_overhead_target),
    sharedOverheadAmount: toNullableNumber(row.shared_overhead_target),
    contractedFte: round4(toNumber(row.contracted_fte)),
    contractedHours: round2(toNumber(row.contracted_hours)),
    commercialAvailabilityHours: round2(toNumber(row.commercial_availability_hours)),
    snapshotStatus: row.snapshot_status,
    confidenceScore,
    confidenceLabel: classifyConfidenceLabel(confidenceScore),
    sourceCompensationVersionId: row.source_compensation_version_id,
    sourcePayrollPeriodId: row.source_payroll_period_id,
    roleId: row.role_id,
    roleSku: row.role_sku,
    roleCode: row.role_code,
    roleLabel: row.role_label,
    employmentTypeCode: row.employment_type_code,
    detail: {
      bridgeSnapshotStatus: row.bridge_snapshot_status,
      bridgeConfidenceScore: toNullableNumber(row.bridge_confidence_score),
      bridgeConfidenceLabel: row.bridge_confidence_label,
      bridgeDetail: row.detail_jsonb ?? {}
    }
  }
}
