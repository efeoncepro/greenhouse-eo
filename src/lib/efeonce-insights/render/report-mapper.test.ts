import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'

import { composeArtifact } from '@/lib/artifact-composer'
import { insightsReportCatalog } from '@/lib/artifact-composer/catalogs/insights-report'

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
  request: { period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' } },
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
  type Folio = { folio?: { page: string; total: string }; pageFolio?: string }
  type Entry = { mark: string; title: string; folio: string }

  /** El folio impreso de cada página, venga del pie en papel (`folio.page`) o de la apertura (`pageFolio`). */
  const printedFolios = (slides: { slots: unknown }[]) =>
    slides.map(s => (s.slots as Folio).folio?.page ?? (s.slots as Folio).pageFolio ?? null)

  it('abre con la portada y cierra con los límites y la contraportada (TASK-1889)', () => {
    const types = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan() }).slides.map(s => s.contentType)

    expect(types).toEqual(['report-cover', 'report-index', 'report-chapter', 'report-narrative', 'report-limits', 'report-back-cover'])
  })

  it('numera los folios de corrido con el total real, que es lo que permite resolver el índice sin segunda pasada', () => {
    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan() })

    // Portada y contraportada no llevan folio (canvas aprobado); el resto imprime su página física.
    expect(printedFolios(input.slides)).toEqual([null, '02', '03', '04', '05', null])

    for (const slide of input.slides) {
      const folio = (slide.slots as Folio).folio

      if (folio) expect(folio.total).toBe('06')
    }

    expect((input.slides[1]!.slots as { entries: Entry[] }).entries).toEqual([
      { mark: '01', title: 'Visibilidad orgánica', folio: '03' },
      { mark: 'L', title: 'Límites y metodología', folio: '05' }
    ])
  })

  it('la apertura de cada capítulo lista sus páginas con su folio físico', () => {
    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan() })
    const opening = input.slides.find(s => s.contentType === 'report-chapter')!

    expect(opening.slots).toMatchObject({ chapterLabel: 'Capítulo 01', chapterNumeral: '01', pageFolio: '03' })
    expect((opening.slots as { contents: { entries: { title: string; folio: string }[] } }).contents.entries).toEqual([
      { title: 'La visibilidad creció en el período', folio: '04' }
    ])
  })

  it('contacto, mercados y línea legal de la contraportada salen del SSOT de marca', () => {
    const back = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan() }).slides.at(-1)!

    expect(back.slots).toMatchObject({
      contact: { email: 'sales@efeoncepro.com', phonePrimary: '+56 9 3732 3064', phoneSecondary: '+1 (239) 235-2073' },
      marketsLine: 'Chile · Estados Unidos · Colombia · México · Perú'
    })
    expect((back.slots as { legalLine: string }).legalLine).toMatch(/Efeonce Group SpA · RUT 77\.357\.182-1 · .* · Cifras al 31 de agosto de 2026$/)
  })

  it('compone una edición grande con índice real y folios físicos', () => {
    const chapters = Array.from({ length: 27 }, (_, index) =>
      chapter({ chapterId: `chapter-${index + 1}`, title: `Capítulo ${index + 1}` })
    )

    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({ chapters }) })
    const entries = input.slides.filter(page => page.contentType === 'report-index').flatMap(page => (page.slots as { entries: Entry[] }).entries)

    // Portada + 2 de índice (28 secciones a 20 por página) + 27 × (apertura + narrativa) + límites + contraportada.
    expect(input.slides).toHaveLength(59)
    expect(entries).toHaveLength(28)
    expect(entries[0]).toEqual({ mark: '01', title: 'Capítulo 1', folio: '04' })
    expect(entries.at(-1)).toEqual({ mark: 'L', title: 'Límites y metodología', folio: '58' })

    printedFolios(input.slides).forEach((folio, i) => {
      if (folio !== null) expect(folio).toBe(String(i + 1).padStart(2, '0'))
    })
  })

  it('renderiza un PDF real con el catálogo editorial y folios convergentes', async () => {
    const chapters = Array.from({ length: 12 }, (_, index) =>
      chapter({ chapterId: `chapter-${index + 1}`, title: `Capítulo ${index + 1}` })
    )

    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({ chapters }) })
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'task-1889-report-'))

    try {
      expect(input.slides).toHaveLength(28)

      const result = await composeArtifact(insightsReportCatalog, input as never, outDir, { concurrency: 4 })

      expect(result.pdfPath).toBeDefined()
      const pdf = await PDFDocument.load(await readFile(result.pdfPath!))

      expect(pdf.getPageCount()).toBe(28)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  }, 180_000)

  it('pagina el índice cuando hay más de 20 secciones y conserva los folios reales', () => {
    const chapters = Array.from({ length: 21 }, (_, index) =>
      chapter({ chapterId: `chapter-${index + 1}`, title: `Capítulo ${index + 1}` })
    )

    const input = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({ chapters }) })
    const indexPages = input.slides.filter(page => page.contentType === 'report-index')
    const secondIndex = indexPages[1]!
    const entries = (secondIndex.slots as { entries: Entry[] }).entries

    expect(indexPages).toHaveLength(2)
    expect((secondIndex.slots as { title: string }).title).toBe('Índice (continuación)')
    expect(entries[0]).toEqual({ mark: '21', title: 'Capítulo 21', folio: '44' })
    expect(entries.at(-1)).toEqual({ mark: 'L', title: 'Límites y metodología', folio: '46' })
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

  it('la tabla lleva su cifra contada, la escala de la tabla COMPLETA y su procedencia (TASK-1889)', () => {
    const rows = Array.from({ length: 30 }, (_, i) => [`/p${i}`, String((i + 1) * 100), null])

    const pages = buildInsightReportPlanInput({
      edition, report, snapshot,
      plan: plan({ chapters: [chapter({ tables: [{ tableId: 't1', title: 'Páginas', columns: ['Página', 'Clics'], rows }] })] })
    }).slides.filter(p => p.contentType === 'report-table')

    expect(pages).toHaveLength(2)

    for (const page of pages) {
      // La misma escala en las dos páginas: la barra de /p0 no cambia de tamaño al pasar la hoja.
      expect(page.slots).toMatchObject({ heroFigure: '30', barScaleMax: '3000', source: { label: 'Fuente' } })
      expect((page.slots as { tableColumns: { label: string }[] }).tableColumns[0]).toEqual({ label: '#' })
    }
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

  it('compone line, pie, donut y scatter desde sus hechos como SVG en el PDF A4', async () => {
    const facts = [
      ...[
        ['line-1', 10], ['line-2', 30], ['line-3', 20],
        ['pie-1', 6], ['pie-2', 3], ['pie-3', 1],
        ['donut-1', 2], ['donut-2', 5], ['donut-3', 3],
        ['scatter-x1', 1], ['scatter-x2', 2], ['scatter-x3', 3],
        ['scatter-y1', 4], ['scatter-y2', 2], ['scatter-y3', 8]
      ] as const
    ].map(([factId, value]) => ({ factId, value, unit: 'count', evidenceRef: `ev-${factId}` }))

    const chart = (family: 'line' | 'pie' | 'donut' | 'scatter', series: { seriesId: string; label: string; factIds: string[]; unit: string }[]) => ({
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
      tabularEquivalent: { columns: series.map(item => item.label), rows: [0, 1, 2].map(index => series.map(item => item.factIds[index]!)) }
    })

    const charts = [
      chart('line', [{ seriesId: 'line', label: 'Tendencia', factIds: ['line-1', 'line-2', 'line-3'], unit: 'count' }]),
      chart('pie', [{ seriesId: 'pie', label: 'Composición', factIds: ['pie-1', 'pie-2', 'pie-3'], unit: 'count' }]),
      chart('donut', [{ seriesId: 'donut', label: 'Composición', factIds: ['donut-1', 'donut-2', 'donut-3'], unit: 'count' }]),
      chart('scatter', [
        { seriesId: 'x', label: 'X', factIds: ['scatter-x1', 'scatter-x2', 'scatter-x3'], unit: 'count' },
        { seriesId: 'y', label: 'Y', factIds: ['scatter-y1', 'scatter-y2', 'scatter-y3'], unit: 'count' }
      ])
    ]

    const input = buildInsightReportPlanInput({
      edition,
      report,
      snapshot: { facts, sources: [], rejections: [] } as never,
      plan: plan({ chapters: [chapter({ charts: charts as never })] })
    })

    const figures = input.slides.filter(slide => slide.contentType === 'report-analysis')

    expect(figures).toHaveLength(4)
    expect(figures.map(slide => (slide.slots as { figureSeries: { chartFamily: string; geometryPath1: string }[] }).figureSeries[0])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ chartFamily: 'line', geometryPath1: expect.stringMatching(/^M /) }),
        expect.objectContaining({ chartFamily: 'pie', geometryPath1: expect.stringMatching(/^M /) }),
        expect.objectContaining({ chartFamily: 'donut', geometryPath1: expect.stringMatching(/^M /) }),
        expect.objectContaining({ chartFamily: 'scatter', geometryPath1: expect.stringMatching(/^M /) })
      ])
    )

    const outDir = await mkdtemp(path.join(os.tmpdir(), 'insights-chart-families-'))

    try {
      const result = await composeArtifact(insightsReportCatalog, input as never, outDir, { concurrency: 2 })

      expect(result.pdfPath).toBeDefined()
      const pdf = await PDFDocument.load(await readFile(result.pdfPath!))

      expect(pdf.getPageCount()).toBe(input.slides.length)
      expect(result.slidePaths).toHaveLength(input.slides.length)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
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
      .slides.filter(p => (p.slots as { runningSection?: string }).runningSection === 'Resumen ejecutivo')
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
