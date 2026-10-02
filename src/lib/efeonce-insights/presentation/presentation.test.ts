import { describe, expect, it, vi } from 'vitest'

import { GH_INSIGHTS } from '@/lib/copy/insights'
import { INSIGHT_SCOPE_CATALOG, INSIGHT_SCOPE_KEYS, scopeChipsFor } from './scope-catalog'

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { InsightWebModelV1 } from '../contracts/web-model'
import { buildDeterministicPlan } from '../editorial/deterministic-planner'
import { validateEditorialPlan } from '../editorial/plan-validation'
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
    expect(defaultReportTitle(['ico'])).toBe('Entrega y cumplimiento')
    expect(defaultReportTitle(['seo', 'aeo'])).toBe('Visibilidad orgánica y respuestas de IA')
    expect(defaultReportTitle(['seo', 'aeo', 'ico'])).toBe('Visibilidad orgánica, respuestas de IA y entrega y cumplimiento')
  })
})

describe('TASK-1957 — plan apto para cliente', () => {
  const plan = buildDeterministicPlan(berelLike, { modules: ['seo', 'aeo'], locale: 'es-CL', editorialV2: true })
  const model = buildInsightWebModel({ plan, facts: berelLike.facts })

  it('el plan nuevo pasa el gate: sin tablas, fechas ISO, límites internos ni figuras sin información', () => {
    expect(clientFitViolations({ model, reportTitle: defaultReportTitle(['seo', 'aeo']), facts: berelLike.facts })).toEqual([])
  })

  it('la cifra protagonista es el cambio cuando la frase lo dice, y el período anterior viaja como vínculo', () => {
    const thesis = model.executiveSummary[0]!

    expect(thesis.text).toContain('-12,1 %')
    expect(thesis.figure).toEqual({ display: '-12,1 %', direction: 'down', kind: 'change' })
    expect(model.facts['seo.clicks']!.comparisonFactId).toBe('seo.clicks.prev')
    // Una frase que no dice el cambio no recibe cifra de cambio.
    expect(model.executiveSummary.filter(claim => claim.figure).every(claim => claim.text.includes(claim.figure!.display))).toBe(true)
  })

  it('el gate rechaza magnitudes incomparables en un eje compartido', () => {
    const shared: InsightWebModelV1 = {
      ...model,
      chapters: model.chapters.map(chapter => ({
        ...chapter,
        charts: chapter.charts.map(chart => ({ ...chart, spec: { ...chart.spec, scale: { kind: 'linear' as const, baseline: 0 as const } } }))
      }))
    }

    expect(clientFitViolations({ model: shared, facts: berelLike.facts }).map(violation => violation.rule)).toContain('shared_axis_incomparable')
  })

  it('compara cada métrica en su escala, descarta la posición en barras y dice el empate de presencia en una frase', () => {
    const seo = plan.chapters.find(chapter => chapter.module === 'seo')!
    const aeo = plan.chapters.find(chapter => chapter.module === 'aeo')!
    const counts = seo.charts.find(chart => chart.unit === 'count')!

    expect(seo.charts.every(chart => chart.unit !== 'position')).toBe(true)
    // Una sola figura: clics, impresiones y keywords contra su período anterior, cada fila en su escala. Partirlas por
    // magnitud dejaba figuras de una barra sin página y el capítulo sin conclusiones (vista previa Berel, 2026-10-02).
    expect(seo.charts.filter(chart => chart.unit === 'count')).toHaveLength(1)
    expect(counts.series.at(-1)!.factIds).toEqual(['seo.clicks', 'seo.impressions', 'seo.keywords_tracked'])
    expect(counts.scale.perDimension).toBe(true)
    expect(seo.readings?.some(reading => reading.chartId === counts.chartId)).toBe(true)
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

describe('TASK-1957 — empates con dueño', () => {
  it('el empate de mención por motor se dice en una frase, sin figura de barras iguales', () => {
    const rate = (provider: string, label: string): EvidenceFactV1 => fact({ factId: `aeo.mention_rate.${provider}`, module: 'aeo', metricId: `mention_rate.${provider}`, label, value: 33.3, unit: 'percent', numerator: 2, denominator: 6, source: 'x', method: { name: 'ai_visibility_grader', version: '1' } })
    const snapshot = { facts: [rate('gemini', 'Mención en Gemini'), rate('openai', 'Mención en ChatGPT')], sources: [], rejections: [] }
    const plan = buildDeterministicPlan(snapshot, { modules: ['aeo'], locale: 'es-CL', editorialV2: true })

    expect(plan.chapters[0]!.charts).toEqual([])
    expect(plan.chapters[0]!.claims[0]).toMatchObject({ text: 'La marca aparece en el 33,3 % de las respuestas de cada motor.', role: 'finding' })
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

describe('TASK-1957 — indicadores estándar de visibilidad en motores de respuesta (skill seo-aeo §07)', () => {
  const pct = (metricId: string, label: string, numerator: number, denominator: number, extra: Partial<EvidenceFactV1> = {}): EvidenceFactV1 =>
    fact({ factId: `aeo.${metricId}`, module: 'aeo', metricId, label, value: Math.round((numerator / denominator) * 1000) / 10, unit: 'percent', numerator, denominator, source: 'x', method: { name: 'ai_visibility_grader', version: '1' }, ...extra })

  const indicators = (rates: number[]) => ({
    facts: [
      pct('mention_rate.openai', 'Mención en ChatGPT', rates[0]!, 6, { channelId: 'chatgpt' }),
      pct('mention_rate.gemini', 'Mención en Gemini', rates[1]!, 6, { channelId: 'gemini' }),
      pct('mention_rate.perplexity', 'Mención en Perplexity', rates[2]!, 6, { channelId: 'perplexity' }),
      pct('share_of_model', 'Share of Model', rates[0]! + rates[1]! + rates[2]!, 18),
      pct('sov.brand', 'Tu marca', 5, 20),
      pct('sov.competitor.ñandu', 'Pinturas Ñandú', 10, 20),
      pct('sov.competitor.otra', 'Otra Marca', 5, 20),
      pct('citation_share', 'Respuestas que citan tu sitio', 1, 8)
    ],
    sources: [],
    rejections: []
  })

  it('cada familia es su figura: mención por motor con canales y Share of Voice frente a competidores; SoM y citas no se comparan en barras', () => {
    const snapshot = indicators([4, 2, 1])
    const plan = buildDeterministicPlan(snapshot, { modules: ['aeo'], locale: 'es-CL', editorialV2: true })
    const chapter = plan.chapters[0]!
    const ids = chapter.charts.map(chart => chart.chartId)

    expect(ids).toEqual(expect.arrayContaining(['chart.aeo.percent.mention-rate', 'chart.aeo.percent.sov']))
    expect(ids).not.toContain('chart.aeo.percent')
    expect(chapter.charts.find(chart => chart.chartId === 'chart.aeo.percent.mention-rate')!.dimensionChannelIds).toEqual(['chatgpt', 'gemini', 'perplexity'])
    expect(chapter.charts.find(chart => chart.chartId === 'chart.aeo.percent.sov')!.title).toBe('Share of Voice frente a competidores')

    const roleOf = (metricId: string) => chapter.claims.find(claim => claim.claimId === `claim.aeo.${metricId}`)?.role
    const textOf = (metricId: string) => chapter.claims.find(claim => claim.claimId === `claim.aeo.${metricId}`)?.text

    expect(roleOf('share_of_model')).toBe('finding')
    expect(roleOf('sov.brand')).toBe('finding')
    expect(roleOf('citation_share')).toBe('finding')
    // El porcentaje lleva su base de respuestas.
    expect(textOf('share_of_model')).toBe('Share of Model: 38,9 % (7 de 18 respuestas).')
    expect(validateEditorialPlan(plan, snapshot)).toEqual([])
    expect(clientFitViolations({ model: buildInsightWebModel({ plan, facts: snapshot.facts }), facts: snapshot.facts })).toEqual([])
  })

  it('la misma tasa en todos los motores se dice en una frase, sin figura', () => {
    const snapshot = indicators([2, 2, 2])
    const plan = buildDeterministicPlan(snapshot, { modules: ['aeo'], locale: 'es-CL', editorialV2: true })
    const chapter = plan.chapters[0]!

    expect(chapter.charts.find(chart => chart.chartId === 'chart.aeo.percent.mention-rate')).toBeUndefined()
    expect(chapter.claims[0]).toMatchObject({ text: 'La marca aparece en el 33,3 % de las respuestas de cada motor.', role: 'finding' })
    expect(validateEditorialPlan(plan, snapshot)).toEqual([])
  })
})

describe('TASK-1957 — el gate compara la razón del límite entera', () => {
  it('«sin datos suficientes» (lector) no se confunde con «sin datos» (interno); la forma interna exacta sí se marca', () => {
    const base: InsightWebModelV1 = { modelVersion: '1.2', locale: 'es-CL', executiveSummary: [], chapters: [], actions: [], limits: [], methodology: [], references: [], facts: {} }
    const rulesOf = (limits: string[]) => clientFitViolations({ model: { ...base, limits }, facts: [] }).map(violation => violation.rule)

    expect(rulesOf(['Share of Voice: sin datos suficientes en este período.'])).toEqual([])
    expect(rulesOf(['Share of Voice: sin datos.'])).toEqual(['internal_limit_wording'])
    expect(rulesOf(['Motores de respuesta: en el período anterior, la fuente no sirve esta ventana con exactitud.'])).toEqual(['internal_limit_wording'])
  })
})

describe('alcance de la portada por servicio', () => {
  it('cada alcance del catálogo tiene etiqueta y un glifo Trazo que existe en AXIS', async () => {
    const { ICON_CATALOG } = await import('@efeoncepro/axis-graphic-line/icons')
    const stroke = new Set(ICON_CATALOG.filter(icon => icon.voice === 'stroke').map(icon => icon.key))

    for (const key of INSIGHT_SCOPE_KEYS) {
      expect(GH_INSIGHTS.scopeChips[key], key).toBeTruthy()
      expect(stroke.has(INSIGHT_SCOPE_CATALOG[key].glyph), `${key} → ${INSIGHT_SCOPE_CATALOG[key].glyph}`).toBe(true)
    }
  })

  it('sin alcance elegido se deriva de los módulos; con alcance, manda el encargo', () => {
    expect(scopeChipsFor(undefined, ['seo', 'aeo']).map(chip => chip.label)).toEqual(['SEO', 'Respuestas de IA'])
    expect(scopeChipsFor(['creative', 'performance'], ['ico'])).toEqual([
      { key: 'creative', label: 'Servicios creativos', glyph: 'contenido', line: 'brand' },
      { key: 'performance', label: 'Performance', glyph: 'medios', line: 'voice' }
    ])
  })
})
