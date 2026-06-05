// TASK-1019 Slice 2 — Jurisdiction packs: versioned deterministic policy modules
// (GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1 §4). Pure types. NOT server-only.

import type {
  ContractLanguage,
  SignableFormat,
  SignatureProvider,
  WorkforceContractingCaseKind,
  WorkforceContractingStructuredContent,
  WorkforceContractingValidationResult
} from '../types'

/** Canonical contract tuple (mirror of src/types/hr-contracts.ts derivations). */
export interface ContractTuple {
  contractType: string
  payRegime: string
  payrollVia: string
}

export type ValidationSeverity = 'blocking' | 'warning'

/**
 * A jurisdiction pack declares everything a document needs before it can be approved
 * for a given document kind + contract tuple. Deterministic + versioned.
 */
export interface JurisdictionPack {
  code: string
  label: string
  documentKinds: WorkforceContractingCaseKind[]
  supportedTuples: ContractTuple[]
  authoritativeLanguage: ContractLanguage
  requiredLanguages: ContractLanguage[]
  /** Person/identity fact codes that must be present. */
  requiredPersonFacts: string[]
  /** Compensation fact codes that must be present. */
  requiredCompensationFacts: string[]
  /** Section codes that must be present in BOTH languages. */
  requiredClauses: string[]
  /** Section codes that must NOT appear. */
  prohibitedClauses: string[]
  /** A legalReviewReference (>=10 chars) is mandatory before approval. */
  requiresLegalReviewReference: boolean
  /** Whether external registration evidence (e.g. DT/REL Chile) is expected downstream. */
  externalRegistrationRequired: boolean
  retentionClass: string
  signableFormat: SignableFormat
  signatureProvider: SignatureProvider
  /** Severity applied to missing required facts/clauses (always 'blocking' in V0). */
  missingRequirementSeverity: ValidationSeverity
}

export interface ValidateContractingInput {
  jurisdictionPackCode: string
  documentKind: WorkforceContractingCaseKind
  contractTuple: ContractTuple
  structuredContent: WorkforceContractingStructuredContent
  /** Fact codes present in the captured case data. */
  providedFactCodes: string[]
  legalReviewReference?: string | null
}

export type { WorkforceContractingValidationResult }
