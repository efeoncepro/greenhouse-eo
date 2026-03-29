import { describe, expect, it } from 'vitest'
import { render } from '@react-email/render'

import PayrollExportReadyEmail from './PayrollExportReadyEmail'

describe('PayrollExportReadyEmail', () => {
  it('renders multi-currency breakdowns with full metadata', async () => {
    const html = await render(
      PayrollExportReadyEmail({
        periodLabel: 'Marzo 2026',
        entryCount: 4,
        breakdowns: [
          { currency: 'CLP', regimeLabel: 'Chile', grossTotal: '$832.121', netTotal: '$595.657', entryCount: 2 },
          { currency: 'USD', regimeLabel: 'Internacional', grossTotal: 'US$2,696.27', netTotal: 'US$2,696.27', entryCount: 2 }
        ],
        netTotalDisplay: '$595.657 + US$2,696.27',
        exportedBy: 'julio@efeoncepro.com',
        exportedAt: '28 mar 2026, 13:04'
      })
    )

    expect(html).toContain('lang="es"')
    expect(html).toContain('Nómina cerrada y lista para revisión')
    expect(html).toContain('MARZO 2026')
    expect(html).toContain('4')

    // Per-regime breakdowns
    expect(html).toContain('Chile (CLP)')
    expect(html).toContain('Internacional (USD)')
    expect(html).toContain('$832.121')
    expect(html).toContain('$595.657')
    expect(html).toContain('US$2,696.27')

    // Net total hero
    expect(html).toContain('Neto total a pagar')
    expect(html).toContain('$595.657 + US$2,696.27')

    // Attachments section
    expect(html).toContain('Adjuntos incluidos')
    expect(html).toContain('Reporte de nómina (PDF)')
    expect(html).toContain('Detalle de nómina (CSV)')

    // Metadata
    expect(html).toContain('julio@efeoncepro.com')
    expect(html).toContain('28 mar 2026, 13:04')

    // CTA and footer
    expect(html).toContain('Ver nómina en Greenhouse')
    expect(html).toContain('efeoncepro.com')
  })

  it('renders single-currency (Chile only) without metadata', async () => {
    const html = await render(
      PayrollExportReadyEmail({
        periodLabel: 'Febrero 2026',
        entryCount: 3,
        breakdowns: [
          { currency: 'CLP', regimeLabel: 'Chile', grossTotal: '$5.253.242', netTotal: '$3.817.656', entryCount: 3 }
        ],
        netTotalDisplay: '$3.817.656'
      })
    )

    expect(html).toContain('Nómina cerrada y lista para revisión')
    expect(html).toContain('Febrero 2026')
    expect(html).toContain('Chile (CLP)')
    expect(html).toContain('$5.253.242')
    expect(html).toContain('$3.817.656')
    expect(html).not.toContain('Exportado por')
    expect(html).not.toContain('Internacional')
  })

  it('renders attachments section with descriptions', async () => {
    const html = await render(
      PayrollExportReadyEmail({
        periodLabel: 'Enero 2026',
        entryCount: 2,
        breakdowns: [
          { currency: 'CLP', regimeLabel: 'Chile', grossTotal: '$1.000.000', netTotal: '$750.000', entryCount: 2 }
        ],
        netTotalDisplay: '$750.000'
      })
    )

    expect(html).toContain('Resumen por colaborador en formato imprimible')
    expect(html).toContain('Desglose completo para contabilidad')
  })
})
