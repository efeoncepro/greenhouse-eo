import { describe, expect, it, vi } from 'vitest'

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { InsightWebModelV1 } from '../contracts/web-model'
import { buildDeterministicPlan } from '../editorial/deterministic-planner'
import { buildInsightWebModel } from '../sharing/web-model'
import { clientFitViolations } from './client-fit-gate'
import { asOfLabelOf, defaultReportTitle, sourceLabelOf, unitLabelOf, windowLabelOf } from './vocabulary'

vi.mock('server-only', () => ({}))

/**
 * TASK-1957 — fixtures DERIVADOS de las ediciones internas reales de Berel (`EO-INS-000027`) y Sky (`EO-INS-000029`)
 * revisadas por el operador el 2026-10-02, con la forma de sus hechos y sin datos del cliente.
 */
const fact = (overrides: Partial<EvidenceFactV1> & Pick<EvidenceFactV1, 'factId' | 'metricId' | 'value' | 'unit'>): EvidenceFactV1 => ({
  factVersion: 'evidence_fact_v1',
  module: 'seo',
  label: overrides.metricId,
  numerator: null,
  denominator: null,
  population: 'p',
  source: 'greenhouse_growth.seo_gsc_daily',
  method: { name: 'gsc_window_aggregate', version: '1' },
  coverage: { kind: 'complete', ratio: 1, populationSize: null },
  freshness: { asOf: '2026-09-20' },
  observation: 'observed',
  window: { start: '2026-09-01', endExclusive: '2026-09-21', granularity: 'period', partial: false },
  evidenceRef: 'ref',
  comparisonFactId: null,
  ...overrides
})

const previous = (current: EvidenceFactV1, value: number): EvidenceFactV1 => ({
  ...current,
  factId: `${current.factId}.prev`,
  value,
  comparisonFactId: null,
  window: { start: '2026-08-12', endExclusive: '2026-09-01', granularity: 'period', partial: false }
})

// El adapter real rotula con el nombre visible del proveedor (`provider_display_label`), nunca con su código.
const PROVIDER_LABEL: Record<string, string> = { gemini: 'Gemini', openai: 'ChatGPT', perplexity: 'Perplexity', google_ai_overview: 'Google AI Overview' }

const presence = (provider: string): EvidenceFactV1 => fact({
  factId: `aeo.presence.${provider}`,
  module: 'aeo',
  metricId: `presence.${provider}`,
  label: `Presencia en ${PROVIDER_LABEL[provider]}`,
  value: 2,
  unit: 'count',
  numerator: 2,
  denominator: 6,
  source: 'greenhouse_growth.grader_runs',
  method: { name: 'ai_visibility_grader', version: '1' }
})

const clicks = fact({ factId: 'seo.clicks', metricId: 'clicks', label: 'Clics orgánicos', value: 9377, unit: 'count', comparisonFactId: 'seo.clicks.prev' })
const impressions = fact({ factId: 'seo.impressions', metricId: 'impressions', label: 'Impresiones', value: 512113, unit: 'count', comparisonFactId: 'seo.impressions.prev' })
const tracked = fact({ factId: 'seo.keywords_tracked', metricId: 'keywords_tracked', label: 'Keywords con medición', value: 31, unit: 'count', comparisonFactId: 'seo.keywords_tracked.prev' })
const position = fact({ factId: 'seo.position', metricId: 'position', label: 'Posición media', value: 6.6, unit: 'position', comparisonFactId: 'seo.position.prev' })

const berelLike = {
  facts: [
    clicks, previous(clicks, 10662),
    impressions, previous(impressions, 566297),
    tracked, previous(tracked, 31),
    position, previous(position, 5.8),
    presence('gemini'), presence('openai'), presence('perplexity'), presence('google_ai_overview')
  ],
  sources: [],
  rejections: [
    { module: 'seo' as const, metricId: 'organic_etv', reason: 'unsupported_window' as const, detail: 'no mensual' },
    { module: 'seo' as const, metricId: 'organic_etv', reason: 'unsupported_window' as const, detail: 'no mensual', scope: 'comparison' as const }
  ]
}

describe('TASK-1957 — vocabulario de presentación', () => {
  it('nombra fuente, unidad, corte, ventana y título sin identificadores', () => {
    expect(sourceLabelOf(clicks)).toBe('Google Search Console')
    expect(sourceLabelOf({ method: { name: 'desconocido', version: '1' } })).toBe('Evidencia sellada de la edición')
    expect(unitLabelOf('count')).toBe('Cantidad')
    expect(unitLabelOf('codigo_raro')).toBe('')
    expect(asOfLabelOf('2026-09-20', 'es-CL')).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(asOfLabelOf(null, 'es-CL')).toBeNull()
    expect(windowLabelOf({ start: '2026-08-01', endExclusive: '2026-09-01', granularity: 'month' }, 'es-CL')).toBe('agosto de 2026')
    // Ventana mal formada (fin = inicio, visto en Sky): se nombra por su inicio, nunca «2026-08-01 a 2026-08-01».
    expect(windowLabelOf({ start: '2026-08-01', endExclusive: '2026-08-01', granularity: 'month' }, 'es-CL')).toBe('agosto de 2026')
    expect(defaultReportTitle(['ico'], { start: '2026-08-01', endExclusive: '2026-09-01' }, 'es-CL')).toBe('Entrega y cumplimiento · agosto de 2026')
  })
})

describe('TASK-1957 — plan apto para cliente', () => {
  const plan = buildDeterministicPlan(berelLike, { modules: ['seo', 'aeo'], locale: 'es-CL', editorialV2: true })
  const model = buildInsightWebModel({ plan, facts: berelLike.facts })

  it('el plan nuevo pasa el gate: sin tablas, fechas ISO, límites internos ni figuras sin información', () => {
    expect(clientFitViolations({ model, reportTitle: defaultReportTitle(['seo', 'aeo'], { start: '2026-09-01', endExclusive: '2026-09-21' }, 'es-CL'), facts: berelLike.facts })).toEqual([])
  })

  it('separa magnitudes, descarta la posición en barras y dice el empate de presencia en una frase', () => {
    const seo = plan.chapters.find(chapter => chapter.module === 'seo')!
    const aeo = plan.chapters.find(chapter => chapter.module === 'aeo')!
    const plotted = seo.charts.flatMap(chart => chart.series.at(-1)!.factIds)

    expect(seo.charts.every(chart => chart.unit !== 'position')).toBe(true)
    expect(seo.charts.some(chart => chart.series.at(-1)!.factIds.includes('seo.impressions') && chart.series.at(-1)!.factIds.includes('seo.keywords_tracked'))).toBe(false)
    expect(plotted).toContain('seo.clicks')
    expect(aeo.charts).toEqual([])
    expect(aeo.claims[0]).toMatchObject({ text: 'La marca aparece en 2 de 6 consultas en cada motor.', role: 'finding' })
    expect(seo.limits).toEqual(['Tráfico orgánico estimado: no forma parte de esta edición.'])
  })

  it('selecciona hallazgos materiales y deja el resto como respaldo', () => {
    const seo = plan.chapters.find(chapter => chapter.module === 'seo')!
    const roleOf = (factId: string) => seo.claims.find(claim => claim.claimId === `claim.${factId}`)?.role

    expect(roleOf('seo.clicks')).toBe('finding')
    expect(roleOf('seo.impressions')).toBe('finding')
    expect(roleOf('seo.keywords_tracked')).toBe('backing')
    expect(seo.claims.filter(claim => claim.role === 'finding').length).toBeLessThanOrEqual(5)
  })
})

describe('TASK-1957 — gate client-fit (derivado del payload)', () => {
  const base: InsightWebModelV1 = {
    modelVersion: '1.2',
    locale: 'es-CL',
    executiveSummary: [],
    chapters: [],
    actions: [],
    limits: [],
    methodology: [],
    references: [],
    facts: {}
  }

  it('detecta las cinco clases de defecto vistas con datos reales', () => {
    const leaky: InsightWebModelV1 = {
      ...base,
      limits: ['Tráfico orgánico estimado: la fuente no sirve esta ventana con exactitud.', 'Tráfico orgánico estimado: en el período anterior, la fuente no sirve esta ventana con exactitud.'],
      references: [{ referenceId: 'r', label: 'Clics orgánicos (2026-09-01 a 2026-09-21)' }],
      facts: { a: { factId: 'a', module: 'seo', label: 'Clics', value: 1, unit: 'count', display: '1', observation: 'observed', source: 'greenhouse_growth.seo_gsc_daily', unitLabel: 'count', asOf: '2026-09-20', asOfLabel: null, absentReason: null } }
    }

    const rules = clientFitViolations({ model: leaky, reportTitle: 'Insights ico 2026-08-01–2026-09-01', facts: [] }).map(violation => violation.rule)

    expect(rules).toEqual(expect.arrayContaining(['internal_identifier', 'raw_unit_code', 'raw_iso_date', 'internal_limit_wording', 'duplicated_limit']))
  })

  it('no castiga los datos estructurados ni el texto correcto', () => {
    const clean: InsightWebModelV1 = {
      ...base,
      limits: ['Tráfico orgánico estimado: no forma parte de esta edición.'],
      facts: { a: { factId: 'seo.clicks.2026-09-01_2026-09-21', module: 'seo', label: 'Clics orgánicos', value: 9377, unit: 'count', display: '9.377', observation: 'observed', source: 'Google Search Console', unitLabel: 'Cantidad', asOf: '2026-09-20', asOfLabel: '20 sept 2026', absentReason: null } }
    }

    expect(clientFitViolations({ model: clean, reportTitle: 'Visibilidad orgánica · septiembre de 2026', facts: [] })).toEqual([])
  })
})
