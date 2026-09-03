import type { ContractType, PayrollVia, PayRegime } from '@/types/hr-contracts'

export const OFFBOARDING_CASE_STATUSES = [
  'draft',
  'needs_review',
  'approved',
  'scheduled',
  'blocked',
  'executed',
  'cancelled'
] as const

export type OffboardingCaseStatus = (typeof OFFBOARDING_CASE_STATUSES)[number]

export const OFFBOARDING_SEPARATION_TYPES = [
  'resignation',
  'termination',
  'fixed_term_expiry',
  'mutual_agreement',
  'contract_end',
  'relationship_transition',
  'identity_only',
  'other'
] as const

export type OffboardingSeparationType = (typeof OFFBOARDING_SEPARATION_TYPES)[number]

export const OFFBOARDING_SOURCES = [
  'manual_hr',
  'people',
  'scim',
  'admin',
  'contract_expiry',
  'external_provider',
  'legacy_checklist',
  'system'
] as const

export type OffboardingSource = (typeof OFFBOARDING_SOURCES)[number]

export const OFFBOARDING_RULE_LANES = [
  'internal_payroll',
  'external_payroll',
  'non_payroll',
  'identity_only',
  'relationship_transition',
  'unknown'
] as const

export type OffboardingRuleLane = (typeof OFFBOARDING_RULE_LANES)[number]

export type OffboardingRelationshipType = 'employee' | 'contractor' | 'eor' | 'executive' | 'other'
export type GreenhouseExecutionMode = 'full' | 'partial' | 'informational'

export interface OffboardingLaneDecision {
  ruleLane: OffboardingRuleLane
  requiresPayrollClosure: boolean
  requiresLeaveReconciliation: boolean
  requiresHrDocuments: boolean
  requiresAccessRevocation: boolean
  requiresAssetRecovery: boolean
  requiresAssignmentHandoff: boolean
  requiresApprovalReassignment: boolean
  greenhouseExecutionMode: GreenhouseExecutionMode
}

export interface OffboardingCase {
  offboardingCaseId: string
  publicId: string
  profileId: string
  memberId: string | null
  userId: string | null
  personLegalEntityRelationshipId: string | null
  legalEntityOrganizationId: string | null
  organizationId: string | null
  spaceId: string | null
  relationshipType: OffboardingRelationshipType
  employmentType: string | null
  contractTypeSnapshot: ContractType | 'unknown'
  payRegimeSnapshot: PayRegime | 'unknown'
  payrollViaSnapshot: PayrollVia | 'none' | 'unknown'
  deelContractIdSnapshot: string | null
  countryCode: string | null
  contractEndDateSnapshot: string | null
  separationType: OffboardingSeparationType
  source: OffboardingSource
  status: OffboardingCaseStatus
  ruleLane: OffboardingRuleLane
  requiresPayrollClosure: boolean
  requiresLeaveReconciliation: boolean
  requiresHrDocuments: boolean
  requiresAccessRevocation: boolean
  requiresAssetRecovery: boolean
  requiresAssignmentHandoff: boolean
  requiresApprovalReassignment: boolean
  greenhouseExecutionMode: GreenhouseExecutionMode
  effectiveDate: string | null
  lastWorkingDay: string | null
  lastWorkingDayAfterEffectiveReason: string | null
  submittedAt: string | null
  approvedAt: string | null
  scheduledAt: string | null
  executedAt: string | null
  cancelledAt: string | null
  blockedReason: string | null
  reasonCode: string | null
  notes: string | null
  legacyChecklistRef: Record<string, unknown>
  sourceRef: Record<string, unknown>
  metadata: Record<string, unknown>
  createdByUserId: string | null
  updatedByUserId: string | null
  createdAt: string
  updatedAt: string
  /**
   * TASK-1349 — decisión de revisión persistida (`metadata_json.review`).
   * `null` = nunca revisado. Un caso nacido de una señal de acceso
   * (`separationType='identity_only'`) no puede aprobarse/programarse/ejecutarse
   * sin este registro.
   */
  review?: OffboardingCaseReviewRecord | null
  // TASK-862 Slice C — pre-requisitos del finiquito de renuncia voluntaria.
  // Ambos opcionales en el type para no romper consumers existentes; los endpoints
  // POST .../resignation-letter y POST .../maintenance-obligation los poblan.
  // El readiness check de buildDocumentReadiness los gating como blocker cuando
  // separation_type='resignation' y son null.
  resignationLetterAssetId?: string | null
  maintenanceObligationJson?: {
    variant: 'not_subject' | 'subject'
    amount?: number
    beneficiary?: string
    evidenceAssetId?: string
    declaredAt: string
    declaredByUserId: string
  } | null
}

export interface CreateOffboardingCaseInput {
  memberId: string
  separationType: OffboardingSeparationType
  source?: OffboardingSource
  status?: Extract<OffboardingCaseStatus, 'draft' | 'needs_review'>
  effectiveDate?: string | null
  lastWorkingDay?: string | null
  lastWorkingDayAfterEffectiveReason?: string | null
  reasonCode?: string | null
  notes?: string | null
  sourceRef?: Record<string, unknown>
  legacyChecklistRef?: Record<string, unknown>
}

export interface TransitionOffboardingCaseInput {
  status: OffboardingCaseStatus
  effectiveDate?: string | null
  lastWorkingDay?: string | null
  lastWorkingDayAfterEffectiveReason?: string | null
  blockedReason?: string | null
  reason?: string | null
  notes?: string | null
  /**
   * TASK-1349 — optimistic concurrency. When present, the transition is
   * rejected (409 `offboarding_case_version_conflict`) if the case's
   * `updatedAt` no longer matches: a stale screen never overwrites a newer
   * decision silently.
   */
  expectedUpdatedAt?: string | null
}

/**
 * TASK-1349 — decisión contractual explícita sobre un caso existente.
 *
 * - `access_only`: la señal (SCIM/admin) fue sólo una baja de acceso. La
 *   relación, la compensación y el member NO cambian. El caso queda como
 *   `identity_only` informational con la fecha de baja de acceso explícita.
 * - `relationship_ended`: la relación laboral/contractual terminó. Exige
 *   causal respaldada (`separationType` explícito, nunca inferido) y fechas
 *   explícitas; recomputa lane/requisitos con la matriz canónica.
 */
export type OffboardingReviewDecision = 'access_only' | 'relationship_ended'

export interface ReviewOffboardingCaseInput {
  decision: OffboardingReviewDecision
  /** Motivo humano, >= 10 chars. Se persiste en el audit append-only. */
  reason: string
  /** `updatedAt` que vio el operador. Obligatorio: sin él no hay control de versión. */
  expectedUpdatedAt: string
  /**
   * `relationship_ended`: causal respaldada. Nunca `identity_only`.
   * `access_only`: ignorado (el caso conserva `identity_only`).
   */
  separationType?: OffboardingSeparationType | null
  /**
   * `relationship_ended`: fecha efectiva del término (obligatoria).
   * `access_only`: fecha de la baja de acceso (obligatoria; suele ser la de la
   * señal SCIM, pero nunca se asume — el operador la declara).
   */
  effectiveDate?: string | null
  /** `relationship_ended`: último día trabajado (obligatorio). `access_only`: opcional, default = effectiveDate. */
  lastWorkingDay?: string | null
  lastWorkingDayAfterEffectiveReason?: string | null
  notes?: string | null
  /**
   * Aprobar en el mismo acto. Sólo se honra cuando el actor tiene
   * `hr.offboarding_case:approve`; de lo contrario la revisión deja el caso en
   * `needs_review` y la aprobación es un paso gobernado aparte.
   */
  approveNow?: boolean
}

/**
 * Registro persistido de la revisión (en `metadata_json.review` del caso).
 * Su presencia es lo que autoriza aprobar/programar/ejecutar un caso nacido
 * de una señal de acceso.
 */
export interface OffboardingCaseReviewRecord {
  decision: OffboardingReviewDecision
  reviewedAt: string
  reviewedByUserId: string
  reason: string
  previous: {
    separationType: OffboardingSeparationType
    ruleLane: OffboardingRuleLane
    status: OffboardingCaseStatus
    effectiveDate: string | null
    lastWorkingDay: string | null
  }
}

export interface OffboardingCaseListFilters {
  status?: OffboardingCaseStatus | 'active' | null
  memberId?: string | null
  limit?: number
}
