import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

interface TaxBracketRow extends Record<string, unknown> {
  from_utm: string | number
  to_utm: string | number | null
  rate: string | number
  deduction_utm: string | number
}

interface ChileTaxResult {
  taxableBaseClp: number
  taxableBaseUtm: number
  utmValue: number
  bracketRate: number
  bracketDeductionUtm: number
  taxAmountClp: number
  taxTableVersion: string
  computed: boolean
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }

  return 0
}

/**
 * Compute Chilean monthly income tax from tax brackets.
 *
 * Formula: tax = (taxableBase_utm * rate - deduction_utm) * utm_value
 *
 * Falls back to 0 if tax table not found or UTM not available.
 */
export const computeChileTax = async ({
  taxableBaseClp,
  taxTableVersion,
  utmValue
}: {
  taxableBaseClp: number
  taxTableVersion: string | null
  utmValue: number | null
}): Promise<ChileTaxResult> => {
  // If no UTM or no table version, can't compute
  if (!utmValue || utmValue <= 0 || !taxTableVersion) {
    return {
      taxableBaseClp,
      taxableBaseUtm: 0,
      utmValue: utmValue ?? 0,
      bracketRate: 0,
      bracketDeductionUtm: 0,
      taxAmountClp: 0,
      taxTableVersion: taxTableVersion ?? 'none',
      computed: false
    }
  }

  const taxableBaseUtm = taxableBaseClp / utmValue

  // Get brackets for this version
  const brackets = await runGreenhousePostgresQuery<TaxBracketRow>(
    `SELECT from_utm, to_utm, rate, deduction_utm
     FROM greenhouse_payroll.chile_tax_brackets
     WHERE tax_table_version = $1
     ORDER BY bracket_order ASC`,
    [taxTableVersion]
  ).catch(() => [] as TaxBracketRow[])

  if (brackets.length === 0) {
    return {
      taxableBaseClp,
      taxableBaseUtm,
      utmValue,
      bracketRate: 0,
      bracketDeductionUtm: 0,
      taxAmountClp: 0,
      taxTableVersion,
      computed: false
    }
  }

  // Find applicable bracket
  let applicableBracket: TaxBracketRow | null = null

  for (const bracket of brackets) {
    const from = toNum(bracket.from_utm)
    const to = bracket.to_utm != null ? toNum(bracket.to_utm) : Infinity

    if (taxableBaseUtm >= from && taxableBaseUtm < to) {
      applicableBracket = bracket
      break
    }
  }

  if (!applicableBracket) {
    // Use last bracket (highest)
    applicableBracket = brackets[brackets.length - 1]
  }

  const rate = toNum(applicableBracket.rate)
  const deductionUtm = toNum(applicableBracket.deduction_utm)

  // tax = (taxableBase_utm * rate - deduction_utm) * utm_value
  const taxUtm = Math.max(0, taxableBaseUtm * rate - deductionUtm)
  const taxAmountClp = Math.round(taxUtm * utmValue)

  return {
    taxableBaseClp,
    taxableBaseUtm: Math.round(taxableBaseUtm * 100) / 100,
    utmValue,
    bracketRate: rate,
    bracketDeductionUtm: deductionUtm,
    taxAmountClp,
    taxTableVersion,
    computed: true
  }
}
