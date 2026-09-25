/**
 * Plan editorial congelado → páginas del catálogo `insights-report` (A4 vertical).
 *
 * TASK-1889: compone SÓLO con las plantillas editoriales del canvas aprobado (portada navy o blanca,
 * índice, apertura de capítulo, narrativa, páginas de figura por familia, tabla, límites, contraportada).
 * Cada gráfico del plan va a la página de figura de su familia con su cifra principal y su lectura
 * (`figure-slots.ts`, compartido con el deck).
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
// `@/lib/artifact-composer/pure`, vía `composition-helpers.ts`. La regla eslint
// `greenhouse/no-worker-only-module-in-vercel-code` rechaza un valor del barrel en este archivo.
import type { CompositionPlanInput, CompositionSlideInput, SlotValues } from '@/lib/artifact-composer'
import {
  EFEONCE_CONTACT,
  EFEONCE_LEGAL_NAME_FALLBACK,
  EFEONCE_OPERATING_MARKETS,
  EFEONCE_TAX_ID_FALLBACK
} from '@/config/efeonce-brand'
import { parsePrintedNumber } from '@/lib/artifact-composer/pure'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { EditorialPlanV1, PlanChapterV1, PlanClaimV1 } from '../contracts/plan'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'
import { InsightsRenderRejectedError } from '../errors'
import { formatFactValue } from '../editorial/format'
import { chunkByCapacity, limitEntriesOf, rejectIfLonger } from './composition-helpers'
import { channelNameOf, channelsOf, coverPage } from './cover'
import { buildFigureSlides, FIGURE_CAPACITY, FIGURE_CONTENT_TYPE, readingFor } from './figure-slots'
import { issuedLongLabelOf, periodEndLongLabelOf, periodInlineOf, periodLabelOf } from './labels'
import { withDedupedLimits } from './plan-limits'

/** Capacidades declaradas por plantilla (`*.slots.json`). Son del molde, no preferencias. */
const CAPACITY = {
  /** Filas por página de tabla (`tableRows.maxItems`). */
  tableRows: 16,
  /** Párrafos por página narrativa (`paragraphs.maxItems`). */
  paragraphs: 6,
  /** Límites por página de cierre (`limits.maxItems`). */
  limits: 9,
  /** Entradas por página de índice (`entries.maxItems`). */
  indexEntries: 20,
  /** Entradas del índice de una apertura de capítulo (`contents.entries.maxItems`). */
  chapterContents: 12,
  /** Entradas de la columna «En este capítulo» de la narrada (`evidence.items.maxItems`). */
  asideItems: 8
} as const

const BUDGET = {
  assertion: 130,
  development: 340,
  lead: 260,
  paragraph: 420,
  limitCause: 140,
  limitSubject: 38,
  chapterTitle: 44,
  chapterLead: 150,
  reportTitle: 64,
  indexTitle: 72,
  contentsTitle: 56,
  tableTitle: 80,
  asideTitle: 48
} as const

export interface BuildInsightReportInput {
  readonly edition: InsightEditionRecord
  readonly report: InsightReportRecord
  readonly plan: EditorialPlanV1
  readonly snapshot: EvidenceSnapshotRecord
}

type Page = Omit<CompositionSlideInput, 'slideId'>

/** Una página del cuerpo con el título que la representa en el índice de su capítulo. */
interface BodyPage {
  readonly page: Page
  readonly contentsTitle?: string
  /** Hechos que la página dibuja: con ellos «Lo esencial» apunta a la página real de su evidencia. */
  readonly factIds?: readonly string[]
  /** Conclusión impresa de una página de figura: una esencial que la repite apunta a ESTA página. */
  readonly conclusion?: string
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

const escapeRich = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Un esencial del plan (una afirmación con sus hechos) en la forma del resumen: la cifra es el hecho
 * principal con el formateador canónico, el título es la métrica y el detalle, la afirmación completa.
 * El folio se resuelve después, con el plan de páginas completo.
 */
const essentialOf = (item: PlanClaimV1, factsById: ReadonlyMap<string, EvidenceFactV1>, locale: string): Record<string, string> => {
  const fact = item.factIds[0] ? factsById.get(item.factIds[0]) : undefined

  if (!fact || fact.value === null) throw new InsightsRenderRejectedError(`«Lo esencial» ${item.claimId}: su hecho principal no tiene valor medido.`)

  return {
    figure: rejectIfLonger(formatFactValue(fact.value, fact.unit, locale), 12, `${item.claimId}.figure`),
    title: rejectIfLonger(fact.label, 60, `${item.claimId}.title`),
    detail: escapeRich(rejectIfLonger(item.text, 170, `${item.claimId}.detail`)),
    folio: '—'
  }
}

/** «Medimos la marca en»: los canales que miden los gráficos del capítulo (`channelId`, TASK-1888). */
const measuredChannelsOf = (chapter: PlanChapterV1): SlotValues => {
  const channels = channelsOf([chapter])

  return channels.length > 0
    ? { measuredChannels: { label: GH_INSIGHTS.catalog.measuredIn, channels: channels.map(channelId => ({ channelId, name: channelNameOf(channelId) })) } }
    : {}
}

/** Páginas en papel: llevan cabecera corrida, pie institucional y folio «NN / total». */
const PAPER_TYPES = new Set(['report-index', 'report-summary', 'report-narrative', 'report-table', 'report-limits', ...Object.values(FIGURE_CONTENT_TYPE.report)])

const L = GH_INSIGHTS.catalog

const chapterBodyPages = (
  chapter: PlanChapterV1,
  running: { runningSection: string; runningPeriod: string },
  factsById: ReadonlyMap<string, EvidenceFactV1>,
  locale: string
): BodyPage[] => {
  const claims = chapter.claims.map(c => c.text)

  // Un capítulo SIN afirmaciones no bloquea el informe ni desaparece: se narra con su título y la
  // ausencia queda dicha. Caso REAL (canary con datos, TASK-1847): el plan de un módulo sin hallazgos.
  const [headline, ...rest] = claims.length > 0 ? claims : [chapter.title, GH_INSIGHTS.document.chapterNoFindings]

  const pages: BodyPage[] = []

  // Páginas de figura premium (TASK-1889 Slice 4): cada gráfico del plan a la página que el canvas
  // aprobado diseñó para su familia, con su cifra principal y su lectura («Lo que significa / Próximo
  // paso») de TASK-1888. Figura y texto afirman lo mismo: la conclusión es la de la lectura o la
  // afirmación del plan que cita los hechos que la figura dibuja.
  const chapterTab = running.runningSection.split(' · ')[0]!

  for (const chart of chapter.charts) {
    for (const figure of buildFigureSlides(chart, factsById, readingFor(chapter.readings, chart), chapter.claims, locale, FIGURE_CAPACITY.report)) {
      const where = `${chapter.chapterId}.${chart.chartId}`

      pages.push({
        contentsTitle: figure.figureTitle,
        factIds: figure.factIds,
        conclusion: figure.conclusion,
        page: {
          contentType: FIGURE_CONTENT_TYPE.report[figure.kind],
          slots: {
            ...running,
            chapterTab,
            eyebrow: figure.eyebrow,
            keyFigure: rejectIfLonger(figure.keyFigure, 12, `${where}.keyFigure`),
            keyCaption: rejectIfLonger(figure.keyCaption, 110, `${where}.keyCaption`),
            conclusion: rejectIfLonger(figure.conclusion, 96, `${where}.conclusion`),
            ...(figure.lead ? { lead: rejectIfLonger(figure.lead, 170, `${where}.lead`) } : {}),
            figureTitle: rejectIfLonger(figure.figureTitle, 56, `${where}.figureTitle`),
            ...figure.body,
            provenance: [
              { label: L.unitCaption, text: rejectIfLonger(figure.unitText, 96, `${where}.unit`) },
              { label: L.sourceCaption, text: figure.sourceText }
            ],
            ...(figure.closing.length > 0
              ? {
                  closing: figure.closing.map(block => ({
                    ...block,
                    text: rejectIfLonger(block.text, 190, `${where}.closing`),
                    ...(block.kind === 'action' ? { signature: L.signature } : {})
                  }))
                }
              : {})
          } as SlotValues
        }
      })
    }
  }

  // Un capítulo SIN figura no se omite: se narra.
  chunkByCapacity(
    rest.length > 0 ? rest : [GH_INSIGHTS.document.chapterNoFindings],
    CAPACITY.paragraphs,
    (_p, i) => `${chapter.chapterId}-p${i}`
  ).forEach(paragraphs => {
    pages.push({
      contentsTitle: headline!,
      page: {
        contentType: 'report-narrative',
        slots: {
          ...running,
          eyebrow: chapter.title,
          assertion: rejectIfLonger(headline!, BUDGET.assertion, `${chapter.chapterId}.assertion`),
          paragraphs: paragraphs.map(p => rejectIfLonger(p, BUDGET.paragraph, `${chapter.chapterId}.paragraph`))
        }
      }
    })
  })

  for (const table of chapter.tables) {
    // La barra de la primera columna de valor se escala contra la tabla COMPLETA, no contra la página,
    // y la cifra protagonista es el valor de la fila más alta de esa misma tabla.
    const values = table.rows.map(row => parsePrintedNumber(row[1]))
    const scale = Math.max(0, ...values.map(v => v ?? 0))
    const leadIndex = scale > 0 ? values.findIndex(v => v === scale) : -1
    const leadRow = leadIndex >= 0 ? table.rows[leadIndex]! : null
    const entityColumn = table.columns[0] ?? L.tableEyebrow
    const valueColumn = table.columns[1] ?? ''

    const hero = leadRow
      ? {
          heroFigure: rejectIfLonger(String(leadRow[1]), 12, `${table.tableId}.heroFigure`),
          heroText: rejectIfLonger(
            `${valueColumn.toLowerCase()} ${L.tableLeadIn} <strong>${String(leadRow[0] ?? '—')}</strong>, ${L.tableLeadSuffix}`,
            110,
            `${table.tableId}.heroText`
          )
        }
      : { heroFigure: String(table.rows.length), heroText: L.tableRowsText }

    chunkByCapacity(table.rows, CAPACITY.tableRows, (_r, i) => `${table.tableId}-r${i}`).forEach((rows, i) => {
      pages.push({
        contentsTitle: table.title,
        page: {
          contentType: 'report-table',
          slots: {
            ...running,
            eyebrow: L.tableEyebrow,
            ...hero,
            tableTitle: rejectIfLonger(table.title, BUDGET.tableTitle, `${table.tableId}.title`),
            ...(valueColumn ? { lead: L.tableRowsOrderedBy(table.rows.length, valueColumn) } : {}),
            // La continuación se declara: una tabla que sigue sin decirlo obliga a retroceder.
            ...(i > 0 ? { continuationLabel: L.tableContinued, rankOffset: String(i * CAPACITY.tableRows) } : {}),
            boardTitle: rejectIfLonger(`${L.tableDetailBy} ${entityColumn.toLowerCase()}`, 48, `${table.tableId}.boardTitle`),
            legend: { label: rejectIfLonger(valueColumn || entityColumn, 24, `${table.tableId}.legend`) },
            tableColumns: ['#', ...table.columns.slice(0, 3)].map(label => ({ label })),
            tableRows: rows.map(row => ({
              entity: String(row[0] ?? '—'),
              valueA: String(row[1] ?? '—'),
              ...(row[2] != null ? { valueB: String(row[2]) } : {})
            })),
            ...(scale > 0 ? { barScaleMax: String(scale) } : {}),
            source: { label: GH_INSIGHTS.document.sourceLabel, text: GH_INSIGHTS.document.evidenceSource }
          }
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
  const periodInline = periodInlineOf(edition, frozen.locale)
  const factsById = new Map(snapshot.facts.map(fact => [fact.factId, fact] as const))

  if (frozen.chapters.length === 0) {
    throw new InsightsRenderRejectedError('El plan no tiene capítulos: no hay informe que componer.')
  }

  const footer = {
    footerEdition: `${L.product} · ${L.reportOf} ${periodInline}`,
    footerContact: { address: EFEONCE_CONTACT.addressDisplay, phone: EFEONCE_CONTACT.phones[0].display }
  }

  const cover: Page = coverPage(
    frozen,
    {
      editionLabel: `${L.editionKind} · ${periodLabel}`,
      eyebrow: L.readingEyebrow,
      reportTitle: rejectIfLonger(report.title, BUDGET.reportTitle, 'report.title'),
      confidentialityLine: `${L.confidential} · ${L.version} ${edition.version} · ${issuedLongLabelOf(edition, GH_INSIGHTS.document.unissued, frozen.locale)}`
    },
    { contentTypes: { dark: 'report-cover', light: 'report-cover-light' } }
  )

  // Secciones del cuerpo, en orden. Cada una sabe su marca de índice y sus páginas.
  const sections: { mark: string; title: string; pages: BodyPage[] }[] = []

  // «Lo esencial» (TASK-1888 v2): la página de resumen del canvas, con la tesis, hasta cinco hallazgos
  // con su cifra y el folio real de su evidencia, y la decisión. Sin esenciales (plan v1), se narra.
  const essentials = frozen.essentials ?? []

  if (frozen.executiveSummary.length > 0 && essentials.length > 0) {
    const [headline, lead, ...rest] = frozen.executiveSummary.map(c => c.text)
    const running = { runningSection: GH_INSIGHTS.document.executiveSummary, runningPeriod: periodLabel }

    const summaryPage: BodyPage = {
      page: {
        contentType: 'report-summary',
        slots: {
          ...running,
          eyebrow: GH_INSIGHTS.document.executiveSummary,
          thesis: rejectIfLonger(headline!, 120, 'executiveSummary.thesis'),
          ...(lead ? { thesisLead: rejectIfLonger(lead, 320, 'executiveSummary.thesisLead') } : {}),
          essentialsLabel: L.essentials,
          essentials: essentials.map(item => essentialOf(item, factsById, frozen.locale)),
          ...(frozen.decision
            ? { decision: { label: L.decideInMeeting, text: rejectIfLonger(frozen.decision.text, 240, 'decision'), signature: L.signature } }
            : {})
        }
      }
    }

    // Lo que la tesis y su bajada no dijeron se sigue narrando: ninguna afirmación del resumen se pierde.
    const narrated = chunkByCapacity(rest, CAPACITY.paragraphs, (_p, i) => `summary-p${i}`).map(paragraphs => ({
      page: {
        contentType: 'report-narrative',
        slots: {
          ...running,
          eyebrow: GH_INSIGHTS.document.executiveSummary,
          assertion: rejectIfLonger(headline!, BUDGET.assertion, 'executiveSummary.assertion'),
          paragraphs: paragraphs.map(p => rejectIfLonger(p, BUDGET.paragraph, 'executiveSummary.paragraph'))
        }
      }
    }))

    sections.push({ mark: L.indexMarks.summary, title: GH_INSIGHTS.document.executiveSummary, pages: [summaryPage, ...narrated] })
  } else if (frozen.executiveSummary.length > 0) {
    const [headline, ...rest] = frozen.executiveSummary.map(c => c.text)
    const running = { runningSection: GH_INSIGHTS.document.executiveSummary, runningPeriod: periodLabel }

    // El resumen se pagina como cualquier narrativa: recortarlo callaba afirmaciones sin avisar.
    sections.push({
      mark: L.indexMarks.summary,
      title: GH_INSIGHTS.document.executiveSummary,
      pages: chunkByCapacity(
        rest.length > 0 ? rest : [GH_INSIGHTS.document.summaryInChapters],
        CAPACITY.paragraphs,
        (_p, i) => `summary-p${i}`
      ).map(paragraphs => ({
        page: {
          contentType: 'report-narrative',
          slots: {
            ...running,
            eyebrow: GH_INSIGHTS.document.executiveSummary,
            assertion: rejectIfLonger(headline!, BUDGET.assertion, 'executiveSummary.assertion'),
            ...(frozen.decision
              ? {
                  closing: [
                    {
                      kind: 'action',
                      label: L.decideInMeeting,
                      text: rejectIfLonger(frozen.decision.text, 240, 'decision'),
                      signature: L.signature
                    }
                  ]
                }
              : {}),
            paragraphs: paragraphs.map(p => rejectIfLonger(p, BUDGET.paragraph, 'executiveSummary.paragraph'))
          }
        }
      }))
    })
  }

  frozen.chapters.forEach((chapter, index) => {
    const number = pad2(index + 1)
    const running = { runningSection: `${number} · ${chapter.title}`, runningPeriod: periodLabel }
    const body = chapterBodyPages(chapter, running, factsById, frozen.locale)

    // La apertura abre el capítulo; su índice se completa con folios reales cuando se conoce el plan.
    const opening: BodyPage = {
      page: {
        contentType: 'report-chapter',
        slots: {
          chapterLabel: `${L.chapter} ${number}`,
          chapterNumeral: number,
          runningLabel: `${L.reportOf} ${periodInline}`,
          chapterTitle: rejectIfLonger(chapter.title, BUDGET.chapterTitle, `${chapter.chapterId}.title`),
          ...(chapter.opening
            ? { chapterLead: rejectIfLonger(chapter.opening.text, BUDGET.chapterLead, `${chapter.chapterId}.opening`) }
            : {}),
          ...measuredChannelsOf(chapter)
        }
      }
    }

    sections.push({ mark: number, title: chapter.title, pages: [opening, ...body] })
  })

  const allLimits = limitEntriesOf(frozen.limits)

  const limitPages = chunkByCapacity(allLimits, CAPACITY.limits, (_l, i) => `limit-${i}`).map(limits => ({
    page: {
      contentType: 'report-limits',
      slots: {
        runningSection: GH_INSIGHTS.document.limitsAndMethod,
        runningPeriod: periodLabel,
        eyebrow: L.limitsEyebrow,
        heroFigure: String(allLimits.length),
        heroText: L.limitsCountText,
        assertion: L.limitsTitleRich,
        limits: limits.map(entry => ({
          subject: rejectIfLonger(entry.subject, BUDGET.limitSubject, 'limit.subject'),
          cause: rejectIfLonger(entry.cause, BUDGET.limitCause, 'limit.cause')
        })),
        methodologyLabel: L.howMeasured,
        methodology: frozen.methodology.length > 0 ? frozen.methodology : [GH_INSIGHTS.methodology.fallback]
      }
    }
  }))

  sections.push({ mark: L.indexMarks.limits, title: GH_INSIGHTS.document.limitsAndMethod, pages: limitPages })

  const backCover: Page = {
    contentType: 'report-back-cover',
    slots: {
      editionLabel: `${L.backCoverPrefix} · ${periodLabel}`,
      contact: {
        email: EFEONCE_CONTACT.email,
        phonePrimary: EFEONCE_CONTACT.phones[0].display,
        phoneSecondary: EFEONCE_CONTACT.phones[1].display,
        address: EFEONCE_CONTACT.addressDisplay
      },
      marketsLine: EFEONCE_OPERATING_MARKETS.join(' · '),
      legalLine: `${EFEONCE_LEGAL_NAME_FALLBACK} · RUT ${EFEONCE_TAX_ID_FALLBACK} · ${L.legalConfidential} · ${L.figuresAsOf} ${periodEndLongLabelOf(edition, frozen.locale)}`
    }
  }

  // El índice tiene capacidad fija: se sabe cuántas páginas ocupa antes de calcular folios, así que
  // la numeración se resuelve en una pasada, sin renderizar.
  const indexPageCount = Math.ceil(sections.length / CAPACITY.indexEntries)
  const firstBodyFolio = 2 + indexPageCount

  const folioOf: number[] = []
  let cursor = firstBodyFolio

  for (const section of sections) {
    folioOf.push(cursor)
    cursor += section.pages.length
  }

  const total = cursor // última página del cuerpo + 1 = folio de la contraportada

  const entries = sections.map((section, i) => ({
    mark: section.mark,
    title: rejectIfLonger(section.title, BUDGET.indexTitle, 'index.title'),
    folio: pad2(folioOf[i]!)
  }))

  const indexPages: Page[] = Array.from({ length: indexPageCount }, (_, index) => ({
    contentType: 'report-index',
    slots: {
      runningSection: GH_INSIGHTS.document.indexTitle,
      runningPeriod: periodLabel,
      eyebrow: L.indexEyebrow,
      title: index === 0 ? GH_INSIGHTS.document.indexTitle : GH_INSIGHTS.document.indexContinued,
      titleColumn: L.indexSectionColumn,
      pageColumn: GH_INSIGHTS.document.indexPageColumn,
      entries: entries.slice(index * CAPACITY.indexEntries, (index + 1) * CAPACITY.indexEntries)
    }
  }))

  // Índice de cada apertura: las páginas del capítulo con su folio físico, una entrada por título
  // (las continuaciones apuntan a su primera página). Si no cabe, la apertura va sin índice propio:
  // el índice general ya lleva al capítulo.
  sections.forEach((section, i) => {
    const opening = section.pages[0]!.page

    if (opening.contentType !== 'report-chapter') return

    const seen = new Map<string, string>()

    section.pages.slice(1).forEach((body, offset) => {
      const title = body.contentsTitle

      if (title && !seen.has(title)) seen.set(title, pad2(folioOf[i]! + 1 + offset))
    })

    const contentEntries = [...seen].map(([title, folio]) => ({ title: rejectIfLonger(title, BUDGET.contentsTitle * 2, 'contents.title'), folio }))
    const fits = contentEntries.length > 0 && contentEntries.length <= CAPACITY.chapterContents && contentEntries.every(e => e.title.length <= BUDGET.contentsTitle)

    if (fits) (opening.slots as Record<string, unknown>).contents = { label: L.inThisChapter, entries: contentEntries }
  })

  // Columna «En este capítulo» de cada página narrada: las páginas que respaldan su lectura, con folio
  // real. En un capítulo, sus figuras y tablas; en el resumen, cada capítulo. Un título que no cabe
  // en la columna no se recorta: queda fuera de la lista (el índice general lo lleva igual).
  const asideItem = (title: string, folio: number) =>
    title.length <= BUDGET.asideTitle ? [{ folio: `${L.evidencePage} ${pad2(folio)}`, text: title }] : []

  sections.forEach((section, i) => {
    const narratives = section.pages.filter(body => body.page.contentType === 'report-narrative')

    if (narratives.length === 0) return

    const items =
      section.mark === L.indexMarks.summary
        ? sections.flatMap((other, j) => (other.pages[0]?.page.contentType === 'report-chapter' ? asideItem(other.title, folioOf[j]!) : []))
        : (() => {
            const seen = new Map<string, number>()

            section.pages.forEach((body, offset) => {
              if (body.page.contentType === 'report-narrative' || body.page.contentType === 'report-chapter') return
              if (body.contentsTitle && !seen.has(body.contentsTitle)) seen.set(body.contentsTitle, folioOf[i]! + offset)
            })

            return [...seen].flatMap(([title, folio]) => asideItem(title, folio))
          })()

    if (items.length === 0) return

    for (const body of narratives) {
      ;(body.page.slots as Record<string, unknown>).evidence = {
        label: section.mark === L.indexMarks.summary ? L.inThisReport : L.inThisChapter,
        items: items.slice(0, CAPACITY.asideItems)
      }
    }
  })

  // Folio de cada esencial: la primera página que dibuja su hecho principal; si ninguna figura lo dibuja,
  // la apertura del capítulo que lo afirma. Se resuelve con el plan de páginas completo (folios físicos).
  const summaryBody = sections.find(section => section.mark === L.indexMarks.summary)?.pages[0]

  if (summaryBody?.page.contentType === 'report-summary') {
    const pageOfFact = (factId: string | undefined): number | null => {
      for (const [i, section] of sections.entries()) {
        const offset = section.pages.findIndex(body => factId !== undefined && body.factIds?.includes(factId))

        if (offset >= 0) return folioOf[i]! + offset
      }

      return null
    }

    // Una esencial que ES la conclusión de una figura (p. ej. «Cumple la meta de…») apunta a esa figura, no a la
    // primera página que dibuja su hecho (Sky: la comparación de p. 05 en vez de las metas de p. 07).
    const pageOfConclusion = (text: string): number | null => {
      for (const [i, section] of sections.entries()) {
        const offset = section.pages.findIndex(body => body.conclusion === text)

        if (offset >= 0) return folioOf[i]! + offset
      }

      return null
    }

    const chapterOfClaim = (claimId: string): number | null => {
      const index = frozen.chapters.findIndex(chapter => (chapter.claims.some(item => `essential.${item.claimId}` === claimId || item.claimId === claimId) ||
          // Un esencial que es la conclusión de una figura (TASK-1888): su capítulo es el del gráfico, se dibuje o no.
          chapter.charts.some(chart => claimId.includes(chart.chartId))))

      const section = index >= 0 ? sections.findIndex(sec => sec.title === frozen.chapters[index]!.title) : -1

      return section >= 0 ? folioOf[section]! : null
    }

    const items = (summaryBody.page.slots as { essentials: Array<Record<string, unknown>> }).essentials

    items.forEach((item, index) => {
      const source = essentials[index]!
      const folio = pageOfConclusion(source.text) ?? pageOfFact(source.factIds[0]) ?? chapterOfClaim(source.claimId)

      if (folio === null) throw new InsightsRenderRejectedError(`«Lo esencial» ${source.claimId}: no hay página que respalde su cifra.`)

      item.folio = `${L.evidencePage} ${pad2(folio)}`
    })
  }

  const pages = [cover, ...indexPages, ...sections.flatMap(section => section.pages.map(body => body.page)), backCover]

  // Folios: después de insertar índice y contraportada, siempre coinciden con la página física.
  return {
    artifactId: edition.editionId,
    slides: pages.map((page, i) => {
      const folio = i + 1
      const slots = { ...page.slots } as Record<string, unknown>

      if (PAPER_TYPES.has(page.contentType)) Object.assign(slots, footer, { folio: { page: pad2(folio), total: pad2(total) } })
      if (page.contentType === 'report-chapter') slots.pageFolio = pad2(folio)

      return { ...page, slideId: `page-${pad2(folio)}`, slots }
    }) as CompositionSlideInput[]
  }
}
