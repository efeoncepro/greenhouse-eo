// TASK-975 mockup — Contractor Engagement Detail + Lifecycle + Classification Review.
// Typed mock data for the Drawer + Dialogs that live INSIDE the HR workbench
// (/hr/contractors). Shape mirrors the real ContractorEngagement (TASK-790,
// src/lib/contractor-engagements/types.ts) so the runtime detail wires with
// minimal change. 4 scenarios exercise the lifecycle + classification matrix:
//   needs_review · active_clear · draft_new · blocked_risk

import type { ThemeColor } from '@core/types'

// --- Domain enums (mirror of the real types) ---------------------------------

export type EngagementStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'ending' | 'ended' | 'cancelled'

export type ClassificationRiskStatus = 'clear' | 'needs_review' | 'legal_review_required' | 'blocked'

export type PayrollVia = 'internal' | 'deel' | 'remote' | 'oyster' | 'manual_provider' | 'direct_international'

export type PaymentModel = 'fixed_recurring' | 'weekly_timesheet' | 'milestone' | 'project_fee' | 'payg_invoice' | 'off_cycle'

export type RateType = 'fixed' | 'hourly' | 'daily' | 'milestone' | 'project' | 'retainer'

export type PaymentCadence = 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' | 'milestone' | 'on_invoice' | 'off_cycle'

export type TaxComplianceOwner = 'greenhouse_policy' | 'provider_owned' | 'manual_review_required' | 'country_engine_owned'

export type BonusPolicy = 'none' | 'fixed' | 'ico_backed'

export type RelationshipSubtype =
  | 'honorarios_cl'
  | 'freelance'
  | 'independent_professional'
  | 'international_contractor'
  | 'provider_platform'

/** The 7 deterministic classification red-flags (mirror of ContractorClassificationRiskFactors). */
export interface ClassificationRiskFactors {
  imposedFixedSchedule?: boolean
  directSupervision?: boolean
  exclusivity?: boolean
  economicDependency?: boolean
  immediateEmployeeContinuity?: boolean
  internalRoleIndistinguishable?: boolean
  recurringPaymentsWithoutDeliverables?: boolean
}

export const CLASSIFICATION_FACTOR_KEYS: (keyof ClassificationRiskFactors)[] = [
  'imposedFixedSchedule',
  'directSupervision',
  'exclusivity',
  'economicDependency',
  'immediateEmployeeContinuity',
  'internalRoleIndistinguishable',
  'recurringPaymentsWithoutDeliverables'
]

/** Engagement view-model for the detail mockup. Subset of the real ContractorEngagement. */
export interface MockEngagement {
  contractorEngagementId: string
  publicId: string
  profileId: string
  memberId: string | null
  contractorName: string
  countryCode: string
  taxResidencyCountryCode: string | null
  relationshipSubtype: RelationshipSubtype
  legalEntityLabel: string
  payrollVia: PayrollVia
  currency: string
  paymentCurrency: string | null
  fxPolicyCode: string | null
  providerContractId: string | null
  providerWorkerId: string | null
  paymentModel: PaymentModel
  rateType: RateType
  rateAmount: number | null
  paymentCadence: PaymentCadence
  requiresInvoice: boolean
  requiresWorkApproval: boolean
  taxComplianceOwner: TaxComplianceOwner
  taxWithholdingPolicyCode: string | null
  taxWithholdingRateSnapshot: number | null
  bonusPolicy: BonusPolicy
  classificationRiskStatus: ClassificationRiskStatus
  classificationReviewed: boolean
  classificationRiskFactors: ClassificationRiskFactors
  status: EngagementStatus
  startDate: string
  endDate: string | null
}

export type ScenarioKey = 'needs_review' | 'active_clear' | 'draft_new' | 'blocked_risk'

// --- Lifecycle transition matrix (mirror of ENGAGEMENT_TRANSITIONS) -----------

export const ENGAGEMENT_TRANSITIONS: Record<EngagementStatus, readonly EngagementStatus[]> = {
  draft: ['pending_review', 'active', 'cancelled'],
  pending_review: ['active', 'draft', 'cancelled'],
  active: ['paused', 'ending', 'cancelled'],
  paused: ['active', 'ending', 'cancelled'],
  ending: ['ended', 'active', 'cancelled'],
  ended: [],
  cancelled: []
}

export const isTerminalStatus = (status: EngagementStatus): boolean => ENGAGEMENT_TRANSITIONS[status].length === 0

/** Mirror of isClassificationRiskBlocking — gates "activar". */
export const isRiskBlocking = (status: ClassificationRiskStatus): boolean =>
  status === 'legal_review_required' || status === 'blocked'

/** A transition lands on `active`? (used to hide the activate CTA under blocking risk). */
export const isTransitionToActive = (to: EngagementStatus): boolean => to === 'active'

/** Non-trivial transitions require a reason (pause / ending / cancel). */
export const transitionRequiresReason = (to: EngagementStatus): boolean =>
  to === 'paused' || to === 'ending' || to === 'cancelled'

// --- Classification compute (mirror of computeClassificationRisk) -------------

const deriveFactorRiskLevel = (factors: ClassificationRiskFactors): ClassificationRiskStatus => {
  const materialSubordination =
    (Boolean(factors.imposedFixedSchedule) && Boolean(factors.directSupervision)) ||
    (Boolean(factors.exclusivity) && Boolean(factors.economicDependency)) ||
    Boolean(factors.internalRoleIndistinguishable)

  if (materialSubordination) return 'legal_review_required'

  const softSignal = Boolean(factors.immediateEmployeeContinuity) || Boolean(factors.recurringPaymentsWithoutDeliverables)

  if (softSignal) return 'needs_review'

  return 'clear'
}

const SEVERITY_ORDER: Record<ClassificationRiskStatus, number> = {
  clear: 0,
  needs_review: 1,
  legal_review_required: 2,
  blocked: 3
}

/** Pure preview of the resulting risk status (used live in the review dialog). */
export const computeClassificationRiskPreview = (
  factors: ClassificationRiskFactors,
  reviewed: boolean,
  block: boolean
): ClassificationRiskStatus => {
  if (block) return 'blocked'

  const factorLevel = deriveFactorRiskLevel(factors)
  const reviewFloor: ClassificationRiskStatus = reviewed ? 'clear' : 'needs_review'

  return SEVERITY_ORDER[factorLevel] >= SEVERITY_ORDER[reviewFloor] ? factorLevel : reviewFloor
}

// --- Label + tone + icon maps (es-CL) ----------------------------------------

export const statusTone = (status: EngagementStatus): ThemeColor => {
  switch (status) {
    case 'active':
      return 'success'
    case 'paused':
    case 'ending':
      return 'warning'
    case 'draft':
    case 'pending_review':
      return 'info'
    case 'cancelled':
      return 'error'
    case 'ended':
    default:
      return 'secondary'
  }
}

export const classificationTone = (status: ClassificationRiskStatus): ThemeColor => {
  switch (status) {
    case 'clear':
      return 'success'
    case 'needs_review':
      return 'warning'
    case 'legal_review_required':
    case 'blocked':
    default:
      return 'error'
  }
}

export const classificationIcon = (status: ClassificationRiskStatus): string => {
  switch (status) {
    case 'clear':
      return 'tabler-circle-check'
    case 'needs_review':
      return 'tabler-alert-triangle'
    case 'legal_review_required':
      return 'tabler-gavel'
    case 'blocked':
    default:
      return 'tabler-lock'
  }
}

export const relationshipSubtypeLabel = (v: RelationshipSubtype): string => {
  switch (v) {
    case 'honorarios_cl':
      return 'Honorarios Chile'
    case 'freelance':
      return 'Freelance'
    case 'independent_professional':
      return 'Profesional independiente'
    case 'international_contractor':
      return 'Contractor internacional'
    case 'provider_platform':
    default:
      return 'Plataforma de proveedor'
  }
}

export const payrollViaLabel = (v: PayrollVia): string => {
  switch (v) {
    case 'internal':
      return 'Interno'
    case 'deel':
      return 'Deel'
    case 'remote':
      return 'Remote'
    case 'oyster':
      return 'Oyster'
    case 'manual_provider':
      return 'Proveedor manual'
    case 'direct_international':
    default:
      return 'Directo internacional'
  }
}

export const paymentModelLabel = (v: PaymentModel): string => {
  switch (v) {
    case 'fixed_recurring':
      return 'Fijo recurrente'
    case 'weekly_timesheet':
      return 'Timesheet semanal'
    case 'milestone':
      return 'Por hito'
    case 'project_fee':
      return 'Fee de proyecto'
    case 'payg_invoice':
      return 'Pago por invoice'
    case 'off_cycle':
    default:
      return 'Fuera de ciclo'
  }
}

export const rateTypeLabel = (v: RateType): string => {
  switch (v) {
    case 'fixed':
      return 'Fija'
    case 'hourly':
      return 'Por hora'
    case 'daily':
      return 'Por día'
    case 'milestone':
      return 'Por hito'
    case 'project':
      return 'Por proyecto'
    case 'retainer':
    default:
      return 'Retainer'
  }
}

export const cadenceLabel = (v: PaymentCadence): string => {
  switch (v) {
    case 'weekly':
      return 'Semanal'
    case 'biweekly':
      return 'Quincenal'
    case 'semi_monthly':
      return 'Bimensual'
    case 'monthly':
      return 'Mensual'
    case 'milestone':
      return 'Por hito'
    case 'on_invoice':
      return 'On invoice'
    case 'off_cycle':
    default:
      return 'Off-cycle'
  }
}

export const taxOwnerLabel = (v: TaxComplianceOwner): string => {
  switch (v) {
    case 'greenhouse_policy':
      return 'Política Greenhouse'
    case 'provider_owned':
      return 'Lo asume el proveedor'
    case 'manual_review_required':
      return 'Requiere revisión manual'
    case 'country_engine_owned':
    default:
      return 'Motor de país'
  }
}

export const bonusPolicyLabel = (v: BonusPolicy): string => {
  switch (v) {
    case 'none':
      return 'Sin bono'
    case 'fixed':
      return 'Bono fijo'
    case 'ico_backed':
    default:
      return 'Bono según ICO'
  }
}

export const countryLabel = (code: string): string => {
  switch (code) {
    case 'CL':
      return 'Chile'
    case 'CO':
      return 'Colombia'
    case 'AR':
      return 'Argentina'
    case 'MX':
      return 'México'
    default:
      return code
  }
}

/** Lifecycle transition CTA copy keyed by target status. */
export type TransitionCopyKey =
  | 'activate'
  | 'sendToReview'
  | 'returnToDraft'
  | 'pause'
  | 'resume'
  | 'startEnding'
  | 'finish'
  | 'cancel'

/** Resolve the right CTA copy key for a (from → to) transition. */
export const transitionCopyKey = (from: EngagementStatus, to: EngagementStatus): TransitionCopyKey => {
  if (to === 'cancelled') return 'cancel'
  if (to === 'draft') return 'returnToDraft'
  if (to === 'pending_review') return 'sendToReview'
  if (to === 'paused') return 'pause'
  if (to === 'ending') return 'startEnding'
  if (to === 'ended') return 'finish'

  // to === 'active'
  return from === 'paused' ? 'resume' : 'activate'
}

/** Tabler icon per transition CTA. */
export const transitionIcon = (key: TransitionCopyKey): string => {
  switch (key) {
    case 'activate':
    case 'resume':
      return 'tabler-player-play'
    case 'sendToReview':
      return 'tabler-eye-check'
    case 'returnToDraft':
      return 'tabler-arrow-back-up'
    case 'pause':
      return 'tabler-player-pause'
    case 'startEnding':
      return 'tabler-hourglass'
    case 'finish':
      return 'tabler-flag-check'
    case 'cancel':
    default:
      return 'tabler-circle-x'
  }
}

// --- The 4 scenarios ----------------------------------------------------------

export const MOCK_ENGAGEMENTS: Record<ScenarioKey, MockEngagement> = {
  // (a) Honorarios CL, active, needs review, never reviewed.
  needs_review: {
    contractorEngagementId: 'ceng-0001',
    publicId: 'EO-CENG-0001',
    profileId: 'prof-vhoyos',
    memberId: 'mem-vhoyos',
    contractorName: 'Valentina Hoyos',
    countryCode: 'CL',
    taxResidencyCountryCode: 'CL',
    relationshipSubtype: 'honorarios_cl',
    legalEntityLabel: 'Efeonce Group SpA',
    payrollVia: 'internal',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    fxPolicyCode: null,
    providerContractId: null,
    providerWorkerId: null,
    paymentModel: 'fixed_recurring',
    rateType: 'fixed',
    rateAmount: 600_000,
    paymentCadence: 'monthly',
    requiresInvoice: true,
    requiresWorkApproval: true,
    taxComplianceOwner: 'greenhouse_policy',
    taxWithholdingPolicyCode: 'cl_honorarios_2026',
    taxWithholdingRateSnapshot: 15.25,
    bonusPolicy: 'none',
    classificationRiskStatus: 'needs_review',
    classificationReviewed: false,
    classificationRiskFactors: { recurringPaymentsWithoutDeliverables: true },
    status: 'active',
    startDate: '2026-01-01',
    endDate: null
  },

  // (b) International contractor, active, clear, reviewed, via Deel, USD.
  active_clear: {
    contractorEngagementId: 'ceng-0002',
    publicId: 'EO-CENG-0002',
    profileId: 'prof-acolombia',
    memberId: 'mem-acolombia',
    contractorName: 'Andrés Restrepo',
    countryCode: 'CO',
    taxResidencyCountryCode: 'CO',
    relationshipSubtype: 'international_contractor',
    legalEntityLabel: 'Efeonce Group SpA',
    payrollVia: 'deel',
    currency: 'USD',
    paymentCurrency: 'USD',
    fxPolicyCode: 'co_usd_spot_monthly',
    providerContractId: 'DEEL-CT-48213',
    providerWorkerId: 'DEEL-WK-90217',
    paymentModel: 'fixed_recurring',
    rateType: 'fixed',
    rateAmount: 2_800,
    paymentCadence: 'monthly',
    requiresInvoice: false,
    requiresWorkApproval: false,
    taxComplianceOwner: 'provider_owned',
    taxWithholdingPolicyCode: null,
    taxWithholdingRateSnapshot: null,
    bonusPolicy: 'fixed',
    classificationRiskStatus: 'clear',
    classificationReviewed: true,
    classificationRiskFactors: {},
    status: 'active',
    startDate: '2025-09-01',
    endDate: null
  },

  // (c) Fresh draft, no rate yet, never clears (fresh engagement).
  draft_new: {
    contractorEngagementId: 'ceng-0003',
    publicId: 'EO-CENG-0003',
    profileId: 'prof-mcamila',
    memberId: null,
    contractorName: 'María Camila Soto',
    countryCode: 'CL',
    taxResidencyCountryCode: 'CL',
    relationshipSubtype: 'freelance',
    legalEntityLabel: 'Efeonce Group SpA',
    payrollVia: 'internal',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    fxPolicyCode: null,
    providerContractId: null,
    providerWorkerId: null,
    paymentModel: 'milestone',
    rateType: 'milestone',
    rateAmount: null,
    paymentCadence: 'milestone',
    requiresInvoice: true,
    requiresWorkApproval: true,
    taxComplianceOwner: 'greenhouse_policy',
    taxWithholdingPolicyCode: 'cl_honorarios_2026',
    taxWithholdingRateSnapshot: 15.25,
    bonusPolicy: 'none',
    classificationRiskStatus: 'needs_review',
    classificationReviewed: false,
    classificationRiskFactors: {},
    status: 'draft',
    startDate: '2026-06-01',
    endDate: null
  },

  // (d) Active with blocking risk (imposedFixedSchedule + directSupervision) →
  //     legal_review_required. Demonstrates "activate hidden / auto-pause".
  blocked_risk: {
    contractorEngagementId: 'ceng-0004',
    publicId: 'EO-CENG-0004',
    profileId: 'prof-melkin',
    memberId: 'mem-melkin',
    contractorName: 'Melkin Duarte',
    countryCode: 'CL',
    taxResidencyCountryCode: 'CL',
    relationshipSubtype: 'independent_professional',
    legalEntityLabel: 'Efeonce Group SpA',
    payrollVia: 'manual_provider',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    fxPolicyCode: null,
    providerContractId: null,
    providerWorkerId: null,
    paymentModel: 'fixed_recurring',
    rateType: 'fixed',
    rateAmount: 1_200_000,
    paymentCadence: 'monthly',
    requiresInvoice: true,
    requiresWorkApproval: true,
    taxComplianceOwner: 'manual_review_required',
    taxWithholdingPolicyCode: null,
    taxWithholdingRateSnapshot: null,
    bonusPolicy: 'none',
    classificationRiskStatus: 'legal_review_required',
    classificationReviewed: false,
    classificationRiskFactors: { imposedFixedSchedule: true, directSupervision: true },
    status: 'active',
    startDate: '2026-02-01',
    endDate: null
  }
}

export const SCENARIO_ORDER: ScenarioKey[] = ['needs_review', 'active_clear', 'draft_new', 'blocked_risk']

export const SCENARIO_LABEL: Record<ScenarioKey, string> = {
  needs_review: 'Necesita revisión',
  active_clear: 'Activo · sin riesgo',
  draft_new: 'Borrador nuevo',
  blocked_risk: 'Riesgo bloqueante'
}
