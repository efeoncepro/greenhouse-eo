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
  slides.flatMap(slide => [slide.slots.assertion, ...((slide.slots.points as { text: string }[] | undefined) ?? []).map(p => p.text)]).filter(Boolean) as string[]

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

  it('las figuras caben en su plantilla (≤5 barras) y nunca parten un par', () => {
    const { facts, claims, chart } = seo(6)

    const evidence = buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters: [chapter({ claims, charts: [chart] as never })] }), snapshot: { facts } as never })
      .slides.filter(slide => slide.contentType === 'insights-evidence')

    const rows = evidence.flatMap(slide => slide.slots.figureSeries as { scaleGroup: string }[])

    expect(rows).toHaveLength(12)

    for (const slide of evidence) {
      const groups = (slide.slots.figureSeries as { scaleGroup: string }[]).map(row => row.scaleGroup)

      expect(groups.length).toBeLessThanOrEqual(5)
      for (const group of new Set(groups)) expect(groups.filter(g => g === group)).toHaveLength(2)
    }
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

  it('renderiza line, pie, donut y scatter desde hechos en el PDF del deck', async () => {
    const values = [
      ['line-1', 10], ['line-2', 30], ['line-3', 20],
      ['pie-1', 6], ['pie-2', 3], ['pie-3', 1],
      ['donut-1', 2], ['donut-2', 5], ['donut-3', 3],
      ['scatter-x1', 1], ['scatter-x2', 2], ['scatter-x3', 3],
      ['scatter-y1', 4], ['scatter-y2', 2], ['scatter-y3', 8]
    ] as const

    const facts = values.map(([factId, value]) => ({ factId, value, unit: 'count', evidenceRef: `ev-${factId}` }))

    const spec = (family: 'line' | 'pie' | 'donut' | 'scatter', series: { seriesId: string; label: string; factIds: string[]; unit: string }[]) => ({
      specVersion: 'chart_spec_v1' as const,
      chartId: `chart-${family}`,
      family,
      relation: family === 'line' ? 'trend' as const : family === 'scatter' ? 'correlation' as const : 'composition' as const,
      title: `Figura ${family}`,
      series,
      dimensionLabels: ['Punto 1', 'Punto 2', 'Punto 3'],
      unit: 'count',
      scale: { kind: 'linear' as const, baseline: family === 'line' ? null : 0 },
      references: [],
      tabularEquivalent: {
        columns: series.map(item => item.label),
        rows: [0, 1, 2].map(index => series.map(item => item.factIds[index]!))
      }
    })

    const charts = [
      spec('line', [{ seriesId: 'line', label: 'Tendencia', factIds: ['line-1', 'line-2', 'line-3'], unit: 'count' }]),
      spec('pie', [{ seriesId: 'pie', label: 'Composición', factIds: ['pie-1', 'pie-2', 'pie-3'], unit: 'count' }]),
      spec('donut', [{ seriesId: 'donut', label: 'Composición', factIds: ['donut-1', 'donut-2', 'donut-3'], unit: 'count' }]),
      spec('scatter', [
        { seriesId: 'x', label: 'X', factIds: ['scatter-x1', 'scatter-x2', 'scatter-x3'], unit: 'count' },
        { seriesId: 'y', label: 'Y', factIds: ['scatter-y1', 'scatter-y2', 'scatter-y3'], unit: 'count' }
      ])
    ]

    const chartFactIds = facts.map(fact => fact.factId)

    const input = buildInsightsDeckPlanInput({
      edition,
      report,
      plan: plan({ chapters: [chapter({ claims: [claim('chart-claims', 'Los datos sostienen estas cuatro figuras.', chartFactIds)], charts: charts as never })] }),
      snapshot: { facts } as never
    })

    const figures = input.slides.filter(slide => slide.contentType === 'insights-evidence')

    expect(figures).toHaveLength(4)
    expect(figures.map(slide => (slide.slots.figureSeries as { chartFamily: string; geometryPath1: string }[])[0])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ chartFamily: 'line', geometryPath1: expect.stringMatching(/^M /) }),
        expect.objectContaining({ chartFamily: 'pie', geometryPath1: expect.stringMatching(/^M /) }),
        expect.objectContaining({ chartFamily: 'donut', geometryPath1: expect.stringMatching(/^M /) }),
        expect.objectContaining({ chartFamily: 'scatter', geometryPath1: expect.stringMatching(/^M /) })
      ])
    )
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'insights-deck-chart-families-'))

    try {
      const result = await composeArtifact(insightsDeckCatalog, input as never, outDir, { concurrency: 2 })

      expect(result.pdfPath).toBeDefined()
      const pdf = await PDFDocument.load(await readFile(result.pdfPath!))

      expect(pdf.getPageCount()).toBe(input.slides.length)
      expect(result.slidePaths).toHaveLength(input.slides.length)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  }, 120_000)

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
