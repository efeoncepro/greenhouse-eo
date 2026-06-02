import 'server-only'

import { getActiveContractorEngagementForProfile } from '@/lib/contractor-engagements/self-service-projection'
import { isTerminalEngagementStatus } from '@/lib/contractor-engagements/state-machine'

import { resolveActivePersonLegalEntityRelationships } from './person-legal-entity-relationships'

/**
 * TASK-957 Slice B — Canonical resolver of CURRENT work classification.
 *
 * SSOT discipline (3-skill verdict 2026-05-30: finance + payroll + arch):
 * `member.contract_type` is the EMPLOYMENT contract type — it becomes employment
 * HISTORY once the employment relationship ends. The SSOT of "what is this person
 * NOW" is the active `person_legal_entity_relationship` + its `ContractorEngagement`
 * (TASK-789/891/790). This resolver is the single canonical projection over those
 * SSOTs — surfaces (Person 360, Workforce, future) consume it instead of branching
 * on `member.contract_type` inline (which would misrepresent an ex-employee who is
 * now a contractor as "Empleada indefinida").
 *
 * NEVER mutate `member.contract_type` to reflect a contractor relationship (would
 * route to the legacy SII honorarios rail → double F29 declaration). NEVER branch
 * current classification inline in a surface — pass through this resolver.
 *
 * Priority when resolving (a person should not have two active work relationships
 * simultaneously; if they do — a data anomaly the `payroll.contractor.double_rail_overlap`
 * signal flags — we resolve conservatively to `employee`):
 *   1. Active `employee` relationship  → kind='employee' (payroll-relevant).
 *   2. Active `contractor` relationship + non-terminal engagement → kind='contractor'.
 *   3. Neither → kind='none' (employment history retained for the label).
 */

export type CurrentWorkClassificationKind = 'employee' | 'contractor' | 'none'

export type CurrentWorkClassificationSource =
  | 'active_employment_relationship'
  | 'active_contractor_engagement'
  | 'employment_history'
  | 'none'

export type CurrentWorkClassification = {
  profileId: string
  kind: CurrentWorkClassificationKind
  /** From `member.contract_type` — the EMPLOYMENT contract type (history once employment ends). */
  employmentContractType: string | null
  /** From the active `ContractorEngagement.relationshipSubtype` (5-value SSOT). */
  contractorSubtype: string | null
  /** From the active engagement — for the Art 7-8 CT "contractor limpio" gate. Null when not a contractor. */
  classificationRiskStatus: string | null
  /** es-CL label for display. */
  displayLabel: string
  source: CurrentWorkClassificationSource
}

// es-CL display labels. Pending greenhouse-ux-writing review at integration (TASK-265).
const CONTRACTOR_SUBTYPE_LABELS: Record<string, string> = {
  honorarios_cl: 'Contractor · Honorarios',
  freelance: 'Contractor · Freelance',
  independent_professional: 'Contractor · Profesional independiente',
  international_contractor: 'Contractor · Internacional',
  provider_platform: 'Contractor · Plataforma'
}

const EMPLOYMENT_CONTRACT_TYPE_LABELS: Record<string, string> = {
  indefinido: 'Empleado · Contrato indefinido',
  plazo_fijo: 'Empleado · Plazo fijo',
  honorarios: 'Honorarios (nómina interna)',
  contractor: 'Contractor (Deel)',
  eor: 'EOR (Deel)',
  international_internal: 'Internacional interno'
}

const contractorLabel = (subtype: string | null): string =>
  (subtype && CONTRACTOR_SUBTYPE_LABELS[subtype]) || 'Contractor'

const employmentLabel = (contractType: string | null): string =>
  (contractType && EMPLOYMENT_CONTRACT_TYPE_LABELS[contractType]) || 'Sin clasificación vigente'

/**
 * Resolve the current work classification for a person.
 *
 * @param profileId — `identity_profiles.profile_id` (canonical Persona).
 * @param memberContractType — optional hint of `member.contract_type` the caller
 *        already has (avoids a re-query); used only for the employment/history label.
 */
export const resolveCurrentWorkClassification = async (params: {
  profileId: string
  memberContractType?: string | null
}): Promise<CurrentWorkClassification> => {
  const { profileId } = params
  const memberContractType = params.memberContractType ?? null

  const relationships = await resolveActivePersonLegalEntityRelationships({
    profileId,
    relationshipTypes: ['employee', 'contractor']
  })

  const hasActiveEmployee = relationships.some(r => r.relationshipType === 'employee')
  const hasActiveContractor = relationships.some(r => r.relationshipType === 'contractor')

  // 1. Active employment relationship wins (payroll-relevant; conservative if both active).
  if (hasActiveEmployee) {
    return {
      profileId,
      kind: 'employee',
      employmentContractType: memberContractType,
      contractorSubtype: null,
      classificationRiskStatus: null,
      displayLabel: employmentLabel(memberContractType),
      source: 'active_employment_relationship'
    }
  }

  // 2. Active contractor relationship + non-terminal engagement.
  if (hasActiveContractor) {
    const engagement = await getActiveContractorEngagementForProfile(profileId)

    if (engagement && !isTerminalEngagementStatus(engagement.status)) {
      return {
        profileId,
        kind: 'contractor',
        employmentContractType: memberContractType,
        contractorSubtype: engagement.relationshipSubtype,
        classificationRiskStatus: engagement.classificationRiskStatus,
        displayLabel: contractorLabel(engagement.relationshipSubtype),
        source: 'active_contractor_engagement'
      }
    }
  }

  // 3. Neither active → employment history (if any) or none.
  return {
    profileId,
    kind: 'none',
    employmentContractType: memberContractType,
    contractorSubtype: null,
    classificationRiskStatus: null,
    displayLabel: employmentLabel(memberContractType),
    source: memberContractType ? 'employment_history' : 'none'
  }
}
