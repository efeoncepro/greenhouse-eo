/**
 * TASK-976 — Runtime enum option arrays + es-CL label helpers for the contractor
 * onboarding wizard. Pure (client + server safe). Re-uses the canonical command
 * enums from `./types` (the CHECK-enum SSOT) and provides the display labels the
 * wizard renders. Lives here (not under `mockup/`) so the runtime view never
 * imports from a mockup module.
 */

import {
  CONTRACTOR_BONUS_POLICIES,
  CONTRACTOR_ENGAGEMENT_PAYROLL_VIA,
  CONTRACTOR_ENGAGEMENT_SUBTYPES,
  CONTRACTOR_PAYMENT_CADENCES,
  CONTRACTOR_PAYMENT_MODELS,
  CONTRACTOR_RATE_TYPES,
  CONTRACTOR_TAX_COMPLIANCE_OWNERS,
  type ContractorBonusPolicy,
  type ContractorEngagementPayrollVia,
  type ContractorEngagementSubtype,
  type ContractorPaymentCadence,
  type ContractorPaymentModel,
  type ContractorRateType,
  type ContractorTaxComplianceOwner
} from './types'

// --- Re-exported canonical option arrays (the command enums) -----------------

export const RELATIONSHIP_SUBTYPE_OPTIONS = CONTRACTOR_ENGAGEMENT_SUBTYPES
export const PAYROLL_VIA_OPTIONS = CONTRACTOR_ENGAGEMENT_PAYROLL_VIA
export const PAYMENT_MODEL_OPTIONS = CONTRACTOR_PAYMENT_MODELS
export const RATE_TYPE_OPTIONS = CONTRACTOR_RATE_TYPES
export const PAYMENT_CADENCE_OPTIONS = CONTRACTOR_PAYMENT_CADENCES
export const TAX_OWNER_OPTIONS = CONTRACTOR_TAX_COMPLIANCE_OWNERS
export const BONUS_POLICY_OPTIONS = CONTRACTOR_BONUS_POLICIES

// --- Path B contractor subtype (relationship-side enum: contractor | honorarios)

export type ContractorSubtype = 'contractor' | 'honorarios'

export const CONTRACTOR_SUBTYPE_OPTIONS: ContractorSubtype[] = ['contractor', 'honorarios']

export const contractorSubtypeLabel = (v: ContractorSubtype): string =>
  v === 'honorarios' ? 'Honorarios Chile' : 'Contractor'

// --- es-CL label helpers (verbatim from the approved mockup) ------------------

export const relationshipSubtypeLabel = (v: ContractorEngagementSubtype): string => {
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

export const payrollViaLabel = (v: ContractorEngagementPayrollVia): string => {
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

export const paymentModelLabel = (v: ContractorPaymentModel): string => {
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

export const rateTypeLabel = (v: ContractorRateType): string => {
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

export const cadenceLabel = (v: ContractorPaymentCadence): string => {
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

export const taxOwnerLabel = (v: ContractorTaxComplianceOwner): string => {
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

export const bonusPolicyLabel = (v: ContractorBonusPolicy): string => {
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

/**
 * Path A relationshipSubtype must be coherent with a contractor subtype family
 * (mirror of `mapRelationshipSubtypeToEngagementSubtype`): honorarios_cl →
 * honorarios family; everything else → contractor family.
 */
export const relationshipSubtypeFamily = (v: ContractorEngagementSubtype): ContractorSubtype =>
  v === 'honorarios_cl' ? 'honorarios' : 'contractor'

// --- Type re-exports so the view imports enums from one module ----------------

export type {
  ContractorBonusPolicy as BonusPolicy,
  ContractorEngagementPayrollVia as PayrollVia,
  ContractorEngagementSubtype as RelationshipSubtype,
  ContractorPaymentCadence as PaymentCadence,
  ContractorPaymentModel as PaymentModel,
  ContractorRateType as RateType,
  ContractorTaxComplianceOwner as TaxComplianceOwner
}
