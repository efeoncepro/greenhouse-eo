/**
 * TASK-960 / TASK-980 — clasificador de régimen del contractor (pure).
 */
import { describe, expect, it } from 'vitest'

import { deriveContractorRemittanceRegime, toContractorReportRegimeGroup } from './regime'

const eng = (relationshipSubtype: string, paymentCurrency: string | null = null) =>
  ({ relationshipSubtype, paymentCurrency }) as Parameters<typeof deriveContractorRemittanceRegime>[0]

const pay = (currency: string, withholdingAmount: number, paymentCurrency: string | null = null) =>
  ({ currency, withholdingAmount, paymentCurrency }) as Parameters<typeof deriveContractorRemittanceRegime>[1]

describe('deriveContractorRemittanceRegime', () => {
  it('honorarios_cl → honorarios_cl (precede a todo)', () => {
    expect(deriveContractorRemittanceRegime(eng('honorarios_cl'), pay('CLP', 15250))).toBe('honorarios_cl')
  })

  it('cross-currency (paymentCurrency ≠ currency) → cross_currency', () => {
    expect(deriveContractorRemittanceRegime(eng('freelance', 'USD'), pay('CLP', 0))).toBe('cross_currency')
  })

  it('withholding > 0 sin honorarios ni FX → international_withholding', () => {
    expect(deriveContractorRemittanceRegime(eng('international_contractor'), pay('USD', 50))).toBe(
      'international_withholding'
    )
  })

  it('default → provider_managed', () => {
    expect(deriveContractorRemittanceRegime(eng('provider_platform'), pay('USD', 0))).toBe('provider_managed')
  })
})

describe('toContractorReportRegimeGroup', () => {
  it('honorarios_cl → grupo honorarios_cl', () => {
    expect(toContractorReportRegimeGroup('honorarios_cl')).toBe('honorarios_cl')
  })

  it('los otros 3 régimenes → grupo international', () => {
    expect(toContractorReportRegimeGroup('international_withholding')).toBe('international')
    expect(toContractorReportRegimeGroup('provider_managed')).toBe('international')
    expect(toContractorReportRegimeGroup('cross_currency')).toBe('international')
  })
})
