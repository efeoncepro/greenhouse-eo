/**
 * TASK-794 — Chile honorarios compliance policy (pure).
 *
 * Canonical compliance layer for `relationship_subtype='honorarios_cl'` on top of
 * Contractor Engagements + Payables (TASK-790/793). It does NOT own the SII rate:
 * the rate value is owned by payroll's `getSiiRetentionRate` (SSOT) and exposed
 * to contractors via `resolveHonorariosWithholdingPolicy` (TASK-790, tax-policy.ts).
 * This module reuses those primitives and adds the honorarios-specific invariants:
 *
 *   1. Versioned policy snapshot (rate + emission year + boleta folio where present).
 *   2. SII-only payout breakdown — NEVER dependent payroll deductions
 *      (AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC/APV/gratificación legal).
 *
 *   gross_amount    = approved contractual amount / boleta amount
 *   withholding     = round(gross * sii_rate_snapshot)   ← the ONLY deduction
 *   net_payable     = gross - withholding
 *
 * The withholding NUMBER is computed by `computeContractorWithholding` (TASK-793
 * SSOT) — this module never re-implements `gross * rate`.
 *
 * Hard rules (arch GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1
 * §Chile Honorarios Policy + GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1 §234-235):
 * - NUNCA aplicar AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC dependiente a honorarios.
 * - NUNCA hardcodear la tasa SII inline — versionada via `tax_withholding_policy_code`.
 */
import { computeContractorWithholding } from '../payables/withholding'
import { resolveHonorariosWithholdingPolicy } from '../tax-policy'

import { ChileHonorariosDependentDeductionError } from './errors'

/** Canonical engagement subtype for Chile honorarios. */
export const CHILE_HONORARIOS_SUBTYPE = 'honorarios_cl' as const

/** The single allowed deduction kind for an honorarios payout. */
export const HONORARIOS_ALLOWED_DEDUCTION_KIND = 'sii_retention' as const

/**
 * Dependent-payroll deduction kinds that can NEVER appear on an honorarios
 * payout. A Chile civil/service provider emitting a boleta only suffers SII
 * retention; previsional cotizations are out of scope by hard rule.
 */
export const DEPENDENT_DEDUCTION_KINDS = new Set<string>([
  'afp',
  'fonasa',
  'isapre',
  'salud',
  'afc',
  'cesantia',
  'sis',
  'mutual',
  'iusc',
  'impuesto_unico',
  'apv',
  'gratificacion_legal'
])

export interface ChileHonorariosPolicySnapshot {
  /** Versioned policy code, e.g. `cl_honorarios_2026_15_25`. */
  policyCode: string
  /** SII withholding rate snapshot (e.g. 0.1525 for 2026). */
  rateSnapshot: number
  /** Emission year used to resolve the rate. */
  emissionYear: number
  /** SII boleta folio where present (deferred to ContractorInvoice aggregate). */
  boletaFolio: string | null
}

/**
 * Resolve the versioned Chile honorarios policy snapshot for an emission year.
 * Reuses `resolveHonorariosWithholdingPolicy` (TASK-790 SSOT). The boleta folio
 * is captured "where present" (read from submission/engagement metadata); a full
 * ContractorInvoice aggregate is out of V1 scope.
 */
export const resolveChileHonorariosPolicy = (params: {
  emissionYear: number
  boletaFolio?: string | null
}): ChileHonorariosPolicySnapshot => {
  const { policyCode, rateSnapshot } = resolveHonorariosWithholdingPolicy(params.emissionYear)
  const folio = typeof params.boletaFolio === 'string' ? params.boletaFolio.trim() : ''

  return {
    policyCode,
    rateSnapshot,
    emissionYear: params.emissionYear,
    boletaFolio: folio.length > 0 ? folio : null
  }
}

/**
 * Build the auditable honorarios policy snapshot for a payable's
 * `source_snapshot_json`. Prefers the engagement's persisted SII snapshot (SSOT,
 * resolved at engagement start year) and falls back to re-resolving from the
 * emission year. Returns null for non-honorarios lanes. Boleta folio is captured
 * "where present" (deferred to the ContractorInvoice aggregate, TASK-796+).
 */
export const buildHonorariosPolicySnapshot = (params: {
  relationshipSubtype: string
  taxWithholdingPolicyCode: string | null
  taxWithholdingRateSnapshot: number | null
  startDate: string
  boletaFolio?: string | null
}): ChileHonorariosPolicySnapshot | null => {
  if (params.relationshipSubtype !== CHILE_HONORARIOS_SUBTYPE) {
    return null
  }

  const emissionYear = Number(params.startDate.slice(0, 4))
  const fallback = resolveChileHonorariosPolicy({ emissionYear, boletaFolio: params.boletaFolio })

  return {
    policyCode: params.taxWithholdingPolicyCode ?? fallback.policyCode,
    rateSnapshot: params.taxWithholdingRateSnapshot ?? fallback.rateSnapshot,
    emissionYear,
    boletaFolio: fallback.boletaFolio
  }
}

/**
 * Guard: throws if any deduction kind is a dependent-payroll deduction. The
 * canonical SSOT for "what is forbidden on honorarios". Future honorarios
 * surfaces (self-service quoting, deduction breakdowns) MUST call this before
 * persisting any deduction line.
 */
export const assertNoDependentDeductions = (deductionKinds: string[]): void => {
  const offending = deductionKinds.filter(kind => DEPENDENT_DEDUCTION_KINDS.has(kind.toLowerCase()))

  if (offending.length > 0) {
    throw new ChileHonorariosDependentDeductionError(offending)
  }
}

export interface ChileHonorariosPayoutLine {
  kind: typeof HONORARIOS_ALLOWED_DEDUCTION_KIND
  amount: number
}

export interface ChileHonorariosPayout {
  grossAmount: number
  /** SII-only deduction breakdown. assertNoDependentDeductions guarantees purity. */
  deductions: ChileHonorariosPayoutLine[]
  withholdingAmount: number
  netPayable: number
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

/**
 * Canonical Chile honorarios payout. Produces the SII-only breakdown and asserts
 * no dependent deduction slipped in. The withholding NUMBER comes from the shared
 * `computeContractorWithholding` (TASK-793 SSOT) via the honorarios lane, so the
 * figure is bit-for-bit identical to what the payable store persists — this module
 * never re-implements `gross * rate`.
 */
export const computeChileHonorariosPayout = (params: {
  grossAmount: number
  rateSnapshot: number | null
}): ChileHonorariosPayout => {
  const grossAmount = roundCurrency(params.grossAmount)

  const withholdingAmount = computeContractorWithholding({
    relationshipSubtype: CHILE_HONORARIOS_SUBTYPE,
    taxComplianceOwner: 'greenhouse_policy',
    taxWithholdingRateSnapshot: params.rateSnapshot,
    grossAmount
  })

  const deductions: ChileHonorariosPayoutLine[] =
    withholdingAmount > 0 ? [{ kind: HONORARIOS_ALLOWED_DEDUCTION_KIND, amount: withholdingAmount }] : []

  // Defense-in-depth: the breakdown we produce can only ever be SII retention.
  assertNoDependentDeductions(deductions.map(line => line.kind))

  return {
    grossAmount,
    deductions,
    withholdingAmount,
    netPayable: roundCurrency(grossAmount - withholdingAmount)
  }
}
