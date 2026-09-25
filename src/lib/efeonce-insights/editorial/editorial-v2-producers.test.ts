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

  it('la lectura es factual: posición contra la meta y un próximo paso SÓLO si hay brecha', () => {
    const chapter = v2(icoSnapshot, ['ico']).chapters[0]!
    const reading = (chartId: string) => chapter.readings!.find(item => item.chartId === chartId)!

    expect(reading('chart.ico.bullet.otd').meaning.text).toBe('Sky Airline: 81,9 %, bajo la meta de 90,0 %.')
    expect(reading('chart.ico.bullet.otd').keyFigure).toMatchObject({ factId: 'ico.otd.w.sp-1.2026-08', value: '81,9 %' })
    expect(reading('chart.ico.bullet.otd').nextStep!.text).toBe('Revisar primero Sky Airline: es donde la distancia con la meta es mayor.')
    // FTR 86 sobre la meta de 80 y RpA 1,33 bajo el techo de 1,5: alcanzadas ⇒ sin próximo paso inventado.
    expect(reading('chart.ico.bullet.ftr').nextStep).toBeNull()
    expect(reading('chart.ico.bullet.rpa').meaning.text).toBe('Sky Airline: 1,33, bajo la meta de 1,50.')
    expect(reading('chart.ico.bullet.rpa').nextStep).toBeNull()
    expect(reading('chart.ico.line.otd').meaning.text).toBe('Sky Airline: pasó de 78,4 % en 2026-06 a 81,9 % en 2026-08.')
    expect(chapter.opening!.factIds).toEqual([])
  })

  it('las metas son hechos de referencia: no generan claims, tablas ni referencias', () => {
    const plan = v2(icoSnapshot, ['ico'])
    const chapter = plan.chapters[0]!

    expect(chapter.claims.some(claim => claim.factIds.some(id => id.startsWith('ico.target')))).toBe(false)
    expect(chapter.tables[0]!.rows).toHaveLength(9)
    expect(plan.references.some(reference => reference.referenceId.includes('target'))).toBe(false)
  })

  it('con dos meses no hay línea (la matriz exige ≥ 3 puntos)', () => {
    const twoMonths = { ...icoSnapshot, facts: icoSnapshot.facts.filter(fact => fact.dimension?.month !== '2026-06' || fact.role === 'reference') }

    expect(v2(twoMonths, ['ico']).chapters[0]!.charts.some(chart => chart.family === 'line')).toBe(false)
  })

  it('esenciales ≤ 5 y líneas de alcance en el orden de los módulos', () => {
    const plan = buildDeterministicPlan({ ...icoSnapshot, facts: [...icoSnapshot.facts, ...aeoSnapshot.facts] }, { modules: ['aeo', 'ico'], locale: 'es-CL', editorialV2: true })

    expect(plan.essentials!.length).toBe(5)
    expect(plan.essentials![0]!.factIds[0]).toBe('aeo.presence.openai.w')
    expect(plan.essentials![1]!.factIds[0]!.startsWith('ico.')).toBe(true)
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

describe('TASK-1888 — autoría IA v2', () => {
  it('reescribe la lectura por figura con el prompt v2 y cae al determinista si cambia una cifra', async () => {
    const deterministic = v2(icoSnapshot, ['ico'])
    const meaning = deterministic.chapters[0]!.readings![0]!.meaning

    const valid = vi.fn().mockResolvedValue({ model: 'gemini-test', usage: { inputTokens: 10, outputTokens: 5 }, data: { claims: [{ claimId: meaning.claimId, text: `En síntesis, ${meaning.text}` }] } })
    const ok = await authorPlanWithBoundedAi(deterministic, icoSnapshot, { generate: valid as never })

    expect(ok.provenance).toMatchObject({ mode: 'ai_bounded', promptVersion: INSIGHTS_AUTHORING_PROMPT_VERSION_V2 })
    expect(ok.plan.chapters[0]!.readings![0]!.meaning.text).toBe(`En síntesis, ${meaning.text}`)

    const invented = vi.fn().mockResolvedValue({ model: 'gemini-test', usage: { inputTokens: 10, outputTokens: 5 }, data: { claims: [{ claimId: meaning.claimId, text: 'Mejoró 40 % gracias al nuevo equipo.' }] } })
    const fallback = await authorPlanWithBoundedAi(deterministic, icoSnapshot, { generate: invented as never })

    expect(fallback.provenance.mode).toBe('deterministic')
    expect(fallback.plan).toEqual(deterministic)
  })
})
