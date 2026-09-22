import { describe, expect, it, vi } from 'vitest'

import type { EvidenceFactV1, EvidenceSnapshotContentV1 } from '../contracts/evidence'
import { buildDeterministicPlan } from './deterministic-planner'
import { extractNumberTokens, formatFactValue } from './format'
import { validateEditorialPlan } from './plan-validation'
import { GH_INSIGHTS } from '@/lib/copy/insights'

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
    expect(chapter.limits).toEqual(['Tráfico orgánico estimado: la fuente no sirve esta ventana con exactitud.'])
    expect(plan.methodology).toEqual(['Visibilidad orgánica: corte al 31 de agosto de 2026.'])
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

describe('TASK-1847 — nombres de métrica con cifras o meses (formas reales de los adapters)', () => {
  // Las etiquetas salen de los adapters reales: seo-adapter (≤10, mes del ETV) e ico-adapter
  // (mes en `RpA · <space> · <mes>`). Los fixtures anteriores no tenían cifras en la etiqueta y
  // por eso la edición real de Berel fallaba con dos falsos positivos que ningún test veía.
  const labelled: EvidenceSnapshotContentV1 = {
    facts: [
      fact({ factId: 'seo.page_one.cur', metricId: 'page_one_keywords', label: 'Keywords en primera página (≤10)', value: 21, unit: 'count', numerator: 21, denominator: 31 }),
      fact({ factId: 'seo.etv.cur', metricId: 'organic_etv', label: 'Tráfico orgánico estimado 2026-08', value: 52792, unit: 'count', comparisonFactId: 'seo.etv.prev' }),
      fact({ factId: 'seo.etv.prev', metricId: 'organic_etv', label: 'Tráfico orgánico estimado 2026-07', value: 55287, unit: 'count', window: { start: '2026-07-01', endExclusive: '2026-08-01', granularity: 'period', partial: false } }),
      fact({ factId: 'ico.rpa.cur', metricId: 'rpa', module: 'ico', label: 'RpA · Sky Airlines · 2026-08', value: 1.8, unit: 'ratio' })
    ],
    sources: [],
    rejections: []
  }

  const claimPlan = (text: string, factIds: string[]) => {
    const plan = buildDeterministicPlan(labelled, { modules: ['seo'], locale: 'es-CL' })

    return { ...plan, executiveSummary: [{ claimId: 'claim.probe', text, factIds }], chapters: [], actions: [] }
  }

  it('el lector toma una fecha ISO como un solo token y conserva los negativos reales', () => {
    expect(extractNumberTokens('Tráfico 2026-08: 52.792, variación -4,5 %.')).toEqual(['2026-08', '52.792', '-4,5 %'])
    expect(extractNumberTokens('corte 2026-08-31.')).toEqual(['2026-08-31'])
    expect(extractNumberTokens('rango 2025-2026')).toEqual(['2025', '-2026'])
  })

  it('el plan determinista con etiquetas reales pasa la validación sin falsos positivos', () => {
    const plan = buildDeterministicPlan(labelled, { modules: ['seo', 'ico'], locale: 'es-CL' })

    expect(plan.chapters.flatMap(chapter => chapter.claims).map(claim => claim.text)).toContain('Keywords en primera página (≤10): 21 de 31.')
    expect(validateEditorialPlan(plan, labelled)).toEqual([])
  })

  it('una cifra fuera de la etiqueta se sigue rechazando aunque coincida con una cifra de la etiqueta', () => {
    const violations = validateEditorialPlan(claimPlan('Keywords en primera página (≤10): 21, 10 más que antes.', ['seo.page_one.cur']), labelled)

    expect(violations.map(violation => violation.detail)).toEqual(['claim.probe: "10" no corresponde a ningún hecho referenciado'])
  })

  it('la etiqueta de un hecho NO referenciado no respalda sus cifras', () => {
    const violations = validateEditorialPlan(claimPlan('Keywords en primera página (≤10): 21.', ['seo.etv.cur']), labelled)

    expect(violations.map(violation => violation.detail).sort()).toEqual([
      'claim.probe: "10" no corresponde a ningún hecho referenciado',
      'claim.probe: "21" no corresponde a ningún hecho referenciado'
    ])
  })

  it('una fecha escrita fuera de la etiqueta vale sólo si cae en la ventana de un hecho referenciado', () => {
    expect(validateEditorialPlan(claimPlan('En 2026-08 el tráfico fue 52.792.', ['seo.etv.cur']), labelled)).toEqual([])

    const violations = validateEditorialPlan(claimPlan('En 2025-03 el tráfico fue 52.792.', ['seo.etv.cur']), labelled)

    expect(violations.map(violation => violation.detail)).toEqual(['claim.probe: "2025-03" no corresponde a ningún hecho referenciado'])
  })
})

describe('TASK-1847 — límites y metodología sin identificadores internos', () => {
  // Deck, informe y web imprimen estas líneas tal cual: un `metricId`, un `method.name`, el nombre de
  // la función lectora o el `detail` del adapter en ellas es una fuga a un documento de cliente.
  const leaky: EvidenceSnapshotContentV1 = {
    facts: [fact({ factId: 'seo.clicks.cur', metricId: 'clicks', label: 'Clics orgánicos', value: 1250, unit: 'count' })],
    sources: [
      { module: 'seo', adapterVersion: 'seo_report_adapter_v1', reader: 'readSeoOverviewKpisForWindow', asOf: '2026-08-31', method: { name: 'gsc_window_aggregate', version: 'seo_measurement_v1' }, coverage: { kind: 'complete', ratio: 1, populationSize: null }, servedWindow: null },
      { module: 'seo', adapterVersion: 'seo_report_adapter_v1', reader: 'readRankEvolution', asOf: '2026-08-30', method: { name: 'dataforseo_serp_rank', version: 'seo_rank_v1' }, coverage: { kind: 'complete', ratio: 1, populationSize: null }, servedWindow: null },
      { module: 'aeo', adapterVersion: 'aeo_adapter_v1', reader: 'readClientGraderReport', asOf: '2026-09-03T22:36:30.432Z', method: { name: 'ai_visibility_grader', version: 's1/p1' }, coverage: { kind: 'complete', ratio: 1, populationSize: null }, servedWindow: null },
      { module: 'ico', adapterVersion: 'ico_adapter_v1', reader: 'readSpaceMetrics', asOf: null, method: { name: 'metodo_desconocido', version: '1' }, coverage: { kind: 'complete', ratio: 1, populationSize: null }, servedWindow: null }
    ],
    rejections: [
      { module: 'seo', metricId: 'rank', reason: 'no_data', detail: 'Rank evolution: no_data' },
      { module: 'seo', metricId: 'organic_etv', reason: 'unsupported_window', detail: 'ETV se sirve por mes calendario' },
      { module: 'seo', metricId: 'organic_etv', reason: 'unsupported_window', detail: 'otra causa del mismo motivo' },
      { module: 'aeo', metricId: null, reason: 'unsupported_window', detail: 'Grader: not_found' },
      { module: 'ico', metricId: 'metrica_nueva', reason: 'suppressed', detail: 'RpA degraded en Space X' }
    ]
  }

  const plan = buildDeterministicPlan(leaky, { modules: ['seo', 'aeo', 'ico'], locale: 'es-CL' })
  const printed = [...plan.limits, ...plan.methodology, ...plan.chapters.flatMap(chapter => chapter.limits)]

  it('ninguna línea impresa contiene un identificador interno ni el diagnóstico del adapter', () => {
    const forbidden = [
      ...leaky.rejections.flatMap(rejection => [rejection.metricId, rejection.detail]),
      ...leaky.sources.flatMap(source => [source.reader, source.method.name, source.method.version, source.adapterVersion]),
      'seo:', 'aeo:', 'ico:'
      // Un token de 1–3 caracteres («1», una versión) no identifica nada y chocaría con cualquier fecha.
    ].filter((value): value is string => typeof value === 'string' && value.length >= 4)

    for (const line of printed) {
      for (const token of forbidden) expect(line, `«${line}» contiene «${token}»`).not.toContain(token)
    }
  })

  it('redacta con nombres legibles, cae al módulo si no conoce la métrica y colapsa duplicados', () => {
    expect(plan.limits).toEqual([
      'Posiciones en buscadores: sin datos.',
      'Tráfico orgánico estimado: la fuente no sirve esta ventana con exactitud.',
      'Motores de respuesta: la fuente no sirve esta ventana con exactitud.',
      'Entrega: la métrica está suprimida por su política de evidencia.'
    ])
    expect(plan.methodology).toEqual([
      'Visibilidad orgánica: Google Search Console, corte al 31 de agosto de 2026.',
      'Visibilidad orgánica: mediciones de posiciones en buscadores, corte al 30 de agosto de 2026.',
      'Visibilidad en motores de respuesta: análisis de visibilidad en motores de respuesta, corte al 3 de septiembre de 2026.',
      'Entrega y cumplimiento: sin fecha de corte declarada.'
    ])
  })

  it('un rechazo del período de comparación se dice como tal, no como falta de la ventana actual', () => {
    const withComparison = buildDeterministicPlan(
      { facts: leaky.facts, sources: [], rejections: [{ module: 'aeo', metricId: null, reason: 'unsupported_window', detail: 'x', scope: 'comparison' }] },
      { modules: ['aeo'], locale: 'es-CL' }
    )

    expect(withComparison.limits).toEqual(['Motores de respuesta: en el período anterior, la fuente no sirve esta ventana con exactitud.'])
  })

  it('toda causa de límite, también la de comparación, cabe en el presupuesto más estrecho (96, lámina del deck)', () => {
    for (const reason of Object.values(GH_INSIGHTS.rejections)) {
      expect(`${GH_INSIGHTS.document.comparisonLimitPrefix} ${reason}`.length, reason).toBeLessThanOrEqual(96)
    }
  })

  it('cada sujeto de límite cabe en el presupuesto del informe A4 (38)', () => {
    const subjects = [...Object.values(GH_INSIGHTS.metrics), ...Object.values(GH_INSIGHTS.modules).map(module => module.label)]

    for (const subject of subjects) expect(subject.length, subject).toBeLessThanOrEqual(38)
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
