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

const claim0 = (text: string) => ({ claimId: text, text, factIds: [] })

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

  it('la narrada lleva en su columna las páginas que la respaldan, con folio real (TASK-1889)', () => {
    const rows = [['/a', '10', null]]

    const input = buildInsightReportPlanInput({
      edition, report, snapshot,
      plan: plan({
        executiveSummary: [claim0('Resumen del mes'), claim0('Detalle')],
        decision: claim0('Aprobar el plan de septiembre.'),
        chapters: [chapter({ claims: [claim0('Titular'), claim0('Párrafo')], tables: [{ tableId: 't1', title: 'Páginas', columns: ['Página', 'Clics'], rows }] as never })]
      } as never)
    })

    const narratives = input.slides.filter(s => s.contentType === 'report-narrative')
    const summary = narratives.find(s => (s.slots as { runningSection: string }).runningSection === 'Resumen ejecutivo')!
    const chapterNarrative = narratives.find(s => s !== summary)!
    const tableFolio = (input.slides.findIndex(s => s.contentType === 'report-table') + 1).toString().padStart(2, '0')
    const openingFolio = (input.slides.findIndex(s => s.contentType === 'report-chapter') + 1).toString().padStart(2, '0')

    expect(chapterNarrative.slots).toMatchObject({ evidence: { label: 'En este capítulo', items: [{ folio: `p. ${tableFolio}`, text: 'Páginas' }] } })
    expect(summary.slots).toMatchObject({
      evidence: { label: 'En este informe', items: [{ folio: `p. ${openingFolio}`, text: 'Visibilidad orgánica' }] },
      closing: [{ kind: 'action', label: 'Para decidir en la reunión', text: 'Aprobar el plan de septiembre.' }]
    })
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

    expect(tablePages.length).toBe(4) // 16 filas por página (tablero de barras, TASK-1889)
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
      // La cifra protagonista es el valor de la fila más alta de la tabla COMPLETA, con su bajada.
      expect(page.slots).toMatchObject({ heroFigure: '3000', barScaleMax: '3000', source: { label: 'Fuente' }, legend: { label: 'Clics' } })
      expect((page.slots as { heroText: string }).heroText).toBe('clics en <strong>/p29</strong>, la fila más alta de la tabla')
      expect((page.slots as { tableColumns: { label: string }[] }).tableColumns[0]).toEqual({ label: '#' })
    }

    // El ranking continúa en la página siguiente: la segunda página empieza en la fila 17.
    expect((pages[0]!.slots as { rankOffset?: string }).rankOffset).toBeUndefined()
    expect((pages[1]!.slots as { rankOffset?: string }).rankOffset).toBe('16')
  })

  it('ninguna página de tabla excede la capacidad declarada del molde', () => {
    const rows = Array.from({ length: 60 }, (_, i) => [`/p${i}`, String(i), '+1%'])

    const withTable = plan({
      chapters: [chapter({ tables: [{ tableId: 't1', title: 'T', columns: ['a', 'b', 'c'], rows }] as never })]
    })

    for (const page of buildInsightReportPlanInput({ edition, report, snapshot, plan: withTable }).slides) {
      if (page.contentType !== 'report-table') continue
      expect((page.slots as { tableRows: unknown[] }).tableRows.length).toBeLessThanOrEqual(16)
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

    const figure = pages.find(p => p.contentType === 'report-figure-columns')

    expect(figure).toBeDefined()

    const slots = figure!.slots as { columnGroups: { label: string; current: string }[]; provenance: { label: string; text: string }[]; keyFigure: string }

    // Cada columna se nombra por su dimensión y lleva la cifra del formateador canónico (un nivel no lleva «+»).
    expect(slots.columnGroups.map(group => [group.label, group.current])).toEqual([['Nuevas', '61,4 %'], ['Optimizadas', '3,1 %']])
    expect(slots.keyFigure).toBe('61,4 %')
    expect(slots.provenance[0]).toEqual({ label: 'Unidad', text: 'porcentaje' })
  })

  it('compone metas, tendencia, columnas y comparación en el PDF A4; una familia sin página se rechaza', async () => {
    const facts = [
      ['otd', 82, 'percent'], ['otd-target', 90, 'percent'], ['otd-band', 70, 'percent'],
      ['m1', 10, 'count'], ['m2', 30, 'count'], ['m3', 20, 'count'],
      ['gpt', 12, 'count'], ['gem', 8, 'count'],
      ['c1', 1284, 'count'], ['p1', 1102, 'count'], ['c2', 48310, 'count'], ['p2', 51940, 'count']
    ].map(([factId, value, unit]) => ({ factId: String(factId), value, unit, label: String(factId), metricId: String(factId), evidenceRef: `ev-${factId}` }))

    const base = { specVersion: 'chart_spec_v1' as const, references: [], scale: { kind: 'linear' as const, baseline: 0 as const }, tabularEquivalent: { columns: [], rows: [] } }

    const charts = [
      { ...base, chartId: 'chart.bullet', family: 'bullet', relation: 'target', title: 'Entregas a tiempo', series: [], dimensionLabels: ['Space'], unit: 'percent',
        data: { kind: 'bullet', direction: 'higher_is_better', items: [{ itemId: 'i1', label: 'Space', valueFactId: 'otd', targetFactId: 'otd-target', bandFactId: 'otd-band' }] } },
      { ...base, chartId: 'chart.line', family: 'line', relation: 'trend', title: 'Tendencia', unit: 'count', dimensionLabels: ['2026-07', '2026-08', '2026-09'],
        series: [{ seriesId: 's', label: 'Clics', factIds: ['m1', 'm2', 'm3'], unit: 'count' }] },
      { ...base, chartId: 'chart.bar', family: 'bar', relation: 'comparison', title: 'Menciones por motor', unit: 'count', dimensionLabels: ['ChatGPT', 'Gemini'],
        dimensionChannelIds: ['chatgpt', 'gemini'], series: [{ seriesId: 's', label: 'Período', factIds: ['gpt', 'gem'], unit: 'count' }] },
      { ...base, chartId: 'chart.cmp', family: 'bar_grouped', relation: 'comparison', title: 'Search Console', unit: 'count', dimensionLabels: ['Clics', 'Impresiones'],
        series: [
          { seriesId: 'p', label: 'Período anterior', factIds: ['p1', 'p2'], unit: 'count' },
          { seriesId: 'c', label: 'Período', factIds: ['c1', 'c2'], unit: 'count' }
        ] }
    ]

    const input = buildInsightReportPlanInput({
      edition, report,
      snapshot: { facts, sources: [], rejections: [] } as never,
      plan: plan({ chapters: [chapter({ claims: [{ claimId: 'c', text: 'Los datos sostienen estas figuras.', factIds: facts.map(f => f.factId) }], charts: charts as never })] })
    })

    expect(input.slides.map(slide => slide.contentType)).toEqual(
      expect.arrayContaining(['report-figure-targets', 'report-figure-trend', 'report-figure-columns', 'report-figure-comparison'])
    )

    const outDir = await mkdtemp(path.join(os.tmpdir(), 'insights-report-figures-'))

    try {
      const result = await composeArtifact(insightsReportCatalog, input as never, outDir, { concurrency: 2 })
      const pdf = await PDFDocument.load(await readFile(result.pdfPath!))

      expect(pdf.getPageCount()).toBe(input.slides.length)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }

    const pie = { ...base, chartId: 'chart.pie', family: 'pie', relation: 'composition', title: 'Composición', unit: 'count', dimensionLabels: ['A', 'B'],
      series: [{ seriesId: 's', label: 'Partes', factIds: ['m1', 'm2'], unit: 'count' }] }

    expect(() =>
      buildInsightReportPlanInput({ edition, report, snapshot: { facts, sources: [], rejections: [] } as never, plan: plan({ chapters: [chapter({ charts: [pie] as never })] }) })
    ).toThrow(InsightsRenderRejectedError)
  }, 120_000)

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
    }).slides.filter(p => p.contentType === 'report-figure-comparison').map(p => p.slots as { figureTitle: string; metrics: { name: string; current: string; prior: string; direction: string; delta: string }[] })
  }

  it('una comparación de períodos dibuja, por métrica, el período, el anterior y la variación', () => {
    const [figure] = periodComparison(2)

    expect(figure!.metrics.map(row => [row.name, row.current, row.prior, row.direction, row.delta])).toEqual([
      ['Métrica 1', '1.000', '900', 'up', '11,1 %'],
      ['Métrica 2', '2.000', '1.800', 'up', '11,1 %']
    ])
  })

  it('una figura que no cabe se PAGINA equilibrada, sin recortar métricas ni partir un par', () => {
    const figures = periodComparison(6)

    expect(figures.map(figure => figure.metrics.length)).toEqual([3, 3])

    for (const row of figures.flatMap(figure => figure.metrics)) expect(row.prior).toBeTruthy()
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
    }).slides.filter(p => p.contentType === 'report-figure-columns').map(p => (p.slots as { columnGroups: unknown[] }).columnGroups.length)

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

    expect(pages.some(p => p.contentType.startsWith('report-figure-'))).toBe(false)
    expect(pages.some(p => p.contentType === 'report-narrative')).toBe(true)
  })
})
