import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolvePersonIdentifier } from '@/lib/person-360/resolve-eo-id'

// ── Types ──

export interface PersonHrContext {
  identityProfileId: string
  eoId: string
  memberId: string
  displayName: string
  email: string | null
  departmentName: string | null
  jobLevel: string | null
  employmentType: string | null
  hireDate: string | null
  contractEndDate: string | null
  dailyRequired: boolean
  contractType?: string | null
  payRegime?: string | null
  payrollVia?: string | null
  deelContractId?: string | null
  offboarding: {
    offboardingCaseId: string
    publicId: string
    status: string
    ruleLane: string
    effectiveDate: string | null
    lastWorkingDay: string | null
  } | null
  relationshipTimeline: Array<{
    relationshipId: string
    publicId: string
    relationshipType: string
    relationshipSubtype: string | null
    status: string
    roleLabel: string | null
    effectiveFrom: string
    effectiveTo: string | null
  }>
  supervisorMemberId: string | null
  supervisorName: string | null
  compensation: {
    payRegime: string | null
    currency: string | null
    baseSalary: number | null
    contractType: string | null
  }
  leave: {
    vacationAllowance: number
    vacationCarried: number
    vacationUsed: number
    vacationReserved: number
    vacationAvailable: number
    personalAllowance: number
    personalUsed: number
    pendingRequests: number
    approvedRequestsThisYear: number
    totalApprovedDaysThisYear: number
  }
}

// ── Row type ──

type HrRow = {
  identity_profile_id: string
  eo_id: string
  member_id: string
  resolved_display_name: string
  member_email: string | null
  department_name: string | null
  job_level: string | null
  employment_type: string | null
  hire_date: string | null
  contract_end_date: string | null
  daily_required: boolean | null
  contract_type: string | null
  pay_regime: string | null
  payroll_via: string | null
  deel_contract_id: string | null
  reports_to_member_id: string | null
  supervisor_name: string | null
  vacation_allowance: string | number
  vacation_carried: string | number
  vacation_used: string | number
  vacation_reserved: string | number
  vacation_available: string | number
  personal_allowance: string | number
  personal_used: string | number
  pending_requests: string | number
  approved_requests_this_year: string | number
  total_approved_days_this_year: string | number
  compensation_pay_regime: string | null
  comp_currency: string | null
  base_salary: string | null
  compensation_contract_type: string | null
}

type OffboardingRow = {
  offboarding_case_id: string
  public_id: string
  status: string
  rule_lane: string
  effective_date: string | null
  last_working_day: string | null
}

type RelationshipRow = {
  relationship_id: string
  public_id: string
  relationship_type: string
  relationship_subtype: string | null
  status: string
  role_label: string | null
  effective_from: string | null
  effective_to: string | null
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);



return Number.isFinite(n) ? n : 0 }

  return 0
}

const toDateStr = (v: string | null): string | null =>
  v ? v.slice(0, 10) : null

// ── Main function ──

export const getPersonHrContext = async (identifier: string): Promise<PersonHrContext | null> => {
  const resolved = await resolvePersonIdentifier(identifier)
  const lookupId = resolved?.memberId ?? identifier

  const rows = await runGreenhousePostgresQuery<HrRow>(
    `SELECT * FROM greenhouse_serving.person_hr_360
     WHERE member_id = $1
     LIMIT 1`,
    [lookupId]
  )

  const row = rows[0]

  if (!row) return null

  const offboardingRows = await runGreenhousePostgresQuery<OffboardingRow>(
    `
      SELECT
        offboarding_case_id,
        public_id,
        status,
        rule_lane,
        effective_date,
        last_working_day
      FROM greenhouse_hr.work_relationship_offboarding_cases
      WHERE member_id = $1
        AND status NOT IN ('executed', 'cancelled')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [row.member_id]
  )

  const offboarding = offboardingRows[0] ?? null

  const relationshipRows = await runGreenhousePostgresQuery<RelationshipRow>(
    `
      SELECT
        relationship_id,
        public_id,
        relationship_type,
        metadata_json->>'relationshipSubtype' AS relationship_subtype,
        status,
        role_label,
        effective_from::text,
        effective_to::text
      FROM greenhouse_core.person_legal_entity_relationships
      WHERE profile_id = $1
        AND relationship_type IN ('employee', 'contractor', 'executive')
      ORDER BY
        CASE WHEN status = 'active' AND effective_to IS NULL THEN 0 ELSE 1 END,
        effective_from DESC,
        created_at DESC
      LIMIT 10
    `,
    [row.identity_profile_id]
  )

  return {
    identityProfileId: row.identity_profile_id,
    eoId: row.eo_id,
    memberId: row.member_id,
    displayName: row.resolved_display_name,
    email: row.member_email,
    departmentName: row.department_name,
    jobLevel: row.job_level,
    employmentType: row.employment_type,
    hireDate: toDateStr(row.hire_date),
    contractEndDate: toDateStr(row.contract_end_date),
    dailyRequired: row.daily_required ?? true,
    contractType: row.contract_type,
    payRegime: row.pay_regime,
    payrollVia: row.payroll_via,
    deelContractId: row.deel_contract_id,
    offboarding: offboarding
      ? {
          offboardingCaseId: offboarding.offboarding_case_id,
          publicId: offboarding.public_id,
          status: offboarding.status,
          ruleLane: offboarding.rule_lane,
          effectiveDate: toDateStr(offboarding.effective_date),
          lastWorkingDay: toDateStr(offboarding.last_working_day)
        }
      : null,
    relationshipTimeline: relationshipRows.map(relationship => ({
      relationshipId: relationship.relationship_id,
      publicId: relationship.public_id,
      relationshipType: relationship.relationship_type,
      relationshipSubtype: relationship.relationship_subtype,
      status: relationship.status,
      roleLabel: relationship.role_label,
      effectiveFrom: toDateStr(relationship.effective_from) ?? '',
      effectiveTo: toDateStr(relationship.effective_to)
    })),
    supervisorMemberId: row.reports_to_member_id,
    supervisorName: row.supervisor_name,
    compensation: {
      payRegime: row.compensation_pay_regime ?? row.pay_regime,
      currency: row.comp_currency,
      baseSalary: row.base_salary ? toNum(row.base_salary) : null,
      contractType: row.compensation_contract_type ?? row.contract_type
    },
    leave: {
      vacationAllowance: toNum(row.vacation_allowance),
      vacationCarried: toNum(row.vacation_carried),
      vacationUsed: toNum(row.vacation_used),
      vacationReserved: toNum(row.vacation_reserved),
      vacationAvailable: toNum(row.vacation_available),
      personalAllowance: toNum(row.personal_allowance),
      personalUsed: toNum(row.personal_used),
      pendingRequests: toNum(row.pending_requests),
      approvedRequestsThisYear: toNum(row.approved_requests_this_year),
      totalApprovedDaysThisYear: toNum(row.total_approved_days_this_year)
    }
  }
}
