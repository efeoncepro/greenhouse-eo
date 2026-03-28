import { describe, expect, it } from 'vitest'
import { render } from '@react-email/render'

import PayrollExportReadyEmail from './PayrollExportReadyEmail'

describe('PayrollExportReadyEmail', () => {
  it('renders heading, overline, hero net total, and CTA', async () => {
    const html = await render(
      PayrollExportReadyEmail({
        periodLabel: 'Marzo 2026',
        entryCount: 4,
        grossTotal: '$5,253,242',
        netTotal: '$3,817,656',
        exportedBy: 'julio@efeoncepro.com'
      })
    )

    expect(html).toContain('lang="es"')
    expect(html).toContain('Nómina exportada')
    expect(html).toContain('MARZO 2026')
    expect(html).toContain('$3,817,656')
    expect(html).toContain('Neto a pagar')
    expect(html).toContain('4')
    expect(html).toContain('$5,253,242')
    expect(html).toContain('Ver nómina en Greenhouse')
    expect(html).toContain('julio@efeoncepro.com')
    expect(html).toContain('efeoncepro.com')
  })

  it('renders without exportedBy', async () => {
    const html = await render(
      PayrollExportReadyEmail({
        periodLabel: 'Febrero 2026',
        entryCount: 3,
        grossTotal: '$2,100,000',
        netTotal: '$1,500,000'
      })
    )

    expect(html).toContain('Nómina exportada')
    expect(html).toContain('Febrero 2026')
    expect(html).not.toContain('Exportado por')
  })
})
