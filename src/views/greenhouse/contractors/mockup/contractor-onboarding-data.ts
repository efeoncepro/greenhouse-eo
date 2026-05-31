// TASK-976 mockup — Contractor Onboarding wizard (employee→contractor + new
// contractor). Typed mock data for the two-path wizard:
//   · Path B "Desde una salida laboral" — transitionEmployeeToContractorEngagement
//     over an executed offboarding case (idempotent: 3 outcomes).
//   · Path A "Contractor nuevo" — createContractorEngagement over an existing
//     contractor relationship (3 resolve states: ok / derive-to-B / no-relation).
// Shape mirrors the real command bodies (TASK-790/956). Label + tone helpers are
// reused from contractor-engagement-detail-data.ts (single source).

import type {
  BonusPolicy,
  PaymentCadence,
  PaymentModel,
  PayrollVia,
  RateType,
  RelationshipSubtype,
  TaxComplianceOwner
} from './contractor-engagement-detail-data'

// Re-export the canonical label/tone helpers so the view imports from one module.
export {
  bonusPolicyLabel,
  cadenceLabel,
  countryLabel,
  paymentModelLabel,
  payrollViaLabel,
  rateTypeLabel,
  relationshipSubtypeLabel,
  taxOwnerLabel,
  type BonusPolicy,
  type PaymentCadence,
  type PaymentModel,
  type PayrollVia,
  type RateType,
  type RelationshipSubtype,
  type TaxComplianceOwner
} from './contractor-engagement-detail-data'

// --- The 2 wizard paths ------------------------------------------------------

export type OnboardingPath = 'from_offboarding' | 'new_contractor'

// --- Contractor subtype (relationship-side enum: contractor | honorarios) ----
// Path B sets contractorSubtype on the relationship that opens.

export type ContractorSubtype = 'contractor' | 'honorarios'

export const CONTRACTOR_SUBTYPE_OPTIONS: ContractorSubtype[] = ['contractor', 'honorarios']

export const contractorSubtypeLabel = (v: ContractorSubtype): string =>
  v === 'honorarios' ? 'Honorarios Chile' : 'Contractor'

// --- Shared enum option arrays (mirror the real command enums) ---------------

export const RELATIONSHIP_SUBTYPE_OPTIONS: RelationshipSubtype[] = [
  'honorarios_cl',
  'freelance',
  'independent_professional',
  'international_contractor',
  'provider_platform'
]

export const PAYROLL_VIA_OPTIONS: PayrollVia[] = [
  'internal',
  'deel',
  'remote',
  'oyster',
  'manual_provider',
  'direct_international'
]

export const PAYMENT_MODEL_OPTIONS: PaymentModel[] = [
  'fixed_recurring',
  'weekly_timesheet',
  'milestone',
  'project_fee',
  'payg_invoice',
  'off_cycle'
]

export const RATE_TYPE_OPTIONS: RateType[] = ['fixed', 'hourly', 'daily', 'milestone', 'project', 'retainer']

export const PAYMENT_CADENCE_OPTIONS: PaymentCadence[] = [
  'weekly',
  'biweekly',
  'semi_monthly',
  'monthly',
  'milestone',
  'on_invoice',
  'off_cycle'
]

export const TAX_OWNER_OPTIONS: TaxComplianceOwner[] = [
  'greenhouse_policy',
  'provider_owned',
  'manual_review_required',
  'country_engine_owned'
]

export const BONUS_POLICY_OPTIONS: BonusPolicy[] = ['none', 'fixed', 'ico_backed']

// --- Operating entity (legal_entity_organization_id) -------------------------

export interface MockOperatingEntity {
  organizationId: string
  legalName: string
}

export const MOCK_OPERATING_ENTITY: MockOperatingEntity = {
  organizationId: 'org-efeonce-spa',
  legalName: 'Efeonce Group SpA'
}

// --- Path B picker: executed offboarding cases -------------------------------

export interface MockExecutedOffboarding {
  offboardingCaseId: string
  publicId: string
  personName: string
  profileId: string
  /** ISO date string. Contractor effective_from must be AFTER this day. */
  lastWorkingDay: string
  separationType: string
  relationshipType: 'employee'
  legalEntityLabel: string
  contractTypeSnapshot: string
}

export const MOCK_EXECUTED_OFFBOARDINGS: MockExecutedOffboarding[] = [
  {
    offboardingCaseId: 'off-val-2026',
    publicId: 'EO-OFF-2026-VAL',
    personName: 'Valentina Hoyos',
    profileId: 'prof-vhoyos',
    lastWorkingDay: '2026-04-30',
    separationType: 'Renuncia voluntaria',
    relationshipType: 'employee',
    legalEntityLabel: 'Efeonce Group SpA',
    contractTypeSnapshot: 'Indefinido'
  },
  {
    offboardingCaseId: 'off-and-2026',
    publicId: 'EO-OFF-2026-AND',
    personName: 'Andrés Restrepo',
    profileId: 'prof-acolombia',
    lastWorkingDay: '2026-03-31',
    separationType: 'Mutuo acuerdo',
    relationshipType: 'employee',
    legalEntityLabel: 'Efeonce Group SpA',
    contractTypeSnapshot: 'Plazo fijo'
  },
  {
    offboardingCaseId: 'off-mel-2026',
    publicId: 'EO-OFF-2026-MEL',
    personName: 'Melkin Duarte',
    profileId: 'prof-melkin',
    lastWorkingDay: '2026-05-15',
    separationType: 'Renuncia voluntaria',
    relationshipType: 'employee',
    legalEntityLabel: 'Efeonce Group SpA',
    contractTypeSnapshot: 'Indefinido'
  }
]

// --- Path A picker: person search (mirrors people-search) --------------------

export interface MockPerson {
  profileId: string
  fullName: string
  canonicalEmail: string
}

export const MOCK_PEOPLE: MockPerson[] = [
  // Resolves to has_contractor_relationship → continue.
  { profileId: 'prof-camila-ok', fullName: 'María Camila Soto', canonicalEmail: 'camila.soto@efeonce.org' },
  // Resolves to has_executed_offboarding → derive to Path B.
  { profileId: 'prof-vhoyos', fullName: 'Valentina Hoyos', canonicalEmail: 'valentina.hoyos@efeonce.org' },
  // Resolves to no_relationship → Person 360 dead-end.
  { profileId: 'prof-nuevo', fullName: 'Tomás Aguilera', canonicalEmail: 'tomas.aguilera@efeonce.org' }
]

// --- resolvePersonOutcome ----------------------------------------------------

export type PersonOutcome =
  | { kind: 'has_contractor_relationship'; relationship: { relationshipId: string; legalEntityLabel: string } }
  | { kind: 'has_executed_offboarding'; offboardingCaseId: string; publicId: string }
  | { kind: 'no_relationship' }

export const resolvePersonOutcome = (profileId: string): PersonOutcome => {
  if (profileId === 'prof-camila-ok') {
    return {
      kind: 'has_contractor_relationship',
      relationship: { relationshipId: 'rel-camila-contractor', legalEntityLabel: MOCK_OPERATING_ENTITY.legalName }
    }
  }

  if (profileId === 'prof-vhoyos') {
    return { kind: 'has_executed_offboarding', offboardingCaseId: 'off-val-2026', publicId: 'EO-OFF-2026-VAL' }
  }

  return { kind: 'no_relationship' }
}

// --- Idempotent outcomes (Path B) --------------------------------------------

export type PathBOutcome =
  | 'transitioned'
  | 'engagement_created_on_existing_relationship'
  | 'already_complete'

export const PATH_B_OUTCOME_ORDER: PathBOutcome[] = [
  'transitioned',
  'engagement_created_on_existing_relationship',
  'already_complete'
]

// --- Subtype family helper (mirror mapRelationshipSubtypeToEngagementSubtype) -
// Path A relationshipSubtype must be coherent with a contractor subtype family.
// honorarios_cl → honorarios family; everything else → contractor family.

export const relationshipSubtypeFamily = (v: RelationshipSubtype): ContractorSubtype =>
  v === 'honorarios_cl' ? 'honorarios' : 'contractor'
