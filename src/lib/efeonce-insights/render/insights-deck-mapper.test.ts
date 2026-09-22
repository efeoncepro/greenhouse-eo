import { describe, expect, it } from 'vitest'

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
  it('abre con portada, rotula la ventana medida y cierra con límites', () => {
    const slides = buildInsightsDeckPlanInput({ edition, report, plan: plan(), snapshot: { facts: [] } as never }).slides

    expect(slides[0]!.contentType).toBe('insights-cover')
    expect(slides[0]!.slots.periodLabel).toBe('1–20 de septiembre de 2026')
    expect(slides.at(-1)!.contentType).toBe('insights-limits')
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

    expect(slides.some(slide => slide.contentType === 'insights-narrative' && slide.slots.chapterLabel === 'Visibilidad orgánica')).toBe(true)
    expect(() => buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters: [] }), snapshot: { facts: [] } as never })).toThrow(InsightsRenderRejectedError)
  })

  it('rechaza un texto que excede su slot en vez de recortarlo con «…»', () => {
    const long = claim('x', 'A'.repeat(121))

    expect(() => buildInsightsDeckPlanInput({ edition, report, plan: plan({ chapters: [chapter({ claims: [long] })] }), snapshot: { facts: [] } as never })).toThrow(InsightsRenderRejectedError)
  })

  it('pagina los límites de seis en seis', () => {
    const limits = Array.from({ length: 8 }, (_, i) => `Métrica ${i}: sin datos.`)
    const slides = buildInsightsDeckPlanInput({ edition, report, plan: plan({ limits }), snapshot: { facts: [] } as never }).slides.filter(slide => slide.contentType === 'insights-limits')

    expect(slides.map(slide => (slide.slots.limits as unknown[]).length)).toEqual([6, 2])
  })
})
