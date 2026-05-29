/**
 * TASK-790 — Contractor Engagements canonical types.
 *
 * Pure types (NOT server-only) so they can be shared by server store +
 * client-facing API DTOs + tests. Mirrors the CHECK enums of
 * `greenhouse_hr.contractor_engagements` (migration 20260529221452562).
 *
 * Canonical decisions:
 * - `relationshipSubtype` is the engagement's OWN fine-grained SSOT (5 values),
 *   validated for family-consistency vs the anchored relationship's coarse
 *   subtype (`{contractor,honorarios}` in metadata). No write-back. See D2.
 * - `payrollVia` is the engagement channel enum, ORTHOGONAL to members.payrollVia
 *   (payroll's `PayrollVia` = 'internal'|'deel'). DISTINCT type on purpose. See D3.
 */

export const CONTRACTOR_ENGAGEMENT_SUBTYPES = [
  'honorarios_cl',
  'freelance',
  'independent_professional',
  'international_contractor',
  'provider_platform'
] as const
export type ContractorEngagementSubtype = (typeof CONTRACTOR_ENGAGEMENT_SUBTYPES)[number]

/**
 * Engagement payment channel. NOT the payroll `PayrollVia` type — that one
 * classifies the dependent payroll regime and is owned by `members`. This enum
 * is the contractor payment lane and lives only on the engagement.
 */
export const CONTRACTOR_ENGAGEMENT_PAYROLL_VIA = [
  'internal',
  'deel',
  'remote',
  'oyster',
  'manual_provider',
  'direct_international'
] as const
export type ContractorEngagementPayrollVia = (typeof CONTRACTOR_ENGAGEMENT_PAYROLL_VIA)[number]

export const CONTRACTOR_PAYMENT_MODELS = [
  'fixed_recurring',
  'weekly_timesheet',
  'milestone',
  'project_fee',
  'payg_invoice',
  'off_cycle'
] as const
export type ContractorPaymentModel = (typeof CONTRACTOR_PAYMENT_MODELS)[number]

export const CONTRACTOR_RATE_TYPES = [
  'fixed',
  'hourly',
  'daily',
  'milestone',
  'project',
  'retainer'
] as const
export type ContractorRateType = (typeof CONTRACTOR_RATE_TYPES)[number]

export const CONTRACTOR_PAYMENT_CADENCES = [
  'weekly',
  'biweekly',
  'semi_monthly',
  'monthly',
  'milestone',
  'on_invoice',
  'off_cycle'
] as const
export type ContractorPaymentCadence = (typeof CONTRACTOR_PAYMENT_CADENCES)[number]

export const CONTRACTOR_TAX_COMPLIANCE_OWNERS = [
  'greenhouse_policy',
  'provider_owned',
  'manual_review_required',
  'country_engine_owned'
] as const
export type ContractorTaxComplianceOwner = (typeof CONTRACTOR_TAX_COMPLIANCE_OWNERS)[number]

export const CONTRACTOR_BONUS_POLICIES = ['none', 'fixed', 'ico_backed'] as const
export type ContractorBonusPolicy = (typeof CONTRACTOR_BONUS_POLICIES)[number]

export const CONTRACTOR_CLASSIFICATION_RISK_STATUSES = [
  'clear',
  'needs_review',
  'legal_review_required',
  'blocked'
] as const
export type ContractorClassificationRiskStatus =
  (typeof CONTRACTOR_CLASSIFICATION_RISK_STATUSES)[number]

export const CONTRACTOR_ENGAGEMENT_STATUSES = [
  'draft',
  'pending_review',
  'active',
  'paused',
  'ending',
  'ended',
  'cancelled'
] as const
export type ContractorEngagementStatus = (typeof CONTRACTOR_ENGAGEMENT_STATUSES)[number]

/**
 * Deterministic classification-risk red flags (arch doc "Riesgo de clasificacion
 * laboral es first-class"). All optional; absence = false. The pure resolver
 * `computeClassificationRisk` maps these to a status. Never auto-clears.
 */
export interface ContractorClassificationRiskFactors {
  /** Horario fijo impuesto por el contratante. */
  imposedFixedSchedule?: boolean
  /** Jefatura directa + control disciplinario tipo empleado. */
  directSupervision?: boolean
  /** Exclusividad contractual. */
  exclusivity?: boolean
  /** Dependencia economica material (≈ ingreso unico). */
  economicDependency?: boolean
  /** Continuidad inmediata desde una relacion laboral dependiente previa. */
  immediateEmployeeContinuity?: boolean
  /** Uso de cargo interno indistinguible de empleado. */
  internalRoleIndistinguishable?: boolean
  /** Pagos recurrentes sin entregables/invoice/evidencia. */
  recurringPaymentsWithoutDeliverables?: boolean
}

export interface ContractorEngagement {
  contractorEngagementId: string
  publicId: string
  profileId: string
  memberId: string | null
  personLegalEntityRelationshipId: string
  legalEntityOrganizationId: string
  countryCode: string
  taxResidencyCountryCode: string | null
  relationshipSubtype: ContractorEngagementSubtype
  payrollVia: ContractorEngagementPayrollVia
  currency: string
  paymentCurrency: string | null
  fxPolicyCode: string | null
  providerContractId: string | null
  providerWorkerId: string | null
  paymentModel: ContractorPaymentModel
  rateType: ContractorRateType
  rateAmount: number | null
  paymentCadence: ContractorPaymentCadence
  requiresInvoice: boolean
  requiresWorkApproval: boolean
  taxComplianceOwner: ContractorTaxComplianceOwner
  taxWithholdingPolicyCode: string | null
  taxWithholdingRateSnapshot: number | null
  bonusPolicy: ContractorBonusPolicy
  classificationRiskStatus: ContractorClassificationRiskStatus
  classificationReviewed: boolean
  classificationRiskFactors: ContractorClassificationRiskFactors
  status: ContractorEngagementStatus
  startDate: string
  endDate: string | null
  metadata: Record<string, unknown>
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContractorEngagementInput {
  profileId: string
  memberId?: string | null
  personLegalEntityRelationshipId: string
  legalEntityOrganizationId: string
  countryCode: string
  taxResidencyCountryCode?: string | null
  relationshipSubtype: ContractorEngagementSubtype
  payrollVia: ContractorEngagementPayrollVia
  currency: string
  paymentCurrency?: string | null
  fxPolicyCode?: string | null
  providerContractId?: string | null
  providerWorkerId?: string | null
  paymentModel: ContractorPaymentModel
  rateType: ContractorRateType
  rateAmount?: number | null
  paymentCadence: ContractorPaymentCadence
  requiresInvoice?: boolean
  requiresWorkApproval?: boolean
  taxComplianceOwner?: ContractorTaxComplianceOwner
  bonusPolicy?: ContractorBonusPolicy
  classificationRiskFactors?: ContractorClassificationRiskFactors
  startDate: string
  endDate?: string | null
  metadata?: Record<string, unknown>
  actorUserId: string
}

export interface UpdateContractorEngagementInput {
  contractorEngagementId: string
  /** Mutable economic terms (lifecycle status is changed via dedicated commands). */
  paymentModel?: ContractorPaymentModel
  rateType?: ContractorRateType
  rateAmount?: number | null
  paymentCadence?: ContractorPaymentCadence
  paymentCurrency?: string | null
  fxPolicyCode?: string | null
  providerContractId?: string | null
  providerWorkerId?: string | null
  requiresInvoice?: boolean
  requiresWorkApproval?: boolean
  bonusPolicy?: ContractorBonusPolicy
  endDate?: string | null
  metadataPatch?: Record<string, unknown>
  actorUserId: string
}

export interface TransitionContractorEngagementInput {
  contractorEngagementId: string
  targetStatus: ContractorEngagementStatus
  reason?: string | null
  actorUserId: string
}

export interface ReviewContractorClassificationInput {
  contractorEngagementId: string
  factors: ContractorClassificationRiskFactors
  /** Operator-asserted review outcome. `reviewed=true` is required to reach `clear`. */
  reviewed: boolean
  /** Explicit manual escalation to `blocked` (cannot be derived from factors). */
  block?: boolean
  reason?: string | null
  actorUserId: string
}
