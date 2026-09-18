import { describe, expect, it } from 'vitest'

import { formatSearchResult } from '../licitalab-format'
import { filterRadarOpportunities, type RadarOpportunity } from '../licitalab-search'

const row = (overrides: Partial<RadarOpportunity>): RadarOpportunity => ({
  code: '1-1-LE26',
  title: null,
  scorePct: null,
  buyer: null,
  buyerRegion: null,
  amountText: null,
  closeText: null,
  ...overrides
})

describe('pnpm licitalab search', () => {
  const rows = [
    row({ code: '5955-400-COT26', title: 'Plan De Medios', buyer: 'I MUNICIPALIDAD DE LAGO RANCO', buyerRegion: 'Región de Los Ríos' }),
    row({ code: '2427-73-LE26', title: 'Suministro de Marketing Digital', buyer: 'I MUNICIPALIDAD DE VALPARAISO', buyerRegion: 'Región de Valparaíso' })
  ]

  it('--match exige todos los términos, sin tildes ni mayúsculas', () => {
    expect(filterRadarOpportunities(rows, 'marketing VALPARAÍSO').map(r => r.code)).toEqual(['2427-73-LE26'])
    expect(filterRadarOpportunities(rows, 'region')).toHaveLength(2)
    expect(filterRadarOpportunities(rows, 'marketing rios')).toHaveLength(0)
    expect(filterRadarOpportunities(rows, '  ')).toHaveLength(2)
  })

  it('la salida enriquecida separa ficha y documentos y recuerda que el score no es un GO', () => {
    const text = formatSearchResult({
      view: 'all',
      collected: 2,
      match: 'marketing',
      reportPath: '.auth/licitalab-radar-reports/x.json',
      enriched: true,
      opportunities: [
        {
          ...rows[1],
          scorePct: 41,
          detail: { status: 'Publicada', type: 'tender', estimatedAmount: 14000000, currency: 'CLP', closesAt: '2026-09-03T20:00:00.000Z' },
          documents: null,
          documentsError: 'HTTP 500'
        }
      ]
    })

    expect(text).toContain('Todas · 2 recolectadas · filtro "marketing": 1')
    expect(text).toContain('1. [41%] 2427-73-LE26 · Suministro de Marketing Digital')
    expect(text).toContain('Ficha: Publicada · tender · estimado CLP 14.000.000 · cierre 2026-09-03')
    expect(text).toContain('Documentos: no disponibles (HTTP 500)')
    expect(text).toContain('no un GO')
  })
})
