import 'server-only'

import { query } from '@/lib/db'
import { resolveExitEligibilityForMembers } from '@/lib/payroll/exit-eligibility'

import { listOffboardingCases } from '../store'
import type { OffboardingWorkQueue, OffboardingWorkQueueDocumentSummary, OffboardingWorkQueueFilters, OffboardingWorkQueueSettlementSummary } from './types'
import { buildOffboardingWorkQueueItem, buildOffboardingWorkQueueSummary } from './derivation'

type MemberRow = {
  member_id: string
  display_name: string | null
  primary_email: string | null
  role_title: string | null
  contract_type: string | null
  payroll_via: string | null
  pay_regime: string | null
  identity_profile_id: string | null
  active: boolean | null
}

export type MemberRuntimeSnapshot = {
  memberId: string
  displayName: string | null
  primaryEmail: string | null
  roleTitle: string | null
  contractType: string | null
  payrollVia: string | null
  payRegime: string | null
  identityProfileId: string | null
  active: boolean
}

type SettlementRow = {
  offboarding_case_id: string
  final_settlement_id: string
  settlement_version: number | string
  calculation_status: OffboardingWorkQueueSettlementSummary['calculationStatus']
  readiness_status: OffboardingWorkQueueSettlementSummary['readinessStatus']
  readiness_has_blockers: boolean
  net_payable: number | string
  currency: 'CLP'
  calculated_at: string | Date | null
  approved_at: string | Date | null
}

type DocumentRow = {
  offboarding_case_id: string
  final_settlement_document_id: string
  final_settlement_id: string
  settlement_version: number | string
  document_version: number | string
  document_status: OffboardingWorkQueueDocumentSummary['documentStatus']
  readiness_json: {
    status?: OffboardingWorkQueueDocumentSummary['readinessStatus']
    hasBlockers?: boolean
  } | null
  pdf_asset_id: string | null
  issued_at: string | Date | null
  signed_or_ratified_at: string | Date | null
}

/**
 * Person 360 active legal relationship row per profile (Layer 3 detection).
 * Drift = member declares non-employee contract pero relationship_type='employee'
 * sigue activa. Mirror exacto del query del reliability signal canonical
 * `identity.relationship.member_contract_drift`.
 */
type ActiveLegalRelationshipRow = {
  profile_id: string
  relationship_type: string
}

const toTimestampString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const latestSettlementsByCase = async (caseIds: string[]) => {
  if (caseIds.length === 0) return new Map<string, OffboardingWorkQueueSettlementSummary>()

  const rows = await query<SettlementRow>(
    `
      SELECT DISTINCT ON (offboarding_case_id)
        offboarding_case_id,
        final_settlement_id,
        settlement_version,
        calculation_status,
        readiness_status,
        readiness_has_blockers,
        net_payable,
        currency,
        calculated_at,
        approved_at
      FROM greenhouse_payroll.final_settlements
      WHERE offboarding_case_id = ANY($1::text[])
      ORDER BY offboarding_case_id, settlement_version DESC, created_at DESC
    `,
    [caseIds]
  )

  return new Map(rows.map(row => [
    row.offboarding_case_id,
    {
      finalSettlementId: row.final_settlement_id,
      settlementVersion: Number(row.settlement_version),
      calculationStatus: row.calculation_status,
      readinessStatus: row.readiness_status,
      readinessHasBlockers: Boolean(row.readiness_has_blockers),
      netPayable: Number(row.net_payable),
      currency: row.currency,
      calculatedAt: toTimestampString(row.calculated_at),
      approvedAt: toTimestampString(row.approved_at)
    }
  ]))
}

const latestDocumentsByCase = async (caseIds: string[]) => {
  if (caseIds.length === 0) return new Map<string, OffboardingWorkQueueDocumentSummary>()

  const rows = await query<DocumentRow>(
    `
      SELECT DISTINCT ON (offboarding_case_id)
        offboarding_case_id,
        final_settlement_document_id,
        final_settlement_id,
        settlement_version,
        document_version,
        document_status,
        readiness_json,
        pdf_asset_id,
        issued_at,
        signed_or_ratified_at
      FROM greenhouse_payroll.final_settlement_documents
      WHERE offboarding_case_id = ANY($1::text[])
      ORDER BY offboarding_case_id, settlement_version DESC, document_version DESC, created_at DESC
    `,
    [caseIds]
  )

  return new Map(rows.map(row => [
    row.offboarding_case_id,
    {
      finalSettlementDocumentId: row.final_settlement_document_id,
      finalSettlementId: row.final_settlement_id,
      settlementVersion: Number(row.settlement_version),
      documentVersion: Number(row.document_version),
      documentStatus: row.document_status,
      readinessStatus: row.readiness_json?.status ?? 'blocked',
      readinessHasBlockers: Boolean(row.readiness_json?.hasBlockers),
      pdfAssetId: row.pdf_asset_id,
      isHistoricalForLatestSettlement: false,
      issuedAt: toTimestampString(row.issued_at),
      signedOrRatifiedAt: toTimestampString(row.signed_or_ratified_at)
    }
  ]))
}

/**
 * Fetch member runtime fields needed for closure completeness derivation.
 * Layer 2 (member runtime) + Layer 3 base (identity_profile_id needed for
 * person_legal_entity_relationships JOIN).
 */
const membersRuntimeById = async (memberIds: string[]) => {
  if (memberIds.length === 0) return new Map<string, MemberRuntimeSnapshot>()

  const rows = await query<MemberRow>(
    `
      SELECT
        member_id,
        display_name,
        primary_email,
        role_title,
        contract_type,
        payroll_via,
        pay_regime,
        identity_profile_id,
        active
      FROM greenhouse_core.members
      WHERE member_id = ANY($1::text[])
    `,
    [memberIds]
  )

  return new Map(rows.map(row => [
    row.member_id,
    {
      memberId: row.member_id,
      displayName: row.display_name,
      primaryEmail: row.primary_email,
      roleTitle: row.role_title,
      contractType: row.contract_type,
      payrollVia: row.payroll_via,
      payRegime: row.pay_regime,
      identityProfileId: row.identity_profile_id,
      active: Boolean(row.active)
    }
  ]))
}

/**
 * Fetch active legal relationships per identity profile id. Layer 3 detection
 * mirror del query canonical del reliability signal
 * `identity.relationship.member_contract_drift`. NO duplicate logic — same
 * filter clause (`status='active' AND (effective_to IS NULL OR effective_to > NOW())`).
 *
 * Returns a Map<profileId, relationshipType> con la relacion activa actual.
 * Si un profile tiene >1 active (anomalia), keepea la primera (PG ordering
 * stable). El reliability signal cubre el caso anomalo a nivel sistema.
 */
const activeLegalRelationshipsByProfile = async (profileIds: string[]) => {
  if (profileIds.length === 0) return new Map<string, string>()

  const rows = await query<ActiveLegalRelationshipRow>(
    `
      SELECT profile_id, relationship_type
      FROM greenhouse_core.person_legal_entity_relationships
      WHERE profile_id = ANY($1::text[])
        AND status = 'active'
        AND (effective_to IS NULL OR effective_to > NOW())
    `,
    [profileIds]
  )

  const out = new Map<string, string>()

  for (const row of rows) {
    if (!out.has(row.profile_id)) out.set(row.profile_id, row.relationship_type)
  }

  return out
}

/**
 * Same canonical sets used by the reliability signal — NEVER duplicate the
 * threshold logic in code. Pure data.
 */
const NON_EMPLOYEE_CONTRACT_TYPES = new Set(['contractor', 'eor', 'honorarios'])
const NON_INTERNAL_PAYROLL_VIA = new Set(['deel', 'none'])

/**
 * Layer 3 drift detection (per member). Returns:
 *   - `true`: member declara non-internal contract pero relacion legal activa
 *     sigue como 'employee'. Drift Person 360 — el caso Maria.
 *   - `false`: relacion alineada (member dependent + employee, o contractor +
 *     contractor, etc.) o no aplica (member sin profile).
 *   - `null`: no se pudo determinar (member no encontrado).
 */
export const detectPersonRelationshipDrift = (
  member: MemberRuntimeSnapshot | null,
  activeRelationshipType: string | null
): boolean | null => {
  if (!member) return null
  if (!member.identityProfileId) return false // sin profile, no aplica drift
  if (!activeRelationshipType) return false // sin relacion activa, no hay drift detectable (asume cierre)

  const memberDeclaresNonEmployee =
    NON_EMPLOYEE_CONTRACT_TYPES.has(member.contractType ?? '') ||
    NON_INTERNAL_PAYROLL_VIA.has(member.payrollVia ?? '')

  return memberDeclaresNonEmployee && activeRelationshipType === 'employee'
}

/**
 * Layer 2 alignment detection (per member). Returns:
 *   - `true`: member runtime alineado con expected lane (lane → contract_type/payroll_via mapping)
 *   - `false`: drift entre runtime y case lane
 *   - `null`: lane ambigua o member no encontrado
 *
 * V1.0 informational — el signal de drift Person 360 (Layer 3) es lo que
 * dispara reconcile step. Layer 2 quedará observable para futuras versiones.
 */
export const detectMemberRuntimeAlignment = (
  member: MemberRuntimeSnapshot | null,
  ruleLane: string | null
): boolean | null => {
  if (!member) return null
  if (!ruleLane) return null

  if (ruleLane === 'internal_payroll') {
    return member.payrollVia === 'internal'
  }

  if (ruleLane === 'external_payroll') {
    return member.payrollVia === 'deel' || member.contractType === 'eor'
  }

  if (ruleLane === 'non_payroll') {
    return member.payrollVia === 'none' || member.contractType === 'honorarios'
  }

  return null
}

export const getOffboardingWorkQueue = async (filters: OffboardingWorkQueueFilters = {}): Promise<OffboardingWorkQueue> => {
  const cases = await listOffboardingCases(filters)
  const caseIds = cases.map(item => item.offboardingCaseId)
  const memberIds = Array.from(new Set(cases.map(item => item.memberId).filter(Boolean))) as string[]

  const [settlements, documents, members] = await Promise.all([
    latestSettlementsByCase(caseIds),
    latestDocumentsByCase(caseIds),
    membersRuntimeById(memberIds)
  ])

  // Layer 3 + Layer 4 secondary fetches (depend on members fetch).
  const profileIds = Array.from(
    new Set(
      Array.from(members.values())
        .map(m => m.identityProfileId)
        .filter((id): id is string => Boolean(id))
    )
  )

  const today = new Date().toISOString().slice(0, 10)
  const degradedReasons: string[] = []

  const [activeRelationshipByProfile, payrollEligibilityByMember] = await Promise.all([
    activeLegalRelationshipsByProfile(profileIds).catch(error => {
      degradedReasons.push(
        `layer3_drift_detection_degraded:${error instanceof Error ? error.message : String(error)}`
      )

      return new Map<string, string>()
    }),
    resolveExitEligibilityForMembers(memberIds, today, today).catch(error => {
      degradedReasons.push(
        `layer4_payroll_eligibility_degraded:${error instanceof Error ? error.message : String(error)}`
      )

      return new Map<
        string,
        {
          projectionPolicy:
            | 'full_period'
            | 'partial_until_cutoff'
            | 'exclude_from_cutoff'
            | 'exclude_entire_period'
        }
      >()
    })
  ])

  const items = cases.map(item => {
    const member = item.memberId ? members.get(item.memberId) ?? null : null

    const activeRelationshipType = member?.identityProfileId
      ? activeRelationshipByProfile.get(member.identityProfileId) ?? null
      : null

    const eligibility = item.memberId ? payrollEligibilityByMember.get(item.memberId) ?? null : null

    const payrollExcluded = eligibility
      ? eligibility.projectionPolicy === 'exclude_entire_period' ||
        eligibility.projectionPolicy === 'exclude_from_cutoff'
      : null

    return buildOffboardingWorkQueueItem({
      item,
      collaborator: {
        memberId: item.memberId,
        displayName: member?.displayName ?? null,
        primaryEmail: member?.primaryEmail ?? null,
        roleTitle: member?.roleTitle ?? null
      },
      settlement: settlements.get(item.offboardingCaseId) ?? null,
      document: documents.get(item.offboardingCaseId) ?? null,
      closureFacts: {
        memberRuntimeAligned: detectMemberRuntimeAlignment(member, item.ruleLane),
        personRelationshipDrift: detectPersonRelationshipDrift(member, activeRelationshipType),
        payrollExcluded
      }
    })
  })

  return {
    items,
    summary: buildOffboardingWorkQueueSummary(items),
    generatedAt: new Date().toISOString(),
    degradedReasons
  }
}
