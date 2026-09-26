import { describe, expect, it, vi } from 'vitest'

import type { EvidenceFactV1, EvidenceSnapshotContentV1 } from '../contracts/evidence'
import { authorPlanWithBoundedAi, INSIGHTS_AUTHORING_PROMPT_VERSION_V2 } from './ai-authoring'
import { buildDeterministicPlan } from './deterministic-planner'
import { assertChartsAllowed } from './editorial-v2'
import { FAMILY_EVIDENCE_MATRIX, canProduceFamily } from './family-evidence-matrix'
import { validateEditorialPlan } from './plan-validation'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/ai/google-genai', () => ({ generateStructuredGemini: vi.fn() }))

/**
 * TASK-1888 Slice 3 — productores del contrato editorial v2: emiten sólo lo que la matriz autoriza, cada cifra de
 * cada lectura cita su hecho, y con el flag apagado el plan es exactamente v1.
 */

const monthWindow = (month: string) => ({ start: `${month}-01`, endExclusive: `${month}-01`, granularity: 'month' as const, partial: false })

const ico = (metricId: string, month: string, value: number, unit: EvidenceFactV1['unit'], extra: Partial<EvidenceFactV1> = {}): EvidenceFactV1 => ({
  factVersion: 'evidence_fact_v1',
  factId: `ico.${metricId}.w.sp-1.${month}`,
  module: 'ico',
  metricId,
  label: `${metricId.toUpperCase()} · Sky Airline · ${month}`,
  value,
  unit,
  numerator: null,
  denominator: null,
  population: 'p',
  source: 's',
  method: { name: 'ico_engine_monthly', version: '1' },
  coverage: { kind: 'complete', ratio: 1, populationSize: 20 },
  freshness: { asOf: '2026-09-02T03:00:00.000Z' },
  observation: 'observed',
  window: monthWindow(month),
  evidenceRef: 'space:sp-1',
  comparisonFactId: null,
  dimension: { spaceId: 'sp-1', spaceName: 'Sky Airline', month },
  ...extra
})

const target = (metricId: string, value: number, unit: EvidenceFactV1['unit'], direction: 'higher_is_better' | 'lower_is_better'): EvidenceFactV1 => ({
  ...ico(`target.${metricId}`, '2026-06', value, unit),
  factId: `ico.target.${metricId}.w`,
  label: `Meta ${metricId}`,
  window: { start: '2026-06-01', endExclusive: '2026-09-01', granularity: 'period', partial: false },
  dimension: { metric: metricId, direction },
  role: 'reference'
})

const months = ['2026-06', '2026-07', '2026-08']

const icoSnapshot: EvidenceSnapshotContentV1 = {
  facts: [
    ...months.map((month, index) => ico('otd', month, [78.4, 80.1, 81.9][index]!, 'percent')),
    ...months.map((month, index) => ico('ftr', month, [82, 84.5, 86][index]!, 'percent')),
    ...months.map((month, index) => ico('rpa', month, [1.5, 1.44, 1.33][index]!, 'ratio')),
    target('otd', 90, 'percent', 'higher_is_better'),
    target('ftr', 80, 'percent', 'higher_is_better'),
    target('rpa', 1.5, 'ratio', 'lower_is_better')
  ],
  sources: [],
  rejections: []
}

const aeo = (provider: string, present: number, channelId?: EvidenceFactV1['channelId']): EvidenceFactV1 => ({
  ...ico(`presence.${provider}`, '2026-08', present, 'count'),
  factId: `aeo.presence.${provider}.w`,
  module: 'aeo',
  label: `Presencia en ${provider}`,
  numerator: present,
  denominator: 10,
  window: { start: '2026-08-01', endExclusive: '2026-09-01', granularity: 'period', partial: false },
  dimension: { provider },
  ...(channelId ? { channelId } : {})
})

const aeoSnapshot: EvidenceSnapshotContentV1 = {
  facts: [aeo('openai', 6, 'chatgpt'), aeo('anthropic', 4, 'claude'), aeo('mistral', 2)],
  sources: [],
  rejections: []
}

const v2 = (snapshot: EvidenceSnapshotContentV1, modules: Array<'seo' | 'aeo' | 'ico'>) => buildDeterministicPlan(snapshot, { modules, locale: 'es-CL', editorialV2: true })

describe('TASK-1888 — productores v2 (ICO)', () => {
  it('emite bullet por métrica contra la meta del registro y línea mensual con ≥ 3 meses; el plan valida', () => {
    const plan = v2(icoSnapshot, ['ico'])
    const chapter = plan.chapters[0]!

    expect(chapter.charts.map(chart => chart.family).sort()).toEqual(['bar', 'bar', 'bullet', 'bullet', 'bullet', 'line', 'line', 'line'])
    expect(validateEditorialPlan(plan, icoSnapshot)).toEqual([])

    const otd = chapter.charts.find(chart => chart.chartId === 'chart.ico.bullet.otd')!

    expect(otd.data).toEqual({
      kind: 'bullet',
      direction: 'higher_is_better',
      items: [{ itemId: 'chart.ico.bullet.otd.ico.otd.w.sp-1.2026-08', label: 'Sky Airline', valueFactId: 'ico.otd.w.sp-1.2026-08', targetFactId: 'ico.target.otd.w' }]
    })
    expect(chapter.charts.find(chart => chart.chartId === 'chart.ico.bullet.rpa')!.data).toMatchObject({ direction: 'lower_is_better' })
  })

  it('con banda del registro, cada ítem del bullet la cita; sin banda, el bullet sigue válido', () => {
    const band = { ...target('otd', 70, 'percent', 'higher_is_better'), factId: 'ico.band.otd.w', metricId: 'band.otd', label: 'Umbral otd' }
    const withBand = { ...icoSnapshot, facts: [...icoSnapshot.facts, band] }
    const plan = v2(withBand, ['ico'])
    const otd = plan.chapters[0]!.charts.find(chart => chart.chartId === 'chart.ico.bullet.otd')!

    expect(otd.data).toMatchObject({ items: [{ bandFactId: 'ico.band.otd.w', targetFactId: 'ico.target.otd.w' }] })
    expect(validateEditorialPlan(plan, withBand)).toEqual([])
    expect(plan.chapters[0]!.charts.filter(chart => chart.family === 'bullet')).toHaveLength(3)
    expect((v2(icoSnapshot, ['ico']).chapters[0]!.charts.find(chart => chart.chartId === 'chart.ico.bullet.otd')!.data as { items: object[] }).items[0]).not.toHaveProperty('bandFactId')
  })

  it('la lectura es factual: posición contra la meta y un próximo paso SÓLO si hay brecha', () => {
    const chapter = v2(icoSnapshot, ['ico']).chapters[0]!
    const reading = (chartId: string) => chapter.readings!.find(item => item.chartId === chartId)!

    // Conclusión = el hecho contra su META (no la comparación de períodos); con un solo space no hay «Lo que significa»
    // porque repetiría la conclusión (hallazgo de 1846 en los PDF reales de Sky y Berel).
    // Un solo space: el encabezado ya lo nombra, así que la frase no lo repite como sujeto.
    expect(reading('chart.ico.bullet.otd').conclusion!.text).toBe('No alcanza la meta de entregas a tiempo: 81,9 % (meta 90,0 %).')
    // Sin comparable en este fixture (los meses son hechos independientes), no hay «Lo que significa».
    expect(reading('chart.ico.bullet.otd').meaning).toBeUndefined()
    expect(reading('chart.ico.bullet.otd').keyFigure!.caption.text).toBe('Entregas a tiempo.')
    expect(reading('chart.ico.bullet.otd').keyFigure).toMatchObject({ factId: 'ico.otd.w.sp-1.2026-08', value: '81,9 %' })
    // «Revisar primero X» sólo con dos o más spaces: con uno no hay entre qué elegir.
    expect(reading('chart.ico.bullet.otd').nextStep).toBeNull()
    // FTR 86 sobre la meta de 80 y RpA 1,33 bajo el techo de 1,5: alcanzadas ⇒ sin próximo paso inventado.
    expect(reading('chart.ico.bullet.ftr').nextStep).toBeNull()
    // RpA mejora al bajar: 1,33 bajo el techo de 1,5 CUMPLE la meta.
    expect(reading('chart.ico.bullet.rpa').conclusion!.text).toBe('Cumple la meta de rondas de revisión por pieza: 1,33 (meta 1,50).')
    expect(reading('chart.ico.bullet.rpa').nextStep).toBeNull()
    expect(reading('chart.ico.line.otd').conclusion!.text).toBe('Entregas a tiempo: de 78,4 % en 2026-06 a 81,9 % en 2026-08.')
    expect(reading('chart.ico.line.rpa').conclusion!.text).toBe('Rondas de revisión por pieza: de 1,50 en 2026-06 a 1,33 en 2026-08.')
    expect(reading('chart.ico.line.otd').meaning).toBeUndefined()
    // Barras sin período anterior: el hallazgo es la cifra más alta de la figura (selección, sin cifras nuevas).
    // Nombre humano de la métrica; como la ventana tiene tres meses, el mes se dice.
    expect(reading('chart.ico.percent').conclusion!.text).toBe('La cifra más alta es Primera entrega correcta (2026-08): 86,0 %.')
    expect(reading('chart.ico.percent').meaning).toBeUndefined()

    for (const item of chapter.readings!) expect(item.meaning?.text).not.toBe(item.conclusion?.text)
    expect(chapter.opening!.factIds).toEqual([])
  })

  it('las metas son hechos de referencia: no generan claims, tablas ni referencias', () => {
    const plan = v2(icoSnapshot, ['ico'])
    const chapter = plan.chapters[0]!

    expect(chapter.claims.some(claim => claim.factIds.some(id => id.startsWith('ico.target')))).toBe(false)
    expect(chapter.tables[0]!.rows).toHaveLength(9)
    expect(plan.references.some(reference => reference.referenceId.includes('target'))).toBe(false)
  })

  it('con período anterior: la barra afirma el MAYOR CAMBIO y el bullet sitúa el dato contra el período (caso Sky)', () => {
    const cur = (metricId: string, value: number, unit: EvidenceFactV1['unit']) => ico(metricId, '2026-08', value, unit, { factId: `ico.${metricId}.cur`, comparisonFactId: `ico.${metricId}.prev` })
    const prev = (metricId: string, value: number, unit: EvidenceFactV1['unit']) => ico(metricId, '2026-07', value, unit, { factId: `ico.${metricId}.prev` })
    const snapshot = { facts: [cur('otd', 81.9, 'percent'), prev('otd', 80.1, 'percent'), cur('ftr', 90.9, 'percent'), prev('ftr', 96.5, 'percent'), target('otd', 90, 'percent', 'higher_is_better'), target('ftr', 80, 'percent', 'higher_is_better')], sources: [], rejections: [] }
    const plan = v2(snapshot, ['ico'])
    const reading = (chartId: string) => plan.chapters[0]!.readings!.find(item => item.chartId === chartId)!

    expect(validateEditorialPlan(plan, snapshot)).toEqual([])
    // FTR -5,6 pp pesa más que OTD +1,8 pp: el mayor cambio es FTR.
    expect(reading('chart.ico.percent').conclusion!.text).toBe('El mayor cambio fue en primera entrega correcta: de 96,5 % a 90,9 % (-5,6 pp).')
    expect(reading('chart.ico.bullet.ftr').conclusion!.text).toBe('Cumple la meta de primera entrega correcta: 90,9 % (meta 80,0 %).')
    expect(reading('chart.ico.bullet.ftr').meaning!.text).toBe('Contra el período anterior: de 96,5 % a 90,9 % (-5,6 pp).')
    // Tesis = la única meta sin cumplir (selección, sin cifra nueva); la bajada, el siguiente hallazgo sobre OTRO hecho.
    expect(plan.executiveSummary.map(item => item.text)).toEqual([
      'Entregas a tiempo es la única meta sin cumplir: 81,9 % (meta 90,0 %).',
      'Cumple la meta de primera entrega correcta: 90,9 % (meta 80,0 %).'
    ])
    // Un hecho, una esencial: ni los de la tesis y su bajada, ni FTR dos veces (mayor cambio y meta).
    const essentialFacts = plan.essentials!.map(item => item.factIds[0])

    expect(essentialFacts).not.toContain('ico.otd.cur')
    expect(essentialFacts).not.toContain('ico.ftr.cur')
    expect(new Set(essentialFacts).size).toBe(essentialFacts.length)
  })

  it('con dos meses no hay línea (la matriz exige ≥ 3 puntos)', () => {
    const twoMonths = { ...icoSnapshot, facts: icoSnapshot.facts.filter(fact => fact.dimension?.month !== '2026-06' || fact.role === 'reference') }

    expect(v2(twoMonths, ['ico']).chapters[0]!.charts.some(chart => chart.family === 'line')).toBe(false)
  })

  it('esenciales ≤ 5 y líneas de alcance en el orden de los módulos', () => {
    const plan = buildDeterministicPlan({ ...icoSnapshot, facts: [...icoSnapshot.facts, ...aeoSnapshot.facts] }, { modules: ['aeo', 'ico'], locale: 'es-CL', editorialV2: true })

    expect(plan.executiveSummary[0]!.text).toBe('Entregas a tiempo es la única meta sin cumplir: 81,9 % (meta 90,0 %).')
    expect(plan.executiveSummary[1]!.factIds[0]).toBe('aeo.presence.openai.w')
    expect(plan.essentials!.length).toBeLessThanOrEqual(5)
    expect(plan.essentials!.map(item => item.factIds[0])).not.toContain('aeo.presence.openai.w')
    expect(new Set(plan.essentials!.map(item => item.factIds[0])).size).toBe(plan.essentials!.length)
    expect(plan.scopeLines).toHaveLength(2)
    expect(plan.scopeLines![0]).toMatch(/^Motores de respuesta/)
  })

  it('con el flag apagado el plan es v1: sin familias nuevas, lecturas, esenciales ni alcance', () => {
    const plan = buildDeterministicPlan(icoSnapshot, { modules: ['ico'], locale: 'es-CL' })

    expect(plan.chapters[0]!.charts.map(chart => chart.family)).toEqual(['bar', 'bar'])
    expect(plan.chapters[0]!.readings).toBeUndefined()
    expect(plan.chapters[0]!.opening).toBeUndefined()
    expect(plan.essentials).toBeUndefined()
    expect(plan.scopeLines).toBeUndefined()
    expect(plan.chapters[0]!.charts[0]!.dimensionChannelIds).toBeUndefined()
  })
})

describe('TASK-1888 — canales y matriz', () => {
  it('las dimensiones de presencia llevan channelId; un proveedor desconocido queda en null y no rompe', () => {
    const plan = v2(aeoSnapshot, ['aeo'])
    const chart = plan.chapters[0]!.charts[0]!

    expect(chart.family).toBe('bar')
    expect(chart.dimensionChannelIds).toEqual(['chatgpt', 'claude', null])
    expect(validateEditorialPlan(plan, aeoSnapshot)).toEqual([])
  })

  it('si todo el gráfico mide UN canal (SEO: todo es Google), el canal va en la serie, no en cada dimensión', () => {
    const seo = (metricId: string, value: number): EvidenceFactV1 => ({ ...aeo(metricId, value), factId: `seo.${metricId}.w`, module: 'seo', metricId, label: metricId, numerator: null, denominator: null, dimension: undefined, channelId: 'google' })
    const snapshot = { facts: [seo('clicks', 9377), seo('impressions', 512113)], sources: [], rejections: [] }
    const chart = v2(snapshot, ['seo']).chapters[0]!.charts[0]!

    expect(chart.dimensionChannelIds).toBeUndefined()
    expect(chart.series.map(series => series.channelId)).toEqual(['google'])
    expect(validateEditorialPlan(v2(snapshot, ['seo']), snapshot)).toEqual([])
  })

  it('ningún productor emite una familia sin evidencia; la matriz es la autoridad', () => {
    const plans = [v2(icoSnapshot, ['ico']), v2(aeoSnapshot, ['aeo'])]

    for (const plan of plans) {
      for (const chapter of plan.chapters) {
        for (const chart of chapter.charts) expect(canProduceFamily(chart.family, chapter.module), `${chart.family} en ${chapter.module}`).toBe(true)
      }
    }

    expect(FAMILY_EVIDENCE_MATRIX).toHaveLength(15)
    expect(FAMILY_EVIDENCE_MATRIX.filter(row => row.verdict === 'producer_now').map(row => row.family)).toEqual(['bar', 'bar_grouped', 'line', 'bullet'])
    expect(() => assertChartsAllowed('ico', [{ ...v2(icoSnapshot, ['ico']).chapters[0]!.charts[0]!, family: 'donut' }])).toThrow(/matriz/)
  })
})

describe('TASK-1888 — topes, varios spaces y verbos por familia', () => {
  it('con dos spaces: el sujeto es el space con mayor brecha y hay próximo paso', () => {
    const second = (metricId: string, value: number) => ({ ...ico(metricId, '2026-08', value, 'percent'), factId: `ico.${metricId}.w.sp-2.2026-08`, label: `${metricId.toUpperCase()} · Sky Cargo · 2026-08`, dimension: { spaceId: 'sp-2', spaceName: 'Sky Cargo', month: '2026-08' } })
    const snapshot = { facts: [ico('otd', '2026-08', 92, 'percent'), second('otd', 71), target('otd', 90, 'percent', 'higher_is_better')], sources: [], rejections: [] }
    const reading = v2(snapshot, ['ico']).chapters[0]!.readings!.find(item => item.chartId === 'chart.ico.bullet.otd')!

    expect(reading.conclusion!.text).toBe('Sky Cargo no alcanza la meta de entregas a tiempo: 71,0 % (meta 90,0 %).')
    expect(reading.meaning!.text).toBe('Sky Airline: 92,0 % (meta 90,0 %); Sky Cargo: 71,0 % (meta 90,0 %).')
    expect(reading.nextStep!.text).toBe('Revisar primero Sky Cargo: es donde la distancia con la meta es mayor.')
  })

  it('la presencia por motor se dice con su verbo y su total; una posición varía en posiciones', () => {
    const plan = v2(aeoSnapshot, ['aeo'])

    expect(plan.chapters[0]!.readings![0]!.conclusion!.text).toBe('ChatGPT es el motor que más menciona la marca: 6 de 10.')

    const position = (factId: string, value: number, comparisonFactId: string | null) => ({ ...aeo('x', value), factId, module: 'seo' as const, metricId: 'position', label: 'Posición media', unit: 'position' as const, numerator: null, denominator: null, dimension: undefined, comparisonFactId })
    const ctr = (factId: string, value: number, comparisonFactId: string | null) => ({ ...position(factId, value, comparisonFactId), metricId: 'rank', label: 'Posición de marca' })
    const snapshot = { facts: [position('p.cur', 6.6, 'p.prev'), position('p.prev', 5.8, null), ctr('r.cur', 3.1, 'r.prev'), ctr('r.prev', 3.0, null)], sources: [], rejections: [] }
    const seo = v2(snapshot, ['seo'])

    expect(seo.chapters[0]!.readings![0]!.conclusion!.text).toBe('El mayor cambio fue en posición media: de #5,8 a #6,6 (+0,8 pos.).')
    expect(validateEditorialPlan(seo, snapshot)).toEqual([])
  })

  it('una esencial nunca cita un hecho sin página (caso Berel: CTR solo en su figura, que no se dibuja)', () => {
    const seo = (metricId: string, value: number, unit: EvidenceFactV1['unit'], comparisonFactId: string | null = null): EvidenceFactV1 => ({ ...aeo(metricId, value), factId: `seo.${metricId}`, module: 'seo', metricId, label: metricId, unit, numerator: null, denominator: null, dimension: undefined, channelId: 'google', comparisonFactId })

    const snapshot = {
      facts: [seo('clicks', 9377, 'count', 'seo.clicks.prev'), { ...seo('clicks', 10662, 'count'), factId: 'seo.clicks.prev' }, seo('impressions', 512113, 'count', 'seo.impressions.prev'), { ...seo('impressions', 566297, 'count'), factId: 'seo.impressions.prev' }, seo('ctr', 1.83, 'percent', 'seo.ctr.prev'), { ...seo('ctr', 1.87, 'percent'), factId: 'seo.ctr.prev' }],
      sources: [],
      rejections: []
    }

    const plan = v2(snapshot, ['seo'])

    expect(plan.chapters[0]!.charts.find(chart => chart.chartId === 'chart.seo.percent')).toBeDefined()
    expect(plan.essentials!.flatMap(item => item.factIds)).not.toContain('seo.ctr')
    expect(plan.executiveSummary.flatMap(item => item.factIds)).not.toContain('seo.ctr')
  })

  it('el validador rechaza una conclusión que no cabe en el molde (90)', () => {
    const plan = v2(icoSnapshot, ['ico'])
    const long = { ...plan, chapters: plan.chapters.map(chapter => ({ ...chapter, readings: chapter.readings!.map(item => (item.conclusion ? { ...item, conclusion: { ...item.conclusion, text: `${item.conclusion.text} ${'x'.repeat(90)}` } } : item)) })) }

    expect(validateEditorialPlan(long, icoSnapshot).some(violation => violation.rule === 'invalid_field' && violation.detail.startsWith('conclusion mide'))).toBe(true)
  })

  it('la IA que se pasa del tope en un claim conserva el determinista de ESE claim', async () => {
    const deterministic = v2(icoSnapshot, ['ico'])
    const conclusion = deterministic.chapters[0]!.readings!.find(item => item.conclusion)!.conclusion!
    const generate = vi.fn().mockResolvedValue({ model: 'm', usage: { inputTokens: 1, outputTokens: 1 }, data: { claims: [{ claimId: conclusion.claimId, text: `${conclusion.text} ${'y'.repeat(95)}` }] } })
    const result = await authorPlanWithBoundedAi(deterministic, icoSnapshot, { generate: generate as never })

    expect(result.plan.chapters[0]!.readings!.find(item => item.conclusion?.claimId === conclusion.claimId)!.conclusion!.text).toBe(conclusion.text)
  })
})

describe('TASK-1888 — autoría IA v2', () => {
  it('reescribe la lectura por figura con el prompt v2 y cae al determinista si cambia una cifra', async () => {
    const deterministic = v2(icoSnapshot, ['ico'])
    const meaning = deterministic.chapters[0]!.readings!.find(item => item.conclusion)!.conclusion!

    const valid = vi.fn().mockResolvedValue({ model: 'gemini-test', usage: { inputTokens: 10, outputTokens: 5 }, data: { claims: [{ claimId: meaning.claimId, text: `En síntesis, ${meaning.text}` }] } })
    const ok = await authorPlanWithBoundedAi(deterministic, icoSnapshot, { generate: valid as never })

    expect(ok.provenance).toMatchObject({ mode: 'ai_bounded', promptVersion: INSIGHTS_AUTHORING_PROMPT_VERSION_V2 })
    expect(ok.plan.chapters[0]!.readings!.find(item => item.conclusion?.claimId === meaning.claimId)!.conclusion!.text).toBe(`En síntesis, ${meaning.text}`)

    const invented = vi.fn().mockResolvedValue({ model: 'gemini-test', usage: { inputTokens: 10, outputTokens: 5 }, data: { claims: [{ claimId: meaning.claimId, text: 'Mejoró 40 % gracias al nuevo equipo.' }] } })
    const fallback = await authorPlanWithBoundedAi(deterministic, icoSnapshot, { generate: invented as never })

    expect(fallback.provenance.mode).toBe('deterministic')
    expect(fallback.plan).toEqual(deterministic)
  })
})

describe('TASK-1888 — superlativos únicos, esenciales sólo de hallazgos y afirmaciones humanas (Berel 2026-09-25)', () => {
  const conclusionOf = (plan: ReturnType<typeof v2>, chartId: string) => plan.chapters.flatMap(chapter => chapter.readings ?? []).find(reading => reading.chartId === chartId)?.conclusion

  it('cuatro motores empatados en 2 de 6 se dicen como empate, nunca «el que más»', () => {
    const tie = { facts: [aeo('gemini', 2, 'gemini'), aeo('google_ai_overview', 2, 'google_ai_overview'), aeo('openai', 2, 'chatgpt'), aeo('perplexity', 2, 'perplexity')].map(fact => ({ ...fact, denominator: 6 })), sources: [], rejections: [] }
    const plan = v2(tie, ['aeo'])
    const texts = [conclusionOf(plan, 'chart.aeo.count')?.text, ...plan.essentials!.map(item => item.text), ...plan.executiveSummary.map(item => item.text)]

    expect(conclusionOf(plan, 'chart.aeo.count')?.text).toBe('Todos los motores mencionan la marca en 2 de 6.')
    expect(texts.join(' ')).not.toMatch(/el motor que más/)

    // La bajada de la cifra principal es la figura (el empate no tiene dueño), nunca «Presencia en gemini.».
    const reading = plan.chapters[0]!.readings!.find(item => item.chartId === 'chart.aeo.count')!

    expect(reading.keyFigure!.caption.text).toBe('Presencia por motor.')
    expect(reading.keyFigure!.caption.text).not.toMatch(/Presencia en/)
  })

  it('un empate parcial nombra a los empatados; un máximo único conserva el superlativo', () => {
    const partial = v2({ facts: [aeo('openai', 4, 'chatgpt'), aeo('gemini', 4, 'gemini'), aeo('mistral', 1)], sources: [], rejections: [] }, ['aeo'])
    const unique = v2(aeoSnapshot, ['aeo'])

    expect(conclusionOf(partial, 'chart.aeo.count')?.text).toBe('ChatGPT y Gemini son los motores que más mencionan la marca: 4 de 10.')
    expect(conclusionOf(unique, 'chart.aeo.count')?.text).toMatch(/^ChatGPT es el motor que más menciona la marca/)
  })

  it('dos dimensiones en 100 no producen «la mejor evaluada»', () => {
    const dimension = (key: string, label: string, value: number): EvidenceFactV1 => ({ ...aeo(key, value), factId: `aeo.dimension.${key}.w`, metricId: `dimension.${key}`, label, unit: 'score', numerator: null, denominator: null, dimension: { dimension: key } })
    const snapshot = { facts: [dimension('entity_clarity', 'Claridad de entidad', 100), dimension('competitive_sov', 'Share of voice competitivo', 100), dimension('ai_visibility', 'Visibilidad en IA', 0)], sources: [], rejections: [] }
    const plan = v2(snapshot, ['aeo'])
    const text = conclusionOf(plan, 'chart.aeo.score')?.text ?? ''

    expect(text).not.toMatch(/La dimensión mejor evaluada es/)
    expect(text).toBe('Las dimensiones mejor evaluadas son claridad de entidad y share of voice competitivo: 100.')
    // Bajada del empate sin «(0 a 100)»: cifras que ningún hecho citado respalda (violación vista en Berel real).
    expect(plan.chapters[0]!.readings!.find(item => item.chartId === 'chart.aeo.score')!.keyFigure!.caption.text).toBe('Dimensiones evaluadas.')
    // La cifra principal es el valor empatado, aunque la figura traiga antes otro hecho (el puntaje global, 39).
    const withOverall = { ...snapshot, facts: [{ ...dimension('overall', 'Puntaje de visibilidad en IA', 39), factId: 'aeo.overall_score.w', metricId: 'overall_score', dimension: undefined }, ...snapshot.facts] }
    const key = v2(withOverall, ['aeo']).chapters[0]!.readings!.find(item => item.chartId === 'chart.aeo.score')!.keyFigure!

    expect(key.value).toBe('100')
    expect(key.caption.text).toBe('Dimensiones evaluadas.')
    expect(validateEditorialPlan(plan, snapshot)).toEqual([])
  })

  it('«Lo esencial» no cita valores sueltos ni variaciones de 0,0 %; las afirmaciones del capítulo usan verbo con concordancia', () => {
    const seo = (metricId: string, value: number, unit: EvidenceFactV1['unit'], comparisonFactId: string | null = null): EvidenceFactV1 => ({ ...aeo(metricId, value), factId: `seo.${metricId}`, module: 'seo', metricId, label: metricId, unit, numerator: null, denominator: null, dimension: undefined, channelId: 'google', comparisonFactId })
    const prev = (fact: EvidenceFactV1, value: number): EvidenceFactV1 => ({ ...fact, factId: `${fact.factId}.prev`, value, comparisonFactId: null })
    const clicks = seo('clicks', 9377, 'count', 'seo.clicks.prev')
    const impressions = seo('impressions', 512113, 'count', 'seo.impressions.prev')
    const tracked = seo('keywords_tracked', 31, 'count', 'seo.keywords_tracked.prev')
    const plan = v2({ facts: [clicks, prev(clicks, 10662), impressions, prev(impressions, 566297), tracked, prev(tracked, 31)], sources: [], rejections: [] }, ['seo'])
    const claims = plan.chapters[0]!.claims.map(item => item.text)
    const essentials = plan.essentials!.map(item => item.text)

    expect(claims).toContain('Las impresiones bajaron de 566.297 a 512.113 (-9,6 %).')
    expect(claims).toContain('Las keywords con medición se mantuvieron en 31.')
    expect(essentials.join(' ')).not.toMatch(/0,0 %|se mantuvieron/)
    expect(plan.essentials!.flatMap(item => item.factIds)).not.toContain('seo.keywords_tracked')
  })
})

describe('TASK-1888 — tabla de respaldo y hallazgo principal primero (Sky 2026-09-25)', () => {
  it('la primera lectura es la meta sin cumplir y la tabla se titula «…: todas las cifras»', () => {
    const plan = v2(icoSnapshot, ['ico'])
    const chapter = plan.chapters[0]!
    const first = chapter.readings![0]!
    const missed = chapter.charts.filter(chart => chart.family === 'bullet').find(chart => chapter.readings!.find(reading => reading.chartId === chart.chartId)?.conclusion?.text.match(/no alcanza/i))

    expect(missed).toBeDefined()
    expect(first.chartId).toBe(missed!.chartId)
    expect(chapter.tables[0]!.title).toBe('Entrega y cumplimiento: todas las cifras')
    // El orden de las figuras (y de sus páginas) no cambia.
    expect(chapter.charts.map(chart => chart.chartId)).toEqual(v2(icoSnapshot, ['ico']).chapters[0]!.charts.map(chart => chart.chartId))
  })
})
