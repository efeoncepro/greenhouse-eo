import { describe, expect, it } from 'vitest'
import { render } from '@react-email/render'

import PayrollReceiptEmail from './PayrollReceiptEmail'

describe('PayrollReceiptEmail', () => {
  it('renders the Chile receipt summary with branding and CTA', async () => {
    const html = await render(
      PayrollReceiptEmail({
        fullName: 'Valentina Hoyos',
        periodYear: 2026,
        periodMonth: 3,
        entryCurrency: 'CLP',
        grossTotal: 832121,
        totalDeductions: 236465,
        netTotal: 595656,
        payRegime: 'chile'
      })
    )

    expect(html).toContain('lang="es"')
    expect(html).toContain('Liquidación de remuneraciones')
    expect(html).toContain('Valentina')
    expect(html).toContain('$832.121')
    expect(html).toContain('$595.656')
    expect(html).toContain('Abrir mi nómina')
  })

  it('renders the international receipt summary in USD', async () => {
    const html = await render(
      PayrollReceiptEmail({
        fullName: 'Andres Carlosama',
        periodYear: 2026,
        periodMonth: 3,
        entryCurrency: 'USD',
        grossTotal: 800.21,
        totalDeductions: 0,
        netTotal: 800.21,
        payRegime: 'international'
      })
    )

    expect(html).toContain('lang="en"')
    expect(html).toContain('Payment statement')
    expect(html).toContain('US$800.21')
    expect(html).toContain('International')
  })
})
