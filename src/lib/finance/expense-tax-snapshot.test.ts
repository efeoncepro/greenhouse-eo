import { describe, expect, it } from 'vitest'

import { buildExpenseTaxWriteFields } from '@/lib/finance/expense-tax-snapshot'

describe('buildExpenseTaxWriteFields', () => {
  it('keeps recoverable input VAT out of effective cost', async () => {
    const result = await buildExpenseTaxWriteFields({
      subtotal: 100000,
      exchangeRateToClp: 1,
      taxCode: 'cl_input_vat_credit_19',
      taxAmount: 19000,
      totalAmount: 119000
    })

    expect(result.taxCode).toBe('cl_input_vat_credit_19')
    expect(result.taxRecoverability).toBe('full')
    expect(result.recoverableTaxAmount).toBe(19000)
    expect(result.nonRecoverableTaxAmount).toBe(0)
    expect(result.effectiveCostAmount).toBe(100000)
    expect(result.effectiveCostAmountClp).toBe(100000)
  })

  it('capitalizes non-recoverable VAT into effective cost', async () => {
    const result = await buildExpenseTaxWriteFields({
      subtotal: 100000,
      exchangeRateToClp: 1,
      taxCode: 'cl_input_vat_non_recoverable_19',
      taxAmount: 19000,
      totalAmount: 119000,
      vatUnrecoverableAmount: 19000
    })

    expect(result.taxRecoverability).toBe('none')
    expect(result.recoverableTaxAmount).toBe(0)
    expect(result.nonRecoverableTaxAmount).toBe(19000)
    expect(result.effectiveCostAmount).toBe(119000)
  })

  it('marks common-use VAT as partial and only capitalizes explicit unrecoverable amount', async () => {
    const result = await buildExpenseTaxWriteFields({
      subtotal: 100000,
      exchangeRateToClp: 1,
      taxAmount: 19000,
      totalAmount: 119000,
      vatUnrecoverableAmount: 4000,
      vatCommonUseAmount: 5000
    })

    expect(result.taxCode).toBe('cl_input_vat_credit_19')
    expect(result.taxRecoverability).toBe('partial')
    expect(result.recoverableTaxAmount).toBe(15000)
    expect(result.nonRecoverableTaxAmount).toBe(4000)
    expect(result.effectiveCostAmount).toBe(104000)
  })

  it('treats exempt purchases as tax-not-applicable', async () => {
    const result = await buildExpenseTaxWriteFields({
      subtotal: 50000,
      exchangeRateToClp: 1,
      dteTypeCode: '34',
      exemptAmount: 50000,
      taxAmount: 0,
      totalAmount: 50000
    })

    expect(result.taxCode).toBe('cl_vat_exempt')
    expect(result.taxRecoverability).toBe('not_applicable')
    expect(result.taxAmount).toBe(0)
    expect(result.effectiveCostAmount).toBe(50000)
  })
})
