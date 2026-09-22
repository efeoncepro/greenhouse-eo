/**
 * Plan editorial congelado → páginas del catálogo `insights-report` (A4 vertical).
 *
 * QUÉ ES: el mapper del informe vertical. Decide QUÉ va en cada página y en qué orden, y reparte
 * el contenido largo entre páginas ANTES de imprimir, que es lo que permite resolver el folio y el
 * índice en una sola pasada (`GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md`).
 *
 * QUÉ NO ES: el mapper del deck. Ese vive en `deck-mapper.ts`, usa otro catálogo y otros
 * presupuestos, y no se toca desde acá.
 *
 * El reparto usa `paginateFlow` con la capacidad declarada de cada plantilla como unidad —filas,
 * párrafos— en vez de píxeles medidos. Es deliberado y tiene red: si un reparto igual no cupiera,
 * el motor lo rechaza al componer (`assertSlideFitsCanvas`), nunca lo recorta. Cuando haga falta
 * afinar, la unidad pasa a píxeles medidos con `measureSlideFit` y el algoritmo no cambia.
 *
 * Ninguna cifra se recalcula acá: todas vienen del plan sellado.
 */

import 'server-only'

// Deep-import DELIBERADO al módulo puro, no al barrel.
//
// El barrel del composer arrastra el motor de render —Playwright, pdf-lib y los catálogos con sus
// fuentes embebidas— y este archivo lo consume un command que corre en Vercel. Importar de él un
// VALOR (no un tipo) llevó la función `insights/catalog` a 441 MB y rompió el build de staging,
// exactamente la misma bug class que el 2026-09-16 obligó a que el catálogo viajara como STRING.
//
// `paginate.ts` no tiene un solo import: su cierre transitivo es él mismo. El deck-mapper, que
// convive en esta carpeta, sólo importa TIPOS del barrel — y por eso nunca pesó.
import { paginateFlow, type FlowBlock } from '@/lib/artifact-composer/paginate'
import type { CompositionPlanInput, CompositionSlideInput } from '@/lib/artifact-composer'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { ChartSpecV1 } from '../contracts/chart-spec'
import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'
import type { EvidenceFactV1 } from '../contracts/evidence'
import { formatFactValue } from '../editorial/format'
import type { EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'
import { InsightsRenderRejectedError } from '../errors'
import { withDedupedLimits } from './plan-limits'

/** Capacidades declaradas por plantilla. Son del molde, no preferencias. */
const CAPACITY = {
  /** Filas de tabla por página. */
  tableRows: 26,
  /** Párrafos por página narrativa. */
  paragraphs: 7,
  /** Límites por página de cierre. */
  limits: 14
} as const

/** Párrafos de desarrollo que admite la página analítica (`development.maxItems`). */
const DEVELOPMENT_ITEMS = 3

const BUDGET = {
  assertion: 130,
  development: 340,
  lead: 260,
  paragraph: 420,
  limitCause: 110,
  limitSubject: 38
} as const

const rejectIfLonger = (value: string, max: number, field: string): string => {
  if (value.length > max) {
    throw new InsightsRenderRejectedError(
      `El campo "${field}" del informe mide ${value.length} caracteres y el molde admite ${max}. ` +
        'No se recorta: un informe que ampute una afirmación deja de ser auditable.'
    )
  }

  return value
}

/** Divide un flujo en páginas usando la capacidad declarada como unidad. */
const chunkByCapacity = <T>(items: readonly T[], capacity: number, idOf: (item: T, i: number) => string): T[][] => {
  if (items.length === 0) return []

  const blocks: FlowBlock[] = items.map((item, i) => ({ blockId: idOf(item, i), heightPx: 1 }))
  const pages = paginateFlow(blocks, { contentHeightPx: capacity, guardPx: 0 })
  const byId = new Map(blocks.map((b, i) => [b.blockId, items[i]!]))

  return pages.map(page => page.blockIds.map(id => byId.get(id)!))
}

export interface BuildInsightReportInput {
  readonly edition: InsightEditionRecord
  readonly report: InsightReportRecord
  readonly plan: EditorialPlanV1
  readonly snapshot: EvidenceSnapshotRecord
}

/**
 * Formatea la cifra tal como se imprime junto a su marca.
 *
 * El resolver del catálogo vuelve a leer este texto y falla si no representa el valor que dibuja la
 * barra: por eso el formato se produce en un solo lugar y con el mismo criterio es-CL (coma
 * decimal) que el parser espera.
 */
/** Barras por figura: lo que declara la plantilla (`figureSeries.maxItems`), no una preferencia. */
const FIGURE_ROWS = 6

interface FigureRow {
  /** Interno: con qué afirmaciones del plan se narra la página. No viaja al slot. */
  factId: string
  name: string
  printedValue: string
  valuePct: number
  emphasis: 'lead' | 'rest'
  evidenceRef: string
  scaleGroup?: string
}

const figureRowOf = (name: string, fact: EvidenceFactV1, locale: string, emphasis: 'lead' | 'rest', scaleGroup?: string): FigureRow => ({
  factId: fact.factId,
  name,
  // El formateador canónico del plan, el mismo que escribe tablas y afirmaciones: una figura con su
  // propio formato dice «+1,9%» donde la tabla dice «1,9 %» (y el «+» vuelve variación a un nivel).
  printedValue: formatFactValue(fact.value, fact.unit, locale),
  valuePct: fact.value as number,
  emphasis,
  evidenceRef: fact.evidenceRef,
  ...(scaleGroup ? { scaleGroup } : {})
})

/**
 * Grupos de barras de una figura. Un grupo NO se parte entre páginas.
 *
 * - Una serie: cada hecho es una barra con el nombre de su métrica, en escala compartida.
 * - Comparación de períodos (varias series): cada métrica es un grupo —la barra del período con el
 *   nombre de la métrica y, debajo, la de cada referencia con el nombre que le da el plan («Período
 *   anterior»)— y mide contra su propio máximo (`scaleGroup`). Métricas de magnitudes distintas no se
 *   aplastan entre sí, y la barra nunca queda sin decir qué mide.
 *
 * Un hecho sin valor no se dibuja como cero: se omite de la figura y su ausencia está en la tabla y en
 * los límites.
 */
const figureGroupsOf = (chart: ChartSpecV1, factsById: ReadonlyMap<string, EvidenceFactV1>, locale: string): FigureRow[][] => {
  const current = chart.series[chart.series.length - 1]
  const references = chart.series.slice(0, -1)

  if (!current) return []

  const measured = (id: string | undefined) => {
    const fact = id ? factsById.get(id) : undefined

    return fact && fact.value !== null ? fact : null
  }

  if (references.length === 0) {
    const facts = current.factIds.map((id, index) => ({ fact: measured(id), name: chart.dimensionLabels[index] }))
    const drawn = facts.filter((entry): entry is { fact: EvidenceFactV1; name: string } => entry.fact !== null && Boolean(entry.name))
    const max = Math.max(...drawn.map(entry => entry.fact.value as number))

    return drawn.map(entry => [figureRowOf(entry.name, entry.fact, locale, entry.fact.value === max ? 'lead' : 'rest')])
  }

  return current.factIds.flatMap((id, index) => {
    const now = measured(id)
    const name = chart.dimensionLabels[index]
    const before = references.map(serie => ({ serie, fact: measured(serie.factIds[index]) }))

    if (!now || !name || before.some(entry => entry.fact === null)) return []

    const group = `dimension-${index}`

    return [[
      figureRowOf(name, now, locale, 'lead', group),
      ...before.map(entry => figureRowOf(entry.serie.label, entry.fact!, locale, 'rest', group))
    ]]
  })
}

/**
 * Una figura del plan → una o más páginas analíticas. Si las barras no caben en una figura, la figura
 * se PAGINA con el primitivo del motor (cada grupo es un bloque indivisible); nunca se recortan barras.
 * Las páginas se equilibran para que ninguna quede con una sola barra.
 *
 * Devuelve `[]` cuando la figura no se puede dibujar con lo que hay: una serie sin hechos medibles no se
 * rellena con ceros — el capítulo se narra y el faltante viaja a la página de límites.
 */
const figurePagesOf = (
  chart: ChartSpecV1,
  factsById: ReadonlyMap<string, EvidenceFactV1>,
  locale: string
): { factIds: string[]; comparison: boolean; slots: Record<string, unknown> }[] => {
  const groups = figureGroupsOf(chart, factsById, locale)
  const total = groups.reduce((sum, group) => sum + group.length, 0)

  if (total < 2) return []

  const groupSize = Math.max(...groups.map(group => group.length))
  const pageCount = Math.ceil(total / FIGURE_ROWS)
  const capacity = Math.min(FIGURE_ROWS, Math.ceil(Math.ceil(total / pageCount) / groupSize) * groupSize)
  const blocks: FlowBlock[] = groups.map((group, index) => ({ blockId: `g${index}`, heightPx: group.length }))

  const pages = paginateFlow(blocks, { contentHeightPx: capacity, guardPx: 0 }).map(page =>
    page.blockIds.flatMap(id => groups[Number(id.slice(1))]!)
  )

  // Una página con una sola barra no es una figura (la plantilla exige dos): toma una de la anterior.
  const last = pages[pages.length - 1]
  const previous = pages[pages.length - 2]

  if (last && previous && last.length < 2 && previous.length > 2 && groupSize === 1) last.unshift(previous.pop()!)

  const unit = GH_INSIGHTS.units[chart.unit] ?? GH_INSIGHTS.document.unitLabel

  return pages.map((rows, index) => ({
    factIds: rows.map(row => row.factId),
    comparison: chart.series.length > 1,
    slots: {
      figureTitle: index === 0 ? chart.title : `${chart.title} ${GH_INSIGHTS.document.figureContinued}`,
      // El slot valida su forma: el factId interno no viaja.
      figureSeries: rows.map(row => ({
        name: row.name,
        printedValue: row.printedValue,
        valuePct: row.valuePct,
        emphasis: row.emphasis,
        evidenceRef: row.evidenceRef,
        ...(row.scaleGroup ? { scaleGroup: row.scaleGroup } : {})
      })),
      figureUnit: unit,
      figureSource: GH_INSIGHTS.document.evidenceSource
    }
  }))
}

/**
 * Etiqueta del período en la zona DECLARADA por la edición, no en la del proceso.
 *
 * La ventana es `[inicio, fin)`, así que el rótulo se toma del inicio: el instante final pertenece
 * al período siguiente y etiquetar con él correría el mes entero.
 */
const periodLabelOf = (edition: InsightEditionRecord): string => {
  const label = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: edition.periodTimeZone
  }).format(new Date(edition.periodStartUtc))

  return label.charAt(0).toUpperCase() + label.slice(1)
}

const issuedLabelOf = (edition: InsightEditionRecord): string =>
  edition.issuedAt ? edition.issuedAt.slice(0, 10) : 'Sin emitir'

const chapterPages = (
  chapter: PlanChapterV1,
  periodLabel: string,
  factsById: ReadonlyMap<string, EvidenceFactV1>,
  locale: string
): Omit<CompositionSlideInput, 'slideId'>[] => {
  const chapterLabel = chapter.title
  const running = { runningChapter: chapterLabel, runningPeriod: periodLabel }
  const claims = chapter.claims.map(c => c.text)

  // Un capítulo SIN afirmaciones no bloquea el informe ni desaparece: se narra con su título y la
  // ausencia queda dicha. Bloquear habría contradicho la regla que este catálogo defiende —el
  // capítulo sin datos se cuenta, no se omite— y además es un caso REAL: el plan de una edición con
  // un módulo sin hallazgos llega así, y el deck lo compone sin problema. Lo encontró el canary con
  // datos reales, no los tests: los fixtures siempre traían al menos una afirmación.
  const [headline, ...rest] =
    claims.length > 0 ? claims : [chapter.title, 'Esta sección no registró hallazgos en el período.']

  const pages: Omit<CompositionSlideInput, 'slideId'>[] = []

  // Cada página de figura se narra con las afirmaciones del plan que citan los hechos que dibuja: la
  // figura y su texto afirman lo mismo. Repetir el titular del capítulo en cada página (lo que hacía
  // antes) dejaba cuatro páginas seguidas con el mismo texto y figuras distintas.
  for (const figure of chapter.charts.flatMap(chart => figurePagesOf(chart, factsById, locale))) {
    const drawn = new Set(figure.factIds)
    const own = chapter.claims.filter(claim => claim.factIds.some(id => drawn.has(id))).map(claim => claim.text)
    const [figureHeadline, figureLead, ...figureRest] = own.length > 0 ? own : [headline!, rest[0] ?? headline!]

    pages.push({
      contentType: 'report-analysis',
      slots: {
        ...running,
        assertion: rejectIfLonger(figureHeadline!, BUDGET.assertion, `${chapter.chapterId}.assertion`),
        // Con una sola afirmación, repetirla como conclusión no dice nada: la bajada lee la figura (qué
        // significa cada color), que es lo que el lector necesita para no malinterpretarla.
        conclusion: rejectIfLonger(
          figureLead ?? (figure.comparison ? GH_INSIGHTS.document.figureLegendComparison : GH_INSIGHTS.document.figureLegendSingle),
          BUDGET.lead,
          `${chapter.chapterId}.conclusion`
        ),
        ...figure.slots,
        // El molde admite 3 párrafos: con más, van 2 y un aviso. Ninguna cifra se pierde del documento —
        // todas las afirmaciones del capítulo se narran completas en sus páginas narrativas y en la tabla.
        development: (figureRest.length === 0
          ? [GH_INSIGHTS.document.figureDetailInTable]
          : figureRest.length <= DEVELOPMENT_ITEMS
            ? figureRest
            : [...figureRest.slice(0, DEVELOPMENT_ITEMS - 1), GH_INSIGHTS.document.figureMoreInNarrative]
        ).map(text => rejectIfLonger(text, BUDGET.development, `${chapter.chapterId}.development`))
      }
    })
  }

  // Un capítulo SIN figura no se omite: se narra. Desaparecerlo convertiría la falta de datos en
  // silencio, que es justo lo que la página de límites existe para impedir.
  const paragraphPages = chunkByCapacity(
    rest.length > 0 ? rest : ['Esta sección no registró hallazgos adicionales en el período.'],
    CAPACITY.paragraphs,
    (_p, i) => `${chapter.chapterId}-p${i}`
  )

  paragraphPages.forEach((paragraphs, i) => {
    pages.push({
      contentType: 'report-narrative',
      slots: {
        ...running,
        assertion: rejectIfLonger(headline!, BUDGET.assertion, `${chapter.chapterId}.assertion`),
        ...(i === 0 && rest.length > 0 ? {} : {}),
        paragraphs: paragraphs.map(p => rejectIfLonger(p, BUDGET.paragraph, `${chapter.chapterId}.paragraph`))
      }
    })
  })

  for (const table of chapter.tables) {
    const rowPages = chunkByCapacity(table.rows, CAPACITY.tableRows, (_r, i) => `${table.tableId}-r${i}`)

    rowPages.forEach((rows, i) => {
      pages.push({
        contentType: 'report-table',
        slots: {
          ...running,
          tableTitle: table.title,
          // La continuación se declara: una tabla que sigue sin decirlo obliga a retroceder.
          ...(i > 0 ? { continuationLabel: 'Continúa de la página anterior' } : {}),
          tableColumns: table.columns.slice(0, 3).map(label => ({ label })),
          tableRows: rows.map(row => ({
            entity: String(row[0] ?? '—'),
            valueA: String(row[1] ?? '—'),
            ...(row[2] != null ? { valueB: String(row[2]) } : {})
          })),
          tableSource: GH_INSIGHTS.document.evidenceSource
        }
      })
    })
  }

  return pages
}

export const buildInsightReportPlanInput = ({
  edition,
  report,
  plan,
  snapshot
}: BuildInsightReportInput): CompositionPlanInput => {
  const frozen = withDedupedLimits(plan)
  const periodLabel = periodLabelOf(edition)
  const factsById = new Map(snapshot.facts.map(fact => [fact.factId, fact] as const))

  if (frozen.chapters.length === 0) {
    throw new InsightsRenderRejectedError('El plan no tiene capítulos: no hay informe que componer.')
  }

  const pages: Omit<CompositionSlideInput, 'slideId'>[] = [
    {
      contentType: 'report-cover',
      slots: {
        editionId: `${report.reportCode} · v${edition.version}`,
        reportTitle: rejectIfLonger(report.title, 64, 'report.title'),
        periodLabel,
        versionLabel: `v${edition.version}`,
        issuedLabel: issuedLabelOf(edition)
      }
    }
  ]

  if (frozen.executiveSummary.length > 0) {
    const [headline, ...rest] = frozen.executiveSummary.map(c => c.text)

    // El resumen se pagina como cualquier narrativa: recortarlo a la capacidad de una página callaba
    // afirmaciones del resumen sin avisar.
    const summaryPages = chunkByCapacity(
      rest.length > 0 ? rest : [GH_INSIGHTS.document.summaryNoMore],
      CAPACITY.paragraphs,
      (_p, i) => `summary-p${i}`
    )

    summaryPages.forEach(paragraphs => {
      pages.push({
        contentType: 'report-narrative',
        slots: {
          runningChapter: GH_INSIGHTS.document.executiveSummary,
          runningPeriod: periodLabel,
          assertion: rejectIfLonger(headline!, BUDGET.assertion, 'executiveSummary.assertion'),
          paragraphs: paragraphs.map(p => rejectIfLonger(p, BUDGET.paragraph, 'executiveSummary.paragraph'))
        }
      })
    })
  }

  for (const chapter of frozen.chapters) {
    pages.push(...chapterPages(chapter, periodLabel, factsById, frozen.locale))
  }

  // El cierre es obligatorio aunque no haya límites: declarar que no los hay también es información.
  // El caso vacío NO pasa por el parser de «sujeto: causa» — no tiene ese formato, y forzarlo metía
  // la frase entera en el sujeto (lo encontró su test).
  const limitEntries: { subject: string; cause: string }[] =
    frozen.limits.length > 0
      ? frozen.limits.map(line => {
          const separator = line.indexOf(':')

          if (separator === -1) {
            return { subject: 'Nota', cause: line.trim().replace(/\.$/, '') }
          }

          return {
            subject: line.slice(0, separator).trim(),
            cause: line.slice(separator + 1).trim().replace(/\.$/, '') || 'sin causa declarada'
          }
        })
      : [{ subject: 'Sin límites', cause: 'esta edición no registró límites de evidencia' }]

  const limitPages = chunkByCapacity(limitEntries, CAPACITY.limits, (_l, i) => `limit-${i}`)

  limitPages.forEach(limits => {
    pages.push({
      contentType: 'report-limits',
      slots: {
        runningChapter: GH_INSIGHTS.document.limitsAndMethod,
        runningPeriod: periodLabel,
        assertion: GH_INSIGHTS.document.limitsTitle,
        limits: limits.map(entry => ({
          subject: rejectIfLonger(entry.subject, BUDGET.limitSubject, 'limit.subject'),
          cause: rejectIfLonger(entry.cause, BUDGET.limitCause, 'limit.cause')
        })),
        methodology:
          frozen.methodology.length > 0
            ? frozen.methodology
            : [GH_INSIGHTS.methodology.fallback]
      }
    })
  })

  // El folio se asigna acá, con todas las páginas ya resueltas: por eso el índice no necesita una
  // segunda pasada de render para saber su numeración.
  return {
    artifactId: edition.editionId,
    slides: pages.map((page, i) => ({
      ...page,
      slideId: `page-${String(i + 1).padStart(2, '0')}`,
      slots: { ...page.slots, pageFolio: String(i + 1) }
    })) as CompositionSlideInput[]
  }
}
