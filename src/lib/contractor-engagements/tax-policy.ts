/**
 * TASK-790 — Tax/compliance owner + withholding policy resolution (pure).
 *
 * Defaults per arch doc "Resolved Architecture Decisions → Tax/compliance owner":
 *   - honorarios_cl                      → greenhouse_policy
 *   - payroll_via in (deel,remote,oyster)→ provider_owned
 *   - direct_international                → manual_review_required
 *   - rest                               → manual_review_required (conservative)
 *
 * Chile honorarios withholding is the ONLY tax Greenhouse computes in V1. The
 * rate value is owned by payroll's `getSiiRetentionRate` (SSOT); the engagement
 * SNAPSHOTS it + a versioned policy code. No AFP/Fonasa/AFC/SIS/IUSC ever
 * (those are dependent-payroll deductions, out of scope by hard rule).
 */
import { getSiiRetentionRate } from '@/types/hr-contracts'

import type {
  ContractorEngagementPayrollVia,
  ContractorEngagementSubtype,
  ContractorTaxComplianceOwner
} from './types'

export const resolveDefaultTaxComplianceOwner = (params: {
  relationshipSubtype: ContractorEngagementSubtype
  payrollVia: ContractorEngagementPayrollVia
}): ContractorTaxComplianceOwner => {
  if (params.relationshipSubtype === 'honorarios_cl') {
    return 'greenhouse_policy'
  }

  if (
    params.payrollVia === 'deel' ||
    params.payrollVia === 'remote' ||
    params.payrollVia === 'oyster'
  ) {
    return 'provider_owned'
  }

  // direct_international, manual_provider, internal-non-honorarios → human review.
  return 'manual_review_required'
}

export interface HonorariosWithholdingPolicy {
  policyCode: string
  rateSnapshot: number
}

/**
 * Resolves the Chile honorarios withholding policy for an emission year.
 * Snapshots the SII rate (payroll SSOT) and a versioned code, e.g.
 * `cl_honorarios_2026_15_25`. Used only when relationshipSubtype='honorarios_cl'.
 */
export const resolveHonorariosWithholdingPolicy = (
  emissionYear: number
): HonorariosWithholdingPolicy => {
  const rate = getSiiRetentionRate(emissionYear)
  // e.g. 0.1525 → "15_25"
  const ratePct = (rate * 100).toFixed(2).replace('.', '_')

  return {
    policyCode: `cl_honorarios_${emissionYear}_${ratePct}`,
    rateSnapshot: rate
  }
}
