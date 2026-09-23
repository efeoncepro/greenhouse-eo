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

// Del barrel del composer, SÓLO tipos.
//
// El barrel arrastra el motor de render —Playwright, pdf-lib y los catálogos con sus fuentes
// embebidas— y este archivo lo consume un command que corre en Vercel. Importar de él un VALOR (no
// un tipo) llevó la función `insights/catalog` a 441 MB y rompió el build de staging (ISSUE-177),
// la misma bug class que el 2026-09-16 obligó a que el catálogo viajara como STRING.
//
// Los valores del composer que necesita el render (`paginateFlow`) entran por la entrada liviana
// `@/lib/artifact-composer/pure`, vía `composition-helpers.ts` y `figure-pages.ts`. La regla eslint
// `greenhouse/no-worker-only-module-in-vercel-code` rechaza un valor del barrel en este archivo.
import type { CompositionPlanInput, CompositionSlideInput } from '@/lib/artifact-composer'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'
import { InsightsRenderRejectedError } from '../errors'
import { chunkByCapacity, limitEntriesOf, rejectIfLonger } from './composition-helpers'
import { buildFigurePages, claimsForFigure, figureLegendOf } from './figure-pages'
import { issuedLabelOf, periodLabelOf } from './labels'
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

/** Barras por figura: lo que declara la plantilla (`figureSeries.maxItems`), no una preferencia. */
const FIGURE_ROWS = 6

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

export interface BuildInsightReportInput {
  readonly edition: InsightEditionRecord
  readonly report: InsightReportRecord
  readonly plan: EditorialPlanV1
  readonly snapshot: EvidenceSnapshotRecord
}

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
    claims.length > 0 ? claims : [chapter.title, GH_INSIGHTS.document.chapterNoFindings]

  const pages: Omit<CompositionSlideInput, 'slideId'>[] = []

  // Cada página de figura se narra con las afirmaciones del plan que citan los hechos que dibuja: la
  // figura y su texto afirman lo mismo. Repetir el titular del capítulo en cada página dejaba cuatro
  // páginas seguidas con el mismo texto y figuras distintas.
  for (const figure of chapter.charts.flatMap(chart => buildFigurePages(chart, factsById, locale, FIGURE_ROWS))) {
    const own = claimsForFigure(chapter.claims, figure)
    const [figureHeadline, figureLead, ...figureRest] = own.length > 0 ? own : [headline!]

    pages.push({
      contentType: 'report-analysis',
      slots: {
        ...running,
        assertion: rejectIfLonger(figureHeadline!, BUDGET.assertion, `${chapter.chapterId}.assertion`),
        // Con una sola afirmación, repetirla como conclusión no dice nada: la bajada lee la figura.
        conclusion: rejectIfLonger(figureLead ?? figureLegendOf(figure), BUDGET.lead, `${chapter.chapterId}.conclusion`),
        figureTitle: figure.title,
        figureSeries: figure.rows,
        figureUnit: figure.unit,
        figureSource: GH_INSIGHTS.document.evidenceSource,
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
  const periodLabel = periodLabelOf(edition, frozen.locale)
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
        issuedLabel: issuedLabelOf(edition, GH_INSIGHTS.document.unissued)
      }
    }
  ]

  if (frozen.executiveSummary.length > 0) {
    const [headline, ...rest] = frozen.executiveSummary.map(c => c.text)

    // El resumen se pagina como cualquier narrativa: recortarlo a la capacidad de una página callaba
    // afirmaciones del resumen sin avisar.
    const summaryPages = chunkByCapacity(
      rest.length > 0 ? rest : [GH_INSIGHTS.document.summaryInChapters],
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

  const limitEntries = limitEntriesOf(frozen.limits)

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
