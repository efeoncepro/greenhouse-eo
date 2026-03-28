import 'server-only'

import type {
  CompensationVersion,
  CreateCompensationVersionInput,
  PayrollCompensationMember,
  PayrollCompensationOverview,
  GratificacionLegalMode,
  UpdateCompensationVersionInput
} from '@/types/payroll'

import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { listPayrollCompensationMembers } from '@/lib/payroll/get-payroll-members'
import {
  buildPayrollQueryTypes,
  PayrollValidationError,
  assertPayrollDateString,
  normalizeBoolean,
  normalizeNullableString,
  normalizeString,
  parsePayrollNumber,
  runPayrollQuery,
  toDateString,
  toNullableNumber,
  toNumber,
  toTimestampString
} from '@/lib/payroll/shared'
import {
  getCompensationVersionLockedMessage,
  isCompensationVersionLockedByPayroll
} from '@/lib/payroll/compensation-versioning'
import { getBigQueryProjectId } from '@/lib/bigquery'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'
import {
  isPayrollPostgresEnabled,
  pgGetCurrentCompensation,
  pgGetCompensationHistoryByMember,
  pgGetCompensationVersionById,
  pgGetApplicableCompensationVersionsForPeriod,
  pgCreateCompensationVersion,
  pgUpdateCompensationVersion,
  pgGetCompensationOverview
} from '@/lib/payroll/postgres-store'

const COMPENSATION_MUTATION_TYPES = {
  afpName: 'STRING',
  afpRate: 'FLOAT64',
  healthSystem: 'STRING',
  healthPlanUf: 'FLOAT64',
  unemploymentRate: 'FLOAT64',
  gratificacionLegalMode: 'STRING',
  effectiveTo: 'DATE',
  createdBy: 'STRING'
} as const

type CompensationRow = {
  version_id: string | null
  member_id: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  notion_user_id: string | null
  version: number | string | null
  pay_regime: string | null
  currency: string | null
  base_salary: number | string | null
  remote_allowance: number | string | null
  fixed_bonus_label: string | null
  fixed_bonus_amount: number | string | null
  bonus_otd_min: number | string | null
  bonus_otd_max: number | string | null
  bonus_rpa_min: number | string | null
  bonus_rpa_max: number | string | null
  gratificacion_legal_mode: string | null
  afp_name: string | null
  afp_rate: number | string | null
  health_system: string | null
  health_plan_uf: number | string | null
  unemployment_rate: number | string | null
  contract_type: string | null
  has_apv: boolean | null
  apv_amount: number | string | null
  effective_from: { value?: string } | string | null
  effective_to: { value?: string } | string | null
  is_current: boolean | null
  change_reason: string | null
  created_by: string | null
  created_at: { value?: string } | string | null
}

type ApplicableCompensationRow = CompensationRow & {
  active: boolean | null
}

type CompensationBoundaryRow = {
  version_id: string | null
  effective_from: { value?: string } | string | null
}

type FallbackPayrollMemberRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  notion_user_id: string | null
}

const getProjectId = () => getBigQueryProjectId()

const addDaysToDateString = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00.000Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

const normalizeGratificacionLegalMode = (
  value: string | null | undefined,
  payRegime: 'chile' | 'international'
): GratificacionLegalMode =>
  payRegime === 'international'
    ? 'ninguna'
    : value === 'mensual_25pct' || value === 'anual_proporcional' || value === 'ninguna'
      ? value
      : 'mensual_25pct'

const getCurrentDateString = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago'
  }).format(new Date())

const isCurrentCompensationWindow = ({
  effectiveFrom,
  effectiveTo
}: {
  effectiveFrom: string
  effectiveTo: string | null
}) => {
  const today = getCurrentDateString()

  return effectiveFrom <= today && (!effectiveTo || effectiveTo >= today)
}

const normalizeCompensationVersion = (row: CompensationRow): CompensationVersion => {
  const effectiveFrom = toDateString(row.effective_from) || ''
  const effectiveTo = toDateString(row.effective_to)
  const payRegime = row.pay_regime === 'international' ? 'international' : 'chile'

  return {
    versionId: String(row.version_id || ''),
    memberId: String(row.member_id || ''),
    memberName: String(row.display_name || 'Sin nombre'),
    memberEmail: String(row.email || ''),
    memberAvatarUrl: normalizeNullableString(row.avatar_url) || resolveAvatarPath({ name: row.display_name, email: row.email }),
    notionUserId: normalizeNullableString(row.notion_user_id),
    version: toNumber(row.version),
    payRegime,
    currency: row.currency === 'USD' ? 'USD' : 'CLP',
    baseSalary: toNumber(row.base_salary),
    remoteAllowance: toNumber(row.remote_allowance),
    fixedBonusLabel: normalizeNullableString(row.fixed_bonus_label),
    fixedBonusAmount: toNumber(row.fixed_bonus_amount),
    bonusOtdMin: toNumber(row.bonus_otd_min),
    bonusOtdMax: toNumber(row.bonus_otd_max),
    bonusRpaMin: toNumber(row.bonus_rpa_min),
    bonusRpaMax: toNumber(row.bonus_rpa_max),
    gratificacionLegalMode: normalizeGratificacionLegalMode(row.gratificacion_legal_mode, payRegime),
    afpName: normalizeNullableString(row.afp_name),
    afpRate: toNullableNumber(row.afp_rate),
    healthSystem: row.health_system === 'isapre' ? 'isapre' : row.health_system === 'fonasa' ? 'fonasa' : null,
    healthPlanUf: toNullableNumber(row.health_plan_uf),
    unemploymentRate: toNumber(row.unemployment_rate),
    contractType: row.contract_type === 'plazo_fijo' ? 'plazo_fijo' : 'indefinido',
    hasApv: normalizeBoolean(row.has_apv),
    apvAmount: toNumber(row.apv_amount),
    effectiveFrom,
    effectiveTo,
    isCurrent: effectiveFrom ? isCurrentCompensationWindow({ effectiveFrom, effectiveTo }) : normalizeBoolean(row.is_current),
    changeReason: normalizeNullableString(row.change_reason),
    createdBy: normalizeNullableString(row.created_by),
    createdAt: toTimestampString(row.created_at)
  }
}

type CompensationValueInput = Omit<CreateCompensationVersionInput, 'memberId'>

const assertCompensationValues = (input: CompensationValueInput | UpdateCompensationVersionInput) => {
  if (!normalizeString(input.changeReason)) {
    throw new PayrollValidationError('changeReason is required.')
  }

  if (
    input.gratificacionLegalMode !== undefined &&
    input.gratificacionLegalMode !== 'mensual_25pct' &&
    input.gratificacionLegalMode !== 'anual_proporcional' &&
    input.gratificacionLegalMode !== 'ninguna'
  ) {
    throw new PayrollValidationError(
      'gratificacionLegalMode must be one of mensual_25pct, anual_proporcional, or ninguna.'
    )
  }

  assertPayrollDateString(input.effectiveFrom, 'effectiveFrom')
  parsePayrollNumber(input.baseSalary, 'baseSalary', { min: 0 })
  parsePayrollNumber(input.remoteAllowance ?? 0, 'remoteAllowance', { min: 0 })
  parsePayrollNumber(input.fixedBonusAmount ?? 0, 'fixedBonusAmount', { min: 0 })
  parsePayrollNumber(input.bonusOtdMin ?? 0, 'bonusOtdMin', { min: 0 })
  parsePayrollNumber(input.bonusOtdMax ?? 0, 'bonusOtdMax', { min: 0 })
  parsePayrollNumber(input.bonusRpaMin ?? 0, 'bonusRpaMin', { min: 0 })
  parsePayrollNumber(input.bonusRpaMax ?? 0, 'bonusRpaMax', { min: 0 })
  parsePayrollNumber(input.apvAmount ?? 0, 'apvAmount', { min: 0 })

  if (input.afpRate !== undefined && input.afpRate !== null) {
    parsePayrollNumber(input.afpRate, 'afpRate', { min: 0, max: 1 })
  }

  if (input.healthPlanUf !== undefined && input.healthPlanUf !== null) {
    parsePayrollNumber(input.healthPlanUf, 'healthPlanUf', { min: 0 })
  }

  if (input.unemploymentRate !== undefined && input.unemploymentRate !== null) {
    parsePayrollNumber(input.unemploymentRate, 'unemploymentRate', { min: 0, max: 1 })
  }

  if (Number(input.bonusOtdMax ?? 0) < Number(input.bonusOtdMin ?? 0)) {
    throw new PayrollValidationError('bonusOtdMax must be greater than or equal to bonusOtdMin.')
  }

  if (Number(input.bonusRpaMax ?? 0) < Number(input.bonusRpaMin ?? 0)) {
    throw new PayrollValidationError('bonusRpaMax must be greater than or equal to bonusRpaMin.')
  }
}

const assertCompensationInput = (input: CreateCompensationVersionInput) => {
  if (!normalizeString(input.memberId)) {
    throw new PayrollValidationError('memberId is required.')
  }

  assertCompensationValues(input)
}

const assertCompensationUpdateInput = (input: UpdateCompensationVersionInput) => {
  assertCompensationValues(input)
}

export const getCurrentCompensation = async () => {
  if (isPayrollPostgresEnabled()) {
    return pgGetCurrentCompensation()
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const rows = await runPayrollQuery<CompensationRow>(
    `
      SELECT
        cv.*,
        m.display_name,
        m.email,
        m.avatar_url,
        m.notion_user_id
      FROM \`${projectId}.greenhouse.compensation_versions\` AS cv
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = cv.member_id
      WHERE m.active = TRUE
        AND cv.effective_from <= CURRENT_DATE('America/Santiago')
        AND (cv.effective_to IS NULL OR cv.effective_to >= CURRENT_DATE('America/Santiago'))
      ORDER BY m.display_name ASC
    `
  )

  return rows.map(normalizeCompensationVersion)
}

const listFallbackPayrollMembers = async (): Promise<PayrollCompensationMember[]> => {
  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const rows = await runPayrollQuery<FallbackPayrollMemberRow>(
    `
      SELECT
        member_id,
        display_name,
        email,
        avatar_url,
        notion_user_id
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE active = TRUE
      ORDER BY display_name ASC
    `
  )

  return rows.map(row => ({
    memberId: String(row.member_id || ''),
    memberName: String(row.display_name || 'Sin nombre'),
    memberEmail: String(row.email || ''),
    memberAvatarUrl: normalizeNullableString(row.avatar_url) || resolveAvatarPath({ name: row.display_name, email: row.email }),
    notionUserId: normalizeNullableString(row.notion_user_id),
    active: true,
    hasCurrentCompensation: false,
    hasCompensationHistory: false,
    compensationVersionCount: 0,
    currentCompensationVersionId: null,
    currentCompensationEffectiveFrom: null,
    currentPayRegime: null,
    currentCurrency: null
  }))
}

const mergeCurrentCompensationIntoMembers = ({
  members,
  compensations
}: {
  members: PayrollCompensationMember[]
  compensations: CompensationVersion[]
}) => {
  const currentCompensationByMember = new Map(compensations.map(compensation => [compensation.memberId, compensation]))

  return members.map(member => {
    const currentCompensation = currentCompensationByMember.get(member.memberId)

    if (!currentCompensation) {
      return member
    }

    return {
      ...member,
      hasCurrentCompensation: true,
      hasCompensationHistory: member.hasCompensationHistory || true,
      compensationVersionCount: Math.max(member.compensationVersionCount, 1),
      currentCompensationVersionId: currentCompensation.versionId,
      currentCompensationEffectiveFrom: currentCompensation.effectiveFrom,
      currentPayRegime: currentCompensation.payRegime,
      currentCurrency: currentCompensation.currency
    }
  })
}

export const getCompensationOverview = async (): Promise<PayrollCompensationOverview> => {
  if (isPayrollPostgresEnabled()) {
    return pgGetCompensationOverview()
  }

  const [compensationsResult, membersResult] = await Promise.allSettled([
    getCurrentCompensation(),
    listPayrollCompensationMembers()
  ])

  const compensations = compensationsResult.status === 'fulfilled' ? compensationsResult.value : []

  if (compensationsResult.status === 'rejected') {
    console.error('Unable to load current payroll compensations.', compensationsResult.reason)
  }

  let members =
    membersResult.status === 'fulfilled'
      ? membersResult.value
      : await listFallbackPayrollMembers()

  if (membersResult.status === 'rejected') {
    console.error('Unable to load payroll compensation members.', membersResult.reason)
  }

  members = mergeCurrentCompensationIntoMembers({ members, compensations })
  const eligibleMembers = members.filter(member => !member.hasCurrentCompensation)

  return {
    compensations,
    eligibleMembers,
    members,
    summary: {
      activeMembers: members.length,
      activeCompensations: compensations.length,
      eligibleMembers: eligibleMembers.length
    }
  }
}

export const getCompensationHistoryByMember = async (memberId: string) => {
  if (isPayrollPostgresEnabled()) {
    return pgGetCompensationHistoryByMember(memberId)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const rows = await runPayrollQuery<CompensationRow>(
    `
      SELECT
        cv.*,
        m.display_name,
        m.email,
        m.avatar_url,
        m.notion_user_id
      FROM \`${projectId}.greenhouse.compensation_versions\` AS cv
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = cv.member_id
      WHERE cv.member_id = @memberId
      ORDER BY cv.effective_from DESC, cv.version DESC
    `,
    { memberId }
  )

  return rows.map(normalizeCompensationVersion)
}

export const getCompensationVersionById = async (versionId: string) => {
  if (isPayrollPostgresEnabled()) {
    return pgGetCompensationVersionById(versionId)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const [row] = await runPayrollQuery<CompensationRow>(
    `
      SELECT
        cv.*,
        m.display_name,
        m.email,
        m.avatar_url,
        m.notion_user_id
      FROM \`${projectId}.greenhouse.compensation_versions\` AS cv
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = cv.member_id
      WHERE cv.version_id = @versionId
      LIMIT 1
    `,
    { versionId }
  )

  return row ? normalizeCompensationVersion(row) : null
}

export const getApplicableCompensationVersionsForPeriod = async (periodStart: string, periodEnd: string) => {
  if (isPayrollPostgresEnabled()) {
    return pgGetApplicableCompensationVersionsForPeriod(periodStart, periodEnd)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const rows = await runPayrollQuery<ApplicableCompensationRow>(
    `
      SELECT * EXCEPT(row_num)
      FROM (
        SELECT
          cv.version_id,
          cv.member_id,
          m.display_name,
          m.email,
          m.avatar_url,
          m.notion_user_id,
          cv.version,
          cv.pay_regime,
          cv.currency,
          cv.base_salary,
          cv.remote_allowance,
          cv.bonus_otd_min,
          cv.bonus_otd_max,
          cv.bonus_rpa_min,
          cv.bonus_rpa_max,
          cv.gratificacion_legal_mode,
          cv.afp_name,
          cv.afp_rate,
          cv.health_system,
          cv.health_plan_uf,
          cv.unemployment_rate,
          cv.contract_type,
          cv.has_apv,
          cv.apv_amount,
          cv.effective_from,
          cv.effective_to,
          cv.is_current,
          cv.change_reason,
          cv.created_by,
          cv.created_at,
          m.active,
          ROW_NUMBER() OVER (
            PARTITION BY m.member_id
            ORDER BY cv.effective_from DESC, cv.version DESC
          ) AS row_num
        FROM \`${projectId}.greenhouse.team_members\` AS m
        LEFT JOIN \`${projectId}.greenhouse.compensation_versions\` AS cv
          ON cv.member_id = m.member_id
         AND cv.effective_from <= DATE(@periodEnd)
         AND (cv.effective_to IS NULL OR cv.effective_to >= DATE(@periodStart))
        WHERE m.active = TRUE
      )
      WHERE row_num = 1
      ORDER BY display_name ASC
    `,
    {
      periodStart,
      periodEnd
    }
  )

  return rows.map(row => ({
    ...normalizeCompensationVersion(row),
    hasCompensationVersion: Boolean(row.version_id)
  }))
}

export const createCompensationVersion = async ({
  input,
  actorEmail
}: {
  input: CreateCompensationVersionInput
  actorEmail: string | null
}) => {
  if (isPayrollPostgresEnabled()) {
    await pgCreateCompensationVersion({ input, actorEmail })
    const [created] = await pgGetCompensationHistoryByMember(input.memberId)

    if (!created) {
      throw new PayrollValidationError('Unable to read newly created compensation version.', 500)
    }

    return created
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  assertCompensationInput(input)
  const effectiveFrom = assertPayrollDateString(input.effectiveFrom, 'effectiveFrom')

  const memberRows = await runPayrollQuery<{ member_id: string | null }>(
    `
      SELECT member_id
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @memberId
        AND active = TRUE
      LIMIT 1
    `,
    { memberId: input.memberId }
  )

  if (memberRows.length === 0) {
    throw new PayrollValidationError('Active team member not found for compensation version.', 404)
  }

  const [currentVersionRow] = await runPayrollQuery<{ next_version: number | string | null }>(
    `
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM \`${projectId}.greenhouse.compensation_versions\`
      WHERE member_id = @memberId
    `,
    { memberId: input.memberId }
  )

  const nextVersion = toNumber(currentVersionRow?.next_version)
  const versionId = `${input.memberId}_v${nextVersion}`
  const today = getCurrentDateString()

  const [sameEffectiveDate] = await runPayrollQuery<{ version_id: string | null }>(
    `
      SELECT version_id
      FROM \`${projectId}.greenhouse.compensation_versions\`
      WHERE member_id = @memberId
        AND effective_from = DATE(@effectiveFrom)
      LIMIT 1
    `,
    {
      memberId: input.memberId,
      effectiveFrom
    }
  )

  if (sameEffectiveDate?.version_id) {
    throw new PayrollValidationError('A compensation version already exists for that effectiveFrom date.', 409, {
      versionId: sameEffectiveDate.version_id
    })
  }

  const [coveringVersion] = await runPayrollQuery<CompensationBoundaryRow>(
    `
      SELECT version_id, effective_from, effective_to
      FROM \`${projectId}.greenhouse.compensation_versions\`
      WHERE member_id = @memberId
        AND effective_from <= DATE(@effectiveFrom)
        AND (effective_to IS NULL OR effective_to >= DATE(@effectiveFrom))
      ORDER BY effective_from DESC, version DESC
      LIMIT 1
    `,
    {
      memberId: input.memberId,
      effectiveFrom
    }
  )

  const [nextScheduledVersion] = await runPayrollQuery<CompensationBoundaryRow>(
    `
      SELECT version_id, effective_from, effective_to
      FROM \`${projectId}.greenhouse.compensation_versions\`
      WHERE member_id = @memberId
        AND effective_from > DATE(@effectiveFrom)
      ORDER BY effective_from ASC, version ASC
      LIMIT 1
    `,
    {
      memberId: input.memberId,
      effectiveFrom
    }
  )

  const nextScheduledEffectiveFrom = toDateString(nextScheduledVersion?.effective_from ?? null)

  const nextEffectiveTo =
    nextScheduledEffectiveFrom && nextScheduledEffectiveFrom > effectiveFrom
      ? addDaysToDateString(nextScheduledEffectiveFrom, -1)
      : null

  const isCurrent = effectiveFrom <= today && (!nextScheduledEffectiveFrom || nextScheduledEffectiveFrom > today)

  if (coveringVersion?.version_id) {
    await runPayrollQuery(
      `
        UPDATE \`${projectId}.greenhouse.compensation_versions\`
        SET
          effective_to = DATE_SUB(DATE(@effectiveFrom), INTERVAL 1 DAY),
          is_current = CASE
            WHEN DATE(@effectiveFrom) <= CURRENT_DATE('America/Santiago') THEN FALSE
            ELSE is_current
          END
        WHERE version_id = @versionId
      `,
      {
        versionId: coveringVersion.version_id,
        effectiveFrom
      }
    )
  }

  const createParams = {
    versionId,
    memberId: input.memberId,
    version: nextVersion,
    payRegime: input.payRegime,
    currency: input.currency,
    baseSalary: Number(input.baseSalary),
    remoteAllowance: Number(input.remoteAllowance ?? 0),
    fixedBonusLabel: normalizeNullableString(input.fixedBonusLabel),
    fixedBonusAmount: Number(input.fixedBonusAmount ?? 0),
    bonusOtdMin: Number(input.bonusOtdMin ?? 0),
    bonusOtdMax: Number(input.bonusOtdMax ?? 0),
    bonusRpaMin: Number(input.bonusRpaMin ?? 0),
    bonusRpaMax: Number(input.bonusRpaMax ?? 0),
    gratificacionLegalMode: normalizeGratificacionLegalMode(input.gratificacionLegalMode ?? null, input.payRegime),
    afpName: normalizeNullableString(input.afpName),
    afpRate: input.afpRate ?? null,
    healthSystem: input.healthSystem ?? null,
    healthPlanUf: input.healthPlanUf ?? null,
    unemploymentRate: input.unemploymentRate ?? (input.contractType === 'plazo_fijo' ? 0.03 : 0.006),
    contractType: input.contractType ?? 'indefinido',
    hasApv: Boolean(input.hasApv),
    apvAmount: Number(input.apvAmount ?? 0),
    effectiveFrom,
    effectiveTo: nextEffectiveTo,
    isCurrent,
    changeReason: input.changeReason.trim(),
    createdBy: actorEmail
  }

  await runPayrollQuery(
    `
      INSERT INTO \`${projectId}.greenhouse.compensation_versions\` (
        version_id,
        member_id,
        version,
        pay_regime,
        currency,
        base_salary,
        remote_allowance,
        fixed_bonus_label,
        fixed_bonus_amount,
        bonus_otd_min,
        bonus_otd_max,
        bonus_rpa_min,
        bonus_rpa_max,
        gratificacion_legal_mode,
        afp_name,
        afp_rate,
        health_system,
        health_plan_uf,
        unemployment_rate,
        contract_type,
        has_apv,
        apv_amount,
        effective_from,
        effective_to,
        is_current,
        change_reason,
        created_by,
        created_at
      )
      VALUES (
        @versionId,
        @memberId,
        @version,
        @payRegime,
        @currency,
        @baseSalary,
        @remoteAllowance,
        @fixedBonusLabel,
        @fixedBonusAmount,
        @bonusOtdMin,
        @bonusOtdMax,
        @bonusRpaMin,
        @bonusRpaMax,
        @gratificacionLegalMode,
        @afpName,
        @afpRate,
        @healthSystem,
        @healthPlanUf,
        @unemploymentRate,
        @contractType,
        @hasApv,
        @apvAmount,
        DATE(@effectiveFrom),
        @effectiveTo,
        @isCurrent,
        @changeReason,
        @createdBy,
        CURRENT_TIMESTAMP()
      )
    `,
    createParams,
    buildPayrollQueryTypes(createParams, COMPENSATION_MUTATION_TYPES)
  )

  const [created] = await getCompensationHistoryByMember(input.memberId)

  if (!created) {
    throw new PayrollValidationError('Unable to read newly created compensation version.', 500)
  }

  return created
}

export const updateCompensationVersion = async ({
  versionId,
  input,
  actorEmail: _actorEmail
}: {
  versionId: string
  input: UpdateCompensationVersionInput
  actorEmail: string | null
}) => {
  if (isPayrollPostgresEnabled()) {
    return pgUpdateCompensationVersion({ versionId, input, actorEmail: _actorEmail })
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  assertCompensationUpdateInput(input)
  const effectiveFrom = assertPayrollDateString(input.effectiveFrom, 'effectiveFrom')

  const [existingVersion] = await runPayrollQuery<CompensationRow>(
    `
      SELECT
        cv.*,
        m.display_name,
        m.email,
        m.avatar_url,
        m.notion_user_id
      FROM \`${projectId}.greenhouse.compensation_versions\` AS cv
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = cv.member_id
      WHERE cv.version_id = @versionId
      LIMIT 1
    `,
    { versionId }
  )

  if (!existingVersion?.version_id) {
    throw new PayrollValidationError('Compensation version not found.', 404)
  }

  const normalizedExisting = normalizeCompensationVersion(existingVersion)

  if (normalizedExisting.effectiveFrom !== effectiveFrom) {
    throw new PayrollValidationError(
      'Changing the effective date requires creating a new compensation version.',
      409,
      { versionId }
    )
  }

  const usedStatuses = await runPayrollQuery<{ status: string | null }>(
    `
      SELECT DISTINCT p.status
      FROM \`${projectId}.greenhouse.payroll_entries\` AS e
      INNER JOIN \`${projectId}.greenhouse.payroll_periods\` AS p
        ON p.period_id = e.period_id
      WHERE e.compensation_version_id = @versionId
    `,
    { versionId }
  )

  if (
    isCompensationVersionLockedByPayroll(
      usedStatuses.map(row =>
        row.status === 'approved' || row.status === 'exported' || row.status === 'calculated'
          ? row.status
          : 'draft'
      )
    )
  ) {
    throw new PayrollValidationError(
      getCompensationVersionLockedMessage(),
      409,
      { versionId }
    )
  }

  const updateParams = {
    versionId,
    payRegime: input.payRegime,
    currency: input.currency,
    baseSalary: Number(input.baseSalary),
    remoteAllowance: Number(input.remoteAllowance ?? 0),
    fixedBonusLabel: normalizeNullableString(input.fixedBonusLabel),
    fixedBonusAmount: Number(input.fixedBonusAmount ?? 0),
    bonusOtdMin: Number(input.bonusOtdMin ?? 0),
    bonusOtdMax: Number(input.bonusOtdMax ?? 0),
    bonusRpaMin: Number(input.bonusRpaMin ?? 0),
    bonusRpaMax: Number(input.bonusRpaMax ?? 0),
    gratificacionLegalMode: normalizeGratificacionLegalMode(input.gratificacionLegalMode ?? null, input.payRegime),
    afpName: normalizeNullableString(input.afpName),
    afpRate: input.afpRate ?? null,
    healthSystem: input.healthSystem ?? null,
    healthPlanUf: input.healthPlanUf ?? null,
    unemploymentRate: input.unemploymentRate ?? (input.contractType === 'plazo_fijo' ? 0.03 : 0.006),
    contractType: input.contractType ?? 'indefinido',
    hasApv: Boolean(input.hasApv),
    apvAmount: Number(input.apvAmount ?? 0),
    changeReason: input.changeReason.trim()
  }

  await runPayrollQuery(
    `
      UPDATE \`${projectId}.greenhouse.compensation_versions\`
      SET
        pay_regime = @payRegime,
        currency = @currency,
        base_salary = @baseSalary,
        remote_allowance = @remoteAllowance,
        fixed_bonus_label = @fixedBonusLabel,
        fixed_bonus_amount = @fixedBonusAmount,
        bonus_otd_min = @bonusOtdMin,
        bonus_otd_max = @bonusOtdMax,
        bonus_rpa_min = @bonusRpaMin,
        bonus_rpa_max = @bonusRpaMax,
        gratificacion_legal_mode = @gratificacionLegalMode,
        afp_name = @afpName,
        afp_rate = @afpRate,
        health_system = @healthSystem,
        health_plan_uf = @healthPlanUf,
        unemployment_rate = @unemploymentRate,
        contract_type = @contractType,
        has_apv = @hasApv,
        apv_amount = @apvAmount,
        change_reason = @changeReason
      WHERE version_id = @versionId
    `,
    updateParams,
    buildPayrollQueryTypes(updateParams, COMPENSATION_MUTATION_TYPES)
  )

  const updated = await getCompensationVersionById(versionId)

  if (!updated) {
    throw new PayrollValidationError('Unable to read updated compensation version.', 500)
  }

  return updated
}
