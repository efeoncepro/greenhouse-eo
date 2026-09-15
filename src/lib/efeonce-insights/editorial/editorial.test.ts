import { describe, expect, it, vi } from 'vitest'

import type { EvidenceFactV1, EvidenceSnapshotContentV1 } from '../contracts/evidence'
import { buildDeterministicPlan } from './deterministic-planner'
import { formatFactValue } from './format'
import { validateEditorialPlan } from './plan-validation'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/ai/google-genai', () => ({ generateStructuredGemini: vi.fn() }))

const fact = (overrides: Partial<EvidenceFactV1> & Pick<EvidenceFactV1, 'factId' | 'metricId' | 'value' | 'unit'>): EvidenceFactV1 => ({
  factVersion: 'evidence_fact_v1',
  module: 'seo',
  label: overrides.metricId,
  numerator: null,
  denominator: null,
  population: 'p',
  source: 's',
  method: { name: 'm', version: '1' },
  coverage: { kind: 'complete', ratio: 1, populationSize: null },
  freshness: { asOf: '2026-08-31' },
  observation: 'observed',
  window: { start: '2026-08-01', endExclusive: '2026-09-01', granularity: 'period', partial: false },
  evidenceRef: 'ref',
  comparisonFactId: null,
  ...overrides
})

const snapshot: EvidenceSnapshotContentV1 = {
  facts: [
    fact({ factId: 'seo.clicks.cur', metricId: 'clicks', label: 'Clics orgánicos', value: 1250, unit: 'count', comparisonFactId: 'seo.clicks.prev' }),
    fact({ factId: 'seo.clicks.prev', metricId: 'clicks', label: 'Clics orgánicos', value: 1000, unit: 'count', window: { start: '2026-07-01', endExclusive: '2026-08-01', granularity: 'period', partial: false } }),
    fact({ factId: 'seo.ctr.cur', metricId: 'ctr', label: 'CTR', value: 2.5, unit: 'percent', numerator: 1250, denominator: 50000 }),
    fact({ factId: 'seo.position.cur', metricId: 'position', label: 'Posición media', value: null, unit: 'position' })
  ],
  sources: [{ module: 'seo', adapterVersion: 'seo_report_adapter_v1', reader: 'readSeoOverviewKpisForWindow', asOf: '2026-08-31', method: { name: 'gsc', version: '1' }, coverage: { kind: 'complete', ratio: 1, populationSize: 31 }, servedWindow: null }],
  rejections: [{ module: 'seo', metricId: 'organic_etv', reason: 'unsupported_window', detail: 'no mensual' }]
}

describe('TASK-1845 — plan editorial determinista + validación de cifras', () => {
  it('escribe cada cifra desde el hecho, enlaza comparables, muestra null como sin dato y pasa la validación', () => {
    const plan = buildDeterministicPlan(snapshot, { modules: ['seo'], locale: 'es-CL' })
    const chapter = plan.chapters[0]!
    const clicks = chapter.claims.find(claim => claim.claimId === 'claim.seo.clicks.cur')!

    expect(clicks.text).toBe('Clics orgánicos: 1.250 (período anterior 1.000, variación +25,0 %).')
    expect(clicks.factIds).toEqual(['seo.clicks.cur', 'seo.clicks.prev'])
    expect(chapter.claims.find(claim => claim.claimId === 'claim.seo.position.cur')!.text).toContain('sin dato')
    expect(chapter.charts.map(chart => [chart.family, chart.series.length])).toEqual([['bar_grouped', 2], ['bar', 1]])
    expect(chapter.limits[0]).toContain('organic_etv')
    expect(plan.methodology[0]).toContain('readSeoOverviewKpisForWindow')
    expect(validateEditorialPlan(plan, snapshot)).toEqual([])
  })

  it('rechaza cifras que no salen de un hecho referenciado y factIds desconocidos', () => {
    const plan = buildDeterministicPlan(snapshot, { modules: ['seo'], locale: 'es-CL' })

    const tampered = {
      ...plan,
      chapters: plan.chapters.map(chapter => ({
        ...chapter,
        claims: chapter.claims.map(claim =>
          claim.claimId === 'claim.seo.clicks.cur'
            ? { ...claim, text: 'Clics orgánicos: 1.300 (período anterior 1.000, variación +30,0 %).' }
            : claim.claimId === 'claim.seo.ctr.cur'
              ? { ...claim, factIds: ['seo.ctr.nope'] }
              : claim
        )
      }))
    }

    const violations = validateEditorialPlan(tampered, snapshot)

    expect(violations.map(violation => violation.rule).sort()).toEqual(['unknown_fact', 'unreferenced_number', 'unreferenced_number', 'unreferenced_number'])
  })

  it('formatea por unidad y locale de forma determinista', () => {
    expect(formatFactValue(2.5, 'percent', 'es-CL')).toBe('2,5 %')
    expect(formatFactValue(12.345, 'position', 'es-CL')).toBe('#12,3')
    expect(formatFactValue(1250, 'count', 'en-US')).toBe('1,250')
    expect(formatFactValue(null, 'count', 'es-CL')).toBe('—')
  })
})

describe('TASK-1845 — autoría IA acotada', () => {
  it('con el flag apagado el plan es determinista y no se llama al modelo', async () => {
    const { authorEditorialPlan } = await import('./author-plan')
    const { generateStructuredGemini } = await import('@/lib/ai/google-genai')
    const authored = await authorEditorialPlan({ snapshot, modules: ['seo'], locale: 'es-CL', env: {} as NodeJS.ProcessEnv })

    expect(authored.provenance.mode).toBe('deterministic')
    expect(generateStructuredGemini).not.toHaveBeenCalled()
  })

  it('una reescritura válida se acepta con provenance ai_bounded; ninguna cifra cambia', async () => {
    const { authorPlanWithBoundedAi } = await import('./ai-authoring')
    const deterministic = buildDeterministicPlan(snapshot, { modules: ['seo'], locale: 'es-CL' })

    const generate = vi.fn(async () => ({
      model: 'gemini-test',
      usage: { inputTokens: 10, outputTokens: 5 },
      data: { claims: [{ claimId: 'claim.seo.clicks.cur', text: 'Los clics orgánicos llegaron a 1.250, frente a 1.000 del período anterior (+25,0 %).' }] }
    }))

    const result = await authorPlanWithBoundedAi(deterministic, snapshot, { generate: generate as never })

    expect(result.fallbackReason).toBeNull()
    expect(result.provenance).toMatchObject({ mode: 'ai_bounded', modelId: 'gemini-test', promptVersion: 'insights-authoring-v1' })
    expect(result.plan.chapters[0]!.claims[0]!.text).toContain('llegaron a 1.250')
  })

  it('si el modelo cambia una cifra dos veces, se conserva la versión determinista (una reparación máximo)', async () => {
    const { authorPlanWithBoundedAi } = await import('./ai-authoring')
    const deterministic = buildDeterministicPlan(snapshot, { modules: ['seo'], locale: 'es-CL' })

    const generate = vi.fn(async () => ({
      model: 'gemini-test',
      usage: { inputTokens: 10, outputTokens: 5 },
      data: { claims: [{ claimId: 'claim.seo.clicks.cur', text: 'Los clics crecieron 40 % hasta 1.750.' }] }
    }))

    const result = await authorPlanWithBoundedAi(deterministic, snapshot, { generate: generate as never })

    expect(generate).toHaveBeenCalledTimes(2)
    expect(result.provenance.mode).toBe('deterministic')
    expect(result.plan).toEqual(deterministic)
    expect(result.fallbackReason).toContain('1.750')
  })

  it('si el proveedor falla, fallback determinista sin lanzar', async () => {
    const { authorPlanWithBoundedAi } = await import('./ai-authoring')
    const deterministic = buildDeterministicPlan(snapshot, { modules: ['seo'], locale: 'es-CL' })
    const generate = vi.fn(async () => { throw new Error('provider down') })
    const result = await authorPlanWithBoundedAi(deterministic, snapshot, { generate: generate as never })

    expect(result.provenance.mode).toBe('deterministic')
    expect(result.fallbackReason).toBe('error del proveedor')
  })
})
