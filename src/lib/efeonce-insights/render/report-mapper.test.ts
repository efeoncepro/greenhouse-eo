import { describe, expect, it } from 'vitest'

import { buildInsightReportPlanInput } from './report-mapper'
import { InsightsRenderRejectedError } from '../errors'
import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'

const edition = {
  editionId: 'insed-1',
  reportId: 'insrp-1',
  organizationId: 'org-1',
  version: 1,
  audience: 'client',
  state: 'issued',
  periodTimeZone: 'America/Santiago',
  periodStartUtc: '2026-08-01T04:00:00.000Z',
  periodEndUtc: '2026-09-01T04:00:00.000Z',
  issuedAt: '2026-09-03T12:00:00.000Z'
} as never

const snapshot = { snapshotId: 'insn-1', editionId: 'insed-1', facts: [], sources: [], rejections: [] } as never

const report = {
  reportId: 'insrp-1',
  reportCode: 'EO-INS-000014',
  organizationId: 'org-1',
  title: 'Informe de visibilidad y entrega',
  status: 'active'
} as never

const chapter = (over: Partial<PlanChapterV1> = {}): PlanChapterV1 =>
  ({
    chapterId: 'seo',
    module: 'seo',
    title: 'Visibilidad orgánica',
    claims: [{ claimId: 'c1', text: 'La visibilidad creció en el período', factIds: [] }],
    charts: [],
    tables: [],
    limits: [],
    ...over
  }) as PlanChapterV1

const plan = (over: Partial<EditorialPlanV1> = {}): EditorialPlanV1 =>
  ({
    planVersion: 'editorial_plan_v1',
    locale: 'es-CL',
    executiveSummary: [],
    chapters: [chapter()],
    actions: [],
    limits: [],
    methodology: [],
    references: [],
    ...over
  }) as EditorialPlanV1

describe('buildInsightReportPlanInput', () => {
  it('abre con la portada y cierra con los límites', () => {
    const types = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan() }).slides.map(s => s.contentType)

    expect(types[0]).toBe('report-cover')
    expect(types.at(-1)).toBe('report-limits')
  })

  it('numera los folios de corrido, que es lo que permite resolver el índice sin segunda pasada', () => {
    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan() })

    expect(input.slides.map(s => (s.slots as { pageFolio: string }).pageFolio)).toEqual(
      input.slides.map((_s, i) => String(i + 1))
    )
  })

  it('NO omite un capítulo sin figura: lo narra', () => {
    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan() })

    expect(input.slides.some(s => s.contentType === 'report-narrative')).toBe(true)
  })

  it('reparte una tabla larga en varias páginas y declara la continuación', () => {
    const rows = Array.from({ length: 60 }, (_, i) => [`/p${i}`, String(i), '+1%'])

    const withTable = plan({
      chapters: [
        chapter({ tables: [{ tableId: 't1', title: 'Páginas', columns: ['Página', 'Impresiones', 'Var'], rows }] as never })
      ]
    })

    const tablePages = buildInsightReportPlanInput({ edition, report, snapshot, plan: withTable }).slides.filter(
      s => s.contentType === 'report-table'
    )

    expect(tablePages.length).toBe(3)
    expect((tablePages[0]!.slots as Record<string, unknown>).continuationLabel).toBeUndefined()
    expect((tablePages[1]!.slots as Record<string, unknown>).continuationLabel).toBeDefined()
  })

  it('ninguna página de tabla excede la capacidad declarada del molde', () => {
    const rows = Array.from({ length: 60 }, (_, i) => [`/p${i}`, String(i), '+1%'])

    const withTable = plan({
      chapters: [chapter({ tables: [{ tableId: 't1', title: 'T', columns: ['a', 'b', 'c'], rows }] as never })]
    })

    for (const page of buildInsightReportPlanInput({ edition, report, snapshot, plan: withTable }).slides) {
      if (page.contentType !== 'report-table') continue
      expect((page.slots as { tableRows: unknown[] }).tableRows.length).toBeLessThanOrEqual(26)
    }
  })

  it('emite la página de cierre incluso sin límites: declarar que no los hay también informa', () => {
    const closing = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({ limits: [] }) }).slides.filter(
      s => s.contentType === 'report-limits'
    )

    expect(closing).toHaveLength(1)
    expect((closing[0]!.slots as { limits: unknown[] }).limits).toHaveLength(1)
  })

  it('separa el límite en sujeto y causa, porque «sin datos» a secas no dice qué conectar', () => {
    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({ limits: ['ico: sin datos.'] }) })
    const closing = input.slides.find(s => s.contentType === 'report-limits')!

    expect((closing.slots as { limits: { subject: string; cause: string }[] }).limits[0]).toEqual({
      subject: 'ico',
      cause: 'sin datos'
    })
  })

  it('rechaza un plan sin capítulos en vez de componer un informe vacío', () => {
    expect(() => buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({ chapters: [] }) })).toThrow(
      InsightsRenderRejectedError
    )
  })

  it('rechaza una afirmación que excede el molde en vez de recortarla', () => {
    const withLong = plan({
      chapters: [chapter({ claims: [{ claimId: 'c', text: 'x'.repeat(200), factIds: [] }] })]
    })

    expect(() => buildInsightReportPlanInput({ edition, report, snapshot, plan: withLong })).toThrow(/No se recorta/)
  })

  it('un capítulo SIN afirmaciones se narra con su título, no bloquea el informe', () => {
    // Caso real: una edición con un módulo sin hallazgos llega con el capítulo vacío. Bloquear
    // contradecía la regla del catálogo —el capítulo sin datos se cuenta, no se omite— y el deck
    // compone ese mismo plan sin problema. Lo encontró el canary con datos reales.
    const pages = buildInsightReportPlanInput({
      edition,
      report,
      snapshot,
      plan: plan({ chapters: [chapter({ claims: [] })] })
    }).slides

    const narrative = pages.find(p => p.contentType === 'report-narrative')

    expect(narrative).toBeDefined()
    expect((narrative!.slots as { assertion: string }).assertion).toBe('Visibilidad orgánica')
    expect((narrative!.slots as { paragraphs: string[] }).paragraphs[0]).toMatch(/no registró hallazgos/)
  })

  it('emite una página analítica cuando la figura tiene hechos medibles', () => {
    const facts = [
      { factId: 'f1', value: 61.4, unit: 'percent', evidenceRef: 'ev1' },
      { factId: 'f2', value: 3.1, unit: 'percent', evidenceRef: 'ev2' }
    ]

    const withChart = plan({
      chapters: [
        chapter({
          charts: [
            {
              specVersion: 'chart_spec_v1',
              chartId: 'ch1',
              family: 'bar',
              relation: 'comparison',
              title: 'Variación por tipo de página',
              unit: 'percent',
              dimensionLabels: ['Nuevas', 'Optimizadas'],
              series: [{ seriesId: 's1', label: 'Impresiones', factIds: ['f1', 'f2'], unit: 'percent' }]
            }
          ] as never
        })
      ]
    })

    const pages = buildInsightReportPlanInput({
      edition,
      report,
      snapshot: { facts, sources: [], rejections: [] } as never,
      plan: withChart
    }).slides

    const analysis = pages.find(p => p.contentType === 'report-analysis')

    expect(analysis).toBeDefined()

    const series = (analysis!.slots as { figureSeries: { printedValue: string; emphasis: string }[] }).figureSeries

    expect(series).toHaveLength(2)
    // El formateador canónico del plan (el de tablas y afirmaciones), no uno propio: un nivel no lleva «+».
    expect(series[0]!.printedValue).toBe('61,4 %')
    expect(series[0]!.emphasis).toBe('lead')
    // Cada barra se nombra por su métrica (dimensionLabels), no por la etiqueta de la serie.
    expect((analysis!.slots as { figureSeries: { name: string }[] }).figureSeries.map(row => row.name)).toEqual(['Nuevas', 'Optimizadas'])
    expect((analysis!.slots as { figureUnit: string }).figureUnit).toBe('Porcentaje')
  })

  // Forma real de un plan SEO (canary Berel, 2026-09-22): comparación de períodos por métrica.
  const periodComparison = (metrics: number) => {
    const facts = Array.from({ length: metrics }, (_, i) => [
      { factId: `cur${i}`, value: (i + 1) * 1000, unit: 'count', evidenceRef: `ev-c${i}` },
      { factId: `prev${i}`, value: (i + 1) * 900, unit: 'count', evidenceRef: `ev-p${i}` }
    ]).flat()

    const chart = {
      specVersion: 'chart_spec_v1', chartId: 'chart.seo.count', family: 'bar_grouped', relation: 'comparison',
      title: 'Visibilidad orgánica · Cantidad', unit: 'count',
      dimensionLabels: Array.from({ length: metrics }, (_, i) => `Métrica ${i + 1}`),
      series: [
        { seriesId: 'prev', label: 'Período anterior', factIds: Array.from({ length: metrics }, (_, i) => `prev${i}`), unit: 'count' },
        { seriesId: 'cur', label: 'Período', factIds: Array.from({ length: metrics }, (_, i) => `cur${i}`), unit: 'count' }
      ]
    }

    return buildInsightReportPlanInput({
      edition, report,
      snapshot: { facts, sources: [], rejections: [] } as never,
      plan: plan({ chapters: [chapter({ charts: [chart] as never })] })
    }).slides.filter(p => p.contentType === 'report-analysis').map(p => p.slots as { figureTitle: string; figureSeries: { name: string; printedValue: string; scaleGroup?: string }[] })
  }

  it('una comparación de períodos dibuja pares con nombre de métrica y escala propia', () => {
    const [figure] = periodComparison(2)

    expect(figure!.figureSeries.map(row => [row.name, row.printedValue, row.scaleGroup])).toEqual([
      ['Métrica 1', '1.000', 'dimension-0'],
      ['Período anterior', '900', 'dimension-0'],
      ['Métrica 2', '2.000', 'dimension-1'],
      ['Período anterior', '1.800', 'dimension-1']
    ])
  })

  it('una figura que no cabe se PAGINA sin recortar barras ni partir un par', () => {
    const figures = periodComparison(6)
    const rows = figures.flatMap(figure => figure.figureSeries)

    expect(rows).toHaveLength(12)
    expect(figures.map(figure => figure.figureSeries.length)).toEqual([6, 6])
    expect(figures[1]!.figureTitle).toBe('Visibilidad orgánica · Cantidad (continuación)')

    for (const figure of figures) {
      const groups = figure.figureSeries.map(row => row.scaleGroup)

      for (const group of new Set(groups)) expect(groups.filter(g => g === group)).toHaveLength(2)
    }
  })

  it('reparte las barras de una serie para que ninguna página quede con una sola', () => {
    const facts = Array.from({ length: 7 }, (_, i) => ({ factId: `f${i}`, value: i + 1, unit: 'score', evidenceRef: `ev${i}` }))

    const chart = {
      specVersion: 'chart_spec_v1', chartId: 'ch', family: 'bar', relation: 'comparison', title: 'Dimensiones', unit: 'score',
      dimensionLabels: facts.map((_, i) => `Dimensión ${i + 1}`),
      series: [{ seriesId: 's', label: 'Período', factIds: facts.map(f => f.factId), unit: 'score' }]
    }

    const figures = buildInsightReportPlanInput({
      edition, report,
      snapshot: { facts, sources: [], rejections: [] } as never,
      plan: plan({ chapters: [chapter({ charts: [chart] as never })] })
    }).slides.filter(p => p.contentType === 'report-analysis').map(p => (p.slots as { figureSeries: unknown[] }).figureSeries.length)

    expect(figures).toEqual([4, 3])
  })

  it('pagina el resumen ejecutivo en vez de recortarlo', () => {
    const claims = Array.from({ length: 10 }, (_, i) => ({ claimId: `s${i}`, text: `Hallazgo ${i + 1}.`, factIds: [] }))

    const narrative = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({ executiveSummary: claims }) })
      .slides.filter(p => (p.slots as { runningChapter?: string }).runningChapter === 'Resumen ejecutivo')
      .flatMap(p => (p.slots as { paragraphs: string[] }).paragraphs)

    expect(narrative).toHaveLength(9)
    expect(narrative.at(-1)).toBe('Hallazgo 10.')
  })

  it('NO dibuja una figura cuyos hechos no son medibles: el capítulo se narra', () => {
    const withChart = plan({
      chapters: [
        chapter({
          charts: [
            {
              specVersion: 'chart_spec_v1', chartId: 'ch1', family: 'bar', relation: 'comparison',
              title: 'Sin datos', unit: 'percent', dimensionLabels: ['a', 'b'],
              series: [{ seriesId: 's1', label: 'x', factIds: ['f1'], unit: 'percent' }]
            }
          ] as never
        })
      ]
    })

    const pages = buildInsightReportPlanInput({
      edition, report,
      snapshot: { facts: [{ factId: 'f1', value: null, unit: 'percent', evidenceRef: 'ev' }], sources: [], rejections: [] } as never,
      plan: withChart
    }).slides

    expect(pages.some(p => p.contentType === 'report-analysis')).toBe(false)
    expect(pages.some(p => p.contentType === 'report-narrative')).toBe(true)
  })
})
