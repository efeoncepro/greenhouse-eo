import { describe, expect, it } from 'vitest'

import { buildIncomeTaxWriteFields } from '@/lib/finance/income-tax-snapshot'
import { FinanceValidationError } from '@/lib/finance/shared'

/**
 * TASK-1209 — income tax snapshot must account for the exempt amount in the
 * documental total. A Chilean DTE identity is `total = neto_afecto + IVA +
 * exento`. A 100% exempt document (export DTE 110/111/112, factura exenta 34,
 * boleta exenta 41) carries net_amount=0 and the whole value in exempt_amount.
 *
 * Before the fix, `buildIncomeTaxWriteFields` computed expectedTotal from the
 * tax-pure snapshot (base_afecta + IVA) and ignored the exempt component, so a
 * fully-exempt invoice produced expectedTotal=0 and threw
 * `totalAmount does not match the resolved tax snapshot (0)` — blocking the
 * projection of EVERY exempt invoice (root cause of the Berel gap).
 */
describe('buildIncomeTaxWriteFields — exempt amount in total (TASK-1209)', () => {
  it('projects a 100% exempt export invoice (Berel 28800562 fixture) without throwing', async () => {
    // Berel DTE 110: net_amount=0, exempt_amount=total=4.617.647 CLP.
    const fields = await buildIncomeTaxWriteFields({
      subtotal: 0,
      taxCode: 'cl_vat_exempt',
      taxAmount: 0,
      totalAmount: 4617647,
      exemptAmount: 4617647,
      dteTypeCode: '110'
    })

    expect(fields.totalAmount).toBe(4617647)
    expect(fields.taxAmount).toBe(0)
    expect(fields.isTaxExempt).toBe(true)
    // The tax snapshot stays tax-pure (taxable base = 0): the exempt amount is
    // NOT folded into the taxable base — vat-ledger reads it as ventas exentas.
    expect(fields.taxSnapshot.taxableAmount).toBe(0)
    expect(fields.taxSnapshot.totalAmount).toBe(0)
  })

  it('projects the second Berel export invoice (29062197) fixture', async () => {
    const fields = await buildIncomeTaxWriteFields({
      subtotal: 0,
      taxCode: 'cl_vat_exempt',
      taxAmount: 0,
      totalAmount: 4463462,
      exemptAmount: 4463462,
      dteTypeCode: '110'
    })

    expect(fields.totalAmount).toBe(4463462)
    expect(fields.isTaxExempt).toBe(true)
  })

  it('handles a mixed afecto + exento document (total = neto + IVA + exento)', async () => {
    const fields = await buildIncomeTaxWriteFields({
      subtotal: 1000000,
      taxCode: 'cl_vat_19',
      taxAmount: 190000,
      totalAmount: 1690000, // 1.000.000 + 190.000 IVA + 500.000 exento
      exemptAmount: 500000
    })

    expect(fields.totalAmount).toBe(1690000)
    expect(fields.taxAmount).toBe(190000)
    // taxable base unchanged by the exempt component
    expect(fields.taxSnapshot.taxableAmount).toBe(1000000)
  })

  it('regression: affected-only invoice (exempt=0) is bit-for-bit unchanged', async () => {
    const withoutExempt = await buildIncomeTaxWriteFields({
      subtotal: 1000000,
      taxCode: 'cl_vat_19',
      taxAmount: 190000,
      totalAmount: 1190000
    })

    const withZeroExempt = await buildIncomeTaxWriteFields({
      subtotal: 1000000,
      taxCode: 'cl_vat_19',
      taxAmount: 190000,
      totalAmount: 1190000,
      exemptAmount: 0
    })

    expect(withoutExempt.totalAmount).toBe(1190000)
    expect(withZeroExempt.totalAmount).toBe(1190000)
  })

  it('still rejects a genuinely inconsistent total (defense is preserved)', async () => {
    await expect(
      buildIncomeTaxWriteFields({
        subtotal: 0,
        taxCode: 'cl_vat_exempt',
        taxAmount: 0,
        totalAmount: 4617647,
        exemptAmount: 1000000 // exempt does not cover the declared total
      })
    ).rejects.toBeInstanceOf(FinanceValidationError)
  })
})
