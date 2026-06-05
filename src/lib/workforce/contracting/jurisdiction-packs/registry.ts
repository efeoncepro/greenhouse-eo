// TASK-1019 Slice 2 — Jurisdiction pack registry V0 (deterministic, versioned).
// Clause checklist derived from Dirección del Trabajo guidance (arch §3.2 / §14).
// Pure data. Legal counsel sign-off pending (V0); this is the structural baseline.

import type { JurisdictionPack } from './types'

// Canonical Chile dependent contract clauses (DT minimum baseline).
const CL_DEPENDENT_CLAUSES = [
  'place_and_date',
  'parties_identification',
  'services_nature_and_location',
  'remuneration',
  'working_hours',
  'contract_term',
  'additional_pacts_and_benefits'
]

const CL_DEPENDENT_PERSON_FACTS = [
  'full_name',
  'national_id',
  'nationality',
  'birth_date',
  'hire_date',
  'address'
]

const CL_DEPENDENT_COMPENSATION_FACTS = ['gross_amount', 'currency', 'pay_period', 'pay_method']

export const JURISDICTION_PACKS: Record<string, JurisdictionPack> = {
  CL_CHILE_DEPENDENT_V1: {
    code: 'CL_CHILE_DEPENDENT_V1',
    label: 'Chile — Trabajador dependiente (indefinido / plazo fijo)',
    documentKinds: ['offer_letter', 'employment_contract'],
    supportedTuples: [
      { contractType: 'indefinido', payRegime: 'chile', payrollVia: 'internal' },
      { contractType: 'plazo_fijo', payRegime: 'chile', payrollVia: 'internal' }
    ],
    authoritativeLanguage: 'es-CL',
    requiredLanguages: ['es-CL', 'en-US'],
    requiredPersonFacts: CL_DEPENDENT_PERSON_FACTS,
    requiredCompensationFacts: CL_DEPENDENT_COMPENSATION_FACTS,
    requiredClauses: CL_DEPENDENT_CLAUSES,
    prohibitedClauses: [],
    requiresLegalReviewReference: false,
    externalRegistrationRequired: true,
    retentionClass: 'employment_contract_cl',
    signableFormat: 'pdf',
    signatureProvider: 'zapsign',
    missingRequirementSeverity: 'blocking'
  },

  CL_FOREIGNER_WORKING_IN_CHILE_V1: {
    code: 'CL_FOREIGNER_WORKING_IN_CHILE_V1',
    label: 'Chile — Extranjero trabajando físicamente en Chile',
    documentKinds: ['offer_letter', 'employment_contract'],
    supportedTuples: [
      { contractType: 'indefinido', payRegime: 'chile', payrollVia: 'internal' },
      { contractType: 'plazo_fijo', payRegime: 'chile', payrollVia: 'internal' }
    ],
    authoritativeLanguage: 'es-CL',
    requiredLanguages: ['es-CL', 'en-US'],
    requiredPersonFacts: [...CL_DEPENDENT_PERSON_FACTS, 'work_authorization', 'residence_permit'],
    requiredCompensationFacts: CL_DEPENDENT_COMPENSATION_FACTS,
    requiredClauses: [...CL_DEPENDENT_CLAUSES, 'visa_work_authorization', 'travel_clause_if_applicable'],
    prohibitedClauses: [],
    // DT: foreign workers require residence/work authorization → Legal review mandatory.
    requiresLegalReviewReference: true,
    externalRegistrationRequired: true,
    retentionClass: 'employment_contract_cl_foreigner',
    signableFormat: 'pdf',
    signatureProvider: 'zapsign',
    missingRequirementSeverity: 'blocking'
  },

  INTERNATIONAL_INTERNAL_REMOTE_V1: {
    code: 'INTERNATIONAL_INTERNAL_REMOTE_V1',
    label: 'Internacional — Persona fuera de Chile pagada internamente (international_internal)',
    documentKinds: ['offer_letter', 'employment_contract'],
    supportedTuples: [
      { contractType: 'international_internal', payRegime: 'international', payrollVia: 'internal' }
    ],
    // International mirror is operational; es-CL stays authoritative for Efeonce SpA.
    authoritativeLanguage: 'es-CL',
    requiredLanguages: ['es-CL', 'en-US'],
    requiredPersonFacts: ['full_name', 'national_id', 'nationality', 'country_of_residence', 'address'],
    requiredCompensationFacts: ['gross_amount', 'currency', 'pay_period', 'pay_method'],
    requiredClauses: [
      'parties_identification',
      'services_nature_and_location',
      'remuneration',
      'contract_term',
      'remote_work_setup',
      'governing_law_and_jurisdiction'
    ],
    prohibitedClauses: ['chile_statutory_deductions'],
    // TASK-894 invariant: international_internal requires legalReviewReference.
    requiresLegalReviewReference: true,
    externalRegistrationRequired: false,
    retentionClass: 'employment_contract_international_internal',
    signableFormat: 'pdf',
    signatureProvider: 'zapsign',
    missingRequirementSeverity: 'blocking'
  }
}

export const getJurisdictionPack = (code: string): JurisdictionPack | undefined =>
  JURISDICTION_PACKS[code]

export const listJurisdictionPackCodes = (): string[] => Object.keys(JURISDICTION_PACKS)
