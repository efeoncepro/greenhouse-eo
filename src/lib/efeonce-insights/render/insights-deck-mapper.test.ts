import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { PDFDocument } from 'pdf-lib'

import { describe, expect, it } from 'vitest'

import { composeArtifact } from '@/lib/artifact-composer'
import { insightsDeckCatalog } from '@/lib/artifact-composer/catalogs/insights-deck'

import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'
import { InsightsRenderRejectedError } from '../errors'
import { buildInsightsDeckPlanInput } from './insights-deck-mapper'

const edition = {
  editionId: 'insed-1',
  version: 1,
  request: { period: { start: '2026-09-01', endExclusive: '2026-09-21', timeZone: 'America/Santiago' } },
  issuedAt: null
} as never

const report = { reportCode: 'EO-INS-000019', title: 'Berel · Visibilidad orgánica y en motores de respuesta' } as never

const claim = (id: string, text: string, factIds: string[] = []) => ({ claimId: id, text, factIds })

const chapter = (over: Partial<PlanChapterV1> = {}): PlanChapterV1 =>
  ({ chapterId: 'chapter.seo', module: 'seo', title: 'Visibilidad orgánica', claims: [], charts: [], tables: [], limits: [], ...over }) as PlanChapterV1

const plan = (over: Partial<EditorialPlanV1> = {}): EditorialPlanV1 =>
  ({ planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], chapters: [chapter()], actions: [], limits: [], methodology: [], references: [], ...over }) as EditorialPlanV1

// Forma real de un capítulo SEO: comparación de períodos por métrica, una afirmación por métrica.
const seo = (metrics: number) => {
  const facts = Array.from({ length: metrics }, (_, i) => [
    { factId: `cur${i}`, value: (i + 1) * 1000, unit: 'count', evidenceRef: `c${i}` },
    { factId: `prev${i}`, value: (i + 1) * 900, unit: 'count', evidenceRef: `p${i}` }
  ]).flat()

  const claims = Array.from({ length: metrics }, (_, i) => claim(`k${i}`, `Métrica ${i + 1}: ${(i + 1) * 1000}.`, [`cur${i}`, `prev${i}`]))

  const chart = {
    specVersion: 'chart_spec_v1', chartId: 'chart.seo.count', family: 'bar_grouped', relation: 'comparison', title: 'Visibilidad orgánica · Cantidad', unit: 'count',
    dimensionLabels: Array.from({ length: metrics }, (_, i) => `Métrica ${i + 1}`),
    series: [
      { seriesId: 'prev', label: 'Período anterior', factIds: Array.from({ length: metrics }, (_, i) => `prev${i}`), unit: 'count' },
      { seriesId: 'cur', label: 'Período', factIds: Array.from({ length: metrics }, (_, i) => `cur${i}`), unit: 'count' }
    ]
  }

  return { facts, claims, chart }
}

const textOf = (slides: { slots: Record<string, unknown> }[]) =>
  slides
    .flatMap(slide => [slide.slots.assertion, slide.slots.conclusion, ...((slide.slots.points as { text: string }[] | undefined) ?? []).map(p => p.text)])
    .filter(Boolean) as string[]

describe('buildInsightsDeckPlanInput', () => {
  it('abre con portada, rotula la ventana medida y cierra con límites y contraportada (TASK-1889)', () => {
    const slides = buildInsightsDeckPlanInput({ edition, report, plan: plan(), snapshot: { facts: [] } as never }).slides

    expect(slides[0]!.contentType).toBe('insights-cover')
    expect(slides[0]!.slots.editionLabel).toBe('Informe mensual · 1–20 de septiembre de 2026')
    expect(slides.at(-2)!.contentType).toBe('insights-limits')
    expect(slides.at(-1)!.contentType).toBe('insights-back-cover')
  })

  it('cada capítulo abre con su apertura, y las láminas editoriales llevan folio «NN / total»', () => {
    const slides = buildInsightsDeckPlanInput({ edition, report, plan: plan(), snapshot: { facts: [] } as never }).slides
    const opening = slides.find(slide => slide.contentType === 'insights-chapter')!

    expect(opening.slots).toMatchObject({ chapterLabel: 'Capítulo 01', chapterNumeral: '01', chapterTitle: 'Visibilidad orgánica' })

    for (const [i, slide] of slides.entries()) {
      const folio = slide.slots.folio as { page: string; total: string } | undefined

      if (folio) expect(folio).toEqual({ page: String(i + 1).padStart(2, '0'), total: String(slides.length).padStart(2, '0') })
    }
  })

  it('ninguna afirmación del plan queda fuera: el deck no tiene tabla que la sostenga', () => {
    const { facts, claims, chart } = seo(6)

    const slides = buildInsightsDeckPlanInput({
      edition, report,
      plan: plan({ executiveSummary: [claim('s0', 'Resumen: la visibilidad cayó.')], chapters: [chapter({ claims, charts: [chart] as never })] }),
      snapshot: { facts } as never
    }).slides

    const printed = textOf(slides)

    for (const c of [...claims, claim('s0', 'Resumen: la visibilidad cayó.')]) expect(printed, c.text).toContain(c.text)
  })

  it('las figuras caben en su plantilla (≤4 métricas por lámina) y cada métrica lleva su par', () => {
    const { facts, claims, chart } = seo(6)

    const figures = buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters: [chapter({ claims, charts: [chart] as never })] }), snapshot: { facts } as never })
      .slides.filter(slide => slide.contentType === 'insights-figure-comparison')

    const metrics = figures.flatMap(slide => slide.slots.metrics as { current: string; prior: string }[])

    expect(metrics).toHaveLength(6)

    for (const slide of figures) expect((slide.slots.metrics as unknown[]).length).toBeLessThanOrEqual(4)
    for (const metric of metrics) expect(metric.prior).toBeTruthy()
  })

  it('un capítulo sin datos se narra; un plan sin capítulos se rechaza', () => {
    const slides = buildInsightsDeckPlanInput({ edition, report, plan: plan(), snapshot: { facts: [] } as never }).slides

    expect(slides.some(slide => slide.contentType === 'insights-narrative' && slide.slots.section === 'Visibilidad orgánica')).toBe(true)
    expect(() => buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters: [] }), snapshot: { facts: [] } as never })).toThrow(InsightsRenderRejectedError)
  })

  it('rechaza un texto que excede su slot en vez de recortarlo con «…»', () => {
    const long = claim('x', 'A'.repeat(121))

    expect(() => buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters: [chapter({ claims: [long] })] }), snapshot: { facts: [] } as never })).toThrow(InsightsRenderRejectedError)
  })

  it('renderiza un deck PDF real con el catálogo editorial y conserva todas las afirmaciones', async () => {
    const chapters = Array.from({ length: 10 }, (_, index) =>
      chapter({
        chapterId: `chapter-${index + 1}`,
        title: `Capítulo ${index + 1}`,
        claims: [claim(`claim-${index + 1}`, `Hallazgo íntegro ${index + 1}: la evidencia conserva cada período y su alcance.`)]
      })
    )

    const input = buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters }), snapshot: { facts: [] } as never })
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'task-1847-deck-25-slides-'))

    try {
      expect(input.slides).toHaveLength(23) // portada + 10 × (apertura + narrativa) + límites + contraportada
      const printed = textOf(input.slides.map(slide => ({ slots: slide.slots as Record<string, unknown> })))

      for (let index = 1; index <= 10; index++) {
        expect(printed).toContain(`Hallazgo íntegro ${index}: la evidencia conserva cada período y su alcance.`)
      }

      const result = await composeArtifact(insightsDeckCatalog, input as never, outDir, { concurrency: 4 })

      expect(result.pdfPath).toBeDefined()
      const pdf = await PDFDocument.load(await readFile(result.pdfPath!))

      expect(pdf.getPageCount()).toBe(23)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  }, 120_000)

  it('renderiza metas, tendencia y columnas por canal en el PDF del deck; una familia sin página se rechaza', async () => {
    const facts = [
      ['otd', 82, 'percent'], ['otd-target', 90, 'percent'], ['otd-band', 70, 'percent'],
      ['m1', 10, 'count'], ['m2', 30, 'count'], ['m3', 20, 'count'],
      ['gpt', 12, 'count'], ['gem', 8, 'count']
    ].map(([factId, value, unit]) => ({ factId: String(factId), value, unit, label: String(factId), metricId: String(factId), evidenceRef: `ev-${factId}` }))

    const base = { specVersion: 'chart_spec_v1' as const, references: [], scale: { kind: 'linear' as const, baseline: 0 as const }, tabularEquivalent: { columns: [], rows: [] } }

    const charts = [
      { ...base, chartId: 'chart.bullet', family: 'bullet', relation: 'target', title: 'Entregas a tiempo', series: [], dimensionLabels: ['Space'], unit: 'percent',
        data: { kind: 'bullet', direction: 'higher_is_better', items: [{ itemId: 'i1', label: 'Space', valueFactId: 'otd', targetFactId: 'otd-target', bandFactId: 'otd-band' }] } },
      { ...base, chartId: 'chart.line', family: 'line', relation: 'trend', title: 'Tendencia', unit: 'count', dimensionLabels: ['2026-07', '2026-08', '2026-09'],
        series: [{ seriesId: 's', label: 'Clics', factIds: ['m1', 'm2', 'm3'], unit: 'count' }] },
      { ...base, chartId: 'chart.bar', family: 'bar', relation: 'comparison', title: 'Menciones por motor', unit: 'count', dimensionLabels: ['ChatGPT', 'Gemini'],
        dimensionChannelIds: ['chatgpt', 'gemini'], series: [{ seriesId: 's', label: 'Período', factIds: ['gpt', 'gem'], unit: 'count' }] }
    ]

    const input = buildInsightsDeckPlanInput({
      edition,
      report,
      plan: plan({ chapters: [chapter({ claims: [claim('c', 'Los datos sostienen estas tres figuras.', facts.map(f => f.factId))], charts: charts as never })] }),
      snapshot: { facts } as never
    })

    expect(input.slides.map(slide => slide.contentType)).toEqual(expect.arrayContaining(['insights-figure-targets', 'insights-figure-trend', 'insights-figure-columns']))

    const targets = input.slides.find(slide => slide.contentType === 'insights-figure-targets')!

    expect(targets.slots.bulletRows).toEqual([expect.objectContaining({ value: '82,0 %', target: '90,0 %', band: '70,0 %', pct: '8,0 pp' })])

    const outDir = await mkdtemp(path.join(os.tmpdir(), 'insights-deck-figures-'))

    try {
      const result = await composeArtifact(insightsDeckCatalog, input as never, outDir, { concurrency: 2 })
      const pdf = await PDFDocument.load(await readFile(result.pdfPath!))

      expect(pdf.getPageCount()).toBe(input.slides.length)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }

    // Una familia sin página del catálogo no se dibuja en una plantilla ajena.
    const pie = { ...base, chartId: 'chart.pie', family: 'pie', relation: 'composition', title: 'Composición', unit: 'count', dimensionLabels: ['A', 'B'],
      series: [{ seriesId: 's', label: 'Partes', factIds: ['m1', 'm2'], unit: 'count' }] }

    expect(() =>
      buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters: [chapter({ charts: [pie] as never })] }), snapshot: { facts } as never })
    ).toThrow(InsightsRenderRejectedError)
  }, 120_000)

  it('«Lo esencial» (v2) va en la lámina de resumen, con el número de la lámina que lo respalda', () => {
    const { facts, claims, chart } = seo(2)

    const slides = buildInsightsDeckPlanInput({
      edition, report,
      plan: plan({
        executiveSummary: [claim('s0', 'La visibilidad subió.'), claim('s1', 'Bajada.'), claim('s2', 'Tercera afirmación.')],
        essentials: [{ ...claims[1]!, claimId: 'essential.k1' }],
        chapters: [chapter({ claims, charts: [chart] as never })]
      } as never),
      snapshot: { facts: facts.map(f => ({ ...f, label: 'Métrica' })) } as never
    }).slides

    const summary = slides.find(slide => slide.contentType === 'insights-summary')!
    const figureIndex = slides.findIndex(slide => slide.contentType === 'insights-figure-comparison')

    expect(summary.slots.essentials).toEqual([{ figure: '2.000', title: 'Métrica', folio: `p. ${String(figureIndex + 1).padStart(2, '0')}` }])
    // Lo que la tesis y su bajada no dicen se narra: la tercera afirmación no se pierde.
    expect(textOf(slides)).toContain('Tercera afirmación.')
  })

  it('el resumen con una sola afirmación dice dónde está el resto, nunca que no hay más', () => {
    // Caso real (Sky): el resumen toma una afirmación por módulo; el capítulo traía además OTD.
    const slides = buildInsightsDeckPlanInput({ edition, report, plan: plan({ executiveSummary: [claim('s0', 'RpA: 1,33.')] }), snapshot: { facts: [] } as never }).slides
    const summary = slides.find(slide => slide.contentType === 'insights-narrative' && slide.slots.section === 'Resumen ejecutivo')!

    expect((summary.slots.points as { text: string }[]).map(point => point.text)).toEqual([
      'El detalle de cada módulo, con todas sus cifras, está en los capítulos siguientes.'
    ])
  })

  it('pagina los límites de seis en seis', () => {
    const limits = Array.from({ length: 8 }, (_, i) => `Métrica ${i}: sin datos.`)
    const slides = buildInsightsDeckPlanInput({ edition, report, plan: plan({ limits }), snapshot: { facts: [] } as never }).slides.filter(slide => slide.contentType === 'insights-limits')

    expect(slides.map(slide => (slide.slots.limits as unknown[]).length)).toEqual([6, 2])
  })
})
