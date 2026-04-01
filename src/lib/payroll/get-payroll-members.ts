import 'server-only'

import type { PayrollCompensationMember, PayrollCurrency, PayrollMemberSummary, PayRegime } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { normalizeBoolean, normalizeNullableString, runPayrollQuery, toDateString, toNumber } from '@/lib/payroll/shared'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'
import {
  isPayrollPostgresEnabled,
  pgGetPayrollMemberSummary,
  pgListPayrollCompensationMembers
} from '@/lib/payroll/postgres-store'

type PayrollMemberRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  notion_user_id: string | null
  active: boolean | null
}

type PayrollCompensationMemberRow = PayrollMemberRow & {
  compensation_version_count: number | string | null
  current_version_id: string | null
  current_effective_from: { value?: string } | string | null
  current_pay_regime: string | null
  current_currency: string | null
}

const getProjectId = () => getBigQueryProjectId()

const normalizePayRegime = (value: string | null): PayRegime | null => {
  if (value === 'chile' || value === 'international') {
    return value
  }

  return null
}

const normalizePayrollCurrency = (value: string | null): PayrollCurrency | null => {
  if (value === 'CLP' || value === 'USD') {
    return value
  }

  return null
}

const normalizePayrollMemberSummary = (row: PayrollMemberRow): PayrollMemberSummary => ({
  memberId: String(row.member_id || ''),
  memberName: String(row.display_name || 'Sin nombre'),
  memberEmail: String(row.email || ''),
  memberAvatarUrl: normalizeNullableString(row.avatar_url) || resolveAvatarPath({ name: row.display_name, email: row.email }),
  notionUserId: normalizeNullableString(row.notion_user_id),
  active: normalizeBoolean(row.active)
})

const normalizeCompensationMember = (row: PayrollCompensationMemberRow): PayrollCompensationMember => {
  const compensationVersionCount = toNumber(row.compensation_version_count)
  const currentCompensationVersionId = normalizeNullableString(row.current_version_id)

  return {
    ...normalizePayrollMemberSummary(row),
    hasCurrentCompensation: Boolean(currentCompensationVersionId),
    hasCompensationHistory: compensationVersionCount > 0,
    compensationVersionCount,
    currentCompensationVersionId,
    currentCompensationEffectiveFrom: toDateString(row.current_effective_from),
    currentContractType: null,
    currentPayRegime: normalizePayRegime(row.current_pay_regime),
    currentPayrollVia: normalizePayRegime(row.current_pay_regime) === 'international' ? 'deel' : normalizePayRegime(row.current_pay_regime) === 'chile' ? 'internal' : null,
    currentScheduleRequired: null,
    currentDeelContractId: null,
    currentContractEndDate: null,
    currentCurrency: normalizePayrollCurrency(row.current_currency)
  }
}

export const getPayrollMemberSummary = async (memberId: string): Promise<PayrollMemberSummary | null> => {
  if (isPayrollPostgresEnabled()) {
    return pgGetPayrollMemberSummary(memberId)
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const [row] = await runPayrollQuery<PayrollMemberRow>(
    `
      SELECT
        member_id,
        display_name,
        email,
        avatar_url,
        notion_user_id,
        active
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @memberId
      LIMIT 1
    `,
    { memberId }
  )

  return row ? normalizePayrollMemberSummary(row) : null
}

export const listPayrollCompensationMembers = async (): Promise<PayrollCompensationMember[]> => {
  if (isPayrollPostgresEnabled()) {
    return pgListPayrollCompensationMembers()
  }

  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const rows = await runPayrollQuery<PayrollCompensationMemberRow>(
    `
      WITH compensation_counts AS (
        SELECT
          member_id,
          COUNT(*) AS compensation_version_count
        FROM \`${projectId}.greenhouse.compensation_versions\`
        GROUP BY member_id
      ),
      current_compensation AS (
        SELECT * EXCEPT(row_num)
        FROM (
          SELECT
            member_id,
            version_id AS current_version_id,
            effective_from AS current_effective_from,
            pay_regime AS current_pay_regime,
            currency AS current_currency,
            ROW_NUMBER() OVER (
              PARTITION BY member_id
              ORDER BY effective_from DESC, version DESC
            ) AS row_num
          FROM \`${projectId}.greenhouse.compensation_versions\`
          WHERE effective_from <= CURRENT_DATE('America/Santiago')
            AND (effective_to IS NULL OR effective_to >= CURRENT_DATE('America/Santiago'))
        )
        WHERE row_num = 1
      )
      SELECT
        m.member_id,
        m.display_name,
        m.email,
        m.avatar_url,
        m.notion_user_id,
        m.active,
        counts.compensation_version_count,
        current.current_version_id,
        current.current_effective_from,
        current.current_pay_regime,
        current.current_currency
      FROM \`${projectId}.greenhouse.team_members\` AS m
      LEFT JOIN compensation_counts AS counts
        ON counts.member_id = m.member_id
      LEFT JOIN current_compensation AS current
        ON current.member_id = m.member_id
      WHERE m.active = TRUE
      ORDER BY m.display_name ASC
    `
  )

  return rows.map(normalizeCompensationMember)
}
