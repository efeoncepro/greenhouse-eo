/**
 * TASK-793 — Contractor payable withholding computation (pure).
 *
 * Computes the SII withholding for a contractor payout from the engagement
 * snapshot. Greenhouse only withholds for Chile honorarios under its own policy;
 * provider-owned / manual / international lanes withhold 0 (the provider or a
 * future country engine handles local tax — TASK-794/795).
 *
 *   net_payable = gross_amount - withholding_amount
 *
 * The rate is the engagement's snapshot (`taxWithholdingRateSnapshot`, set by
 * TASK-790 from `getSiiRetentionRate`). 793 NEVER recomputes the SII rate.
 */
export interface WithholdingInputs {
  relationshipSubtype: string
  taxComplianceOwner: string
  taxWithholdingRateSnapshot: number | null
  grossAmount: number
}

export const computeContractorWithholding = ({
  relationshipSubtype,
  taxComplianceOwner,
  taxWithholdingRateSnapshot,
  grossAmount
}: WithholdingInputs): number => {
  const greenhouseWithholds =
    relationshipSubtype === 'honorarios_cl' &&
    taxComplianceOwner === 'greenhouse_policy' &&
    typeof taxWithholdingRateSnapshot === 'number' &&
    taxWithholdingRateSnapshot > 0

  if (!greenhouseWithholds) {
    return 0
  }

  // Round to 2 decimals (CLP has no decimals but the column is NUMERIC(18,2)).
  return Math.round(grossAmount * (taxWithholdingRateSnapshot as number) * 100) / 100
}
