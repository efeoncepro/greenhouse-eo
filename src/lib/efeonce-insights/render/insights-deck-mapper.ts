/**
 * TASK-1847 — plan congelado de una edición → plan de composición del catálogo `insights-deck` (16:9).
 *
 * Reemplaza al mapper sobre `deck-axis` para `deck_pdf`. El canary con datos reales (Berel, 2026-09-22)
 * mostró por qué: aquel catálogo es vocabulario de licitación y sus presupuestos, de copy comercial —
 * recortaba títulos con «…», imprimía el período anterior como una métrica más con el mismo nombre y
 * callaba métricas que no cabían (2 de 6 en visibilidad orgánica).
 *
 * Reglas de este mapper (las mismas del informe A4):
 * - Cada afirmación del plan aparece en alguna lámina: como titular de la figura que la respalda o
 *   como punto narrativo. El deck no tiene tablas; por eso ninguna afirmación puede quedar fuera.
 * - Nada se recorta: un texto que excede su slot rechaza el render con causa.
 * - Las figuras salen del módulo compartido (`figure-pages`): mismo formato, nombres, escala y
 *   paginación que el informe.
 *
 * TASK-1889: compone con las láminas editoriales del canvas aprobado (1280×720): portada navy,
 * apertura de capítulo, narrativa, límites y contraportada. La lámina de evidencia sigue en v1
 * (legado declarado, 1920×1080) hasta que el Slice 4 la reemplace por la lámina de gráfico premium.
 *
 * Browser-safe en su frontera: sólo tipos y módulos puros del composer (un import de VALOR del barrel
 * arrastra Playwright y los catálogos a la función de Vercel — ISSUE-177).
 */

import 'server-only'

import type { CompositionPlanInput, CompositionSlideInput } from '@/lib/artifact-composer'
import {
  EFEONCE_CONTACT,
  EFEONCE_LEGAL_NAME_FALLBACK,
  EFEONCE_OPERATING_MARKETS,
  EFEONCE_TAX_ID_FALLBACK
} from '@/config/efeonce-brand'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'
import { InsightsRenderRejectedError } from '../errors'
import { chunkByCapacity, limitEntriesOf, rejectIfLonger } from './composition-helpers'
import { buildFigurePages, claimsForFigure } from './figure-pages'
import { issuedLongLabelOf, periodEndLongLabelOf, periodInlineOf, periodLabelOf } from './labels'
import { withDedupedLimits } from './plan-limits'

/** Capacidades declaradas por las plantillas del catálogo (`*.slots.json`). Son del molde. */
const CAPACITY = { figureRows: 5, points: 4, limits: 6, chapterContents: 9 } as const

const BUDGET = {
  reportTitle: 64,
  chapterLabel: 40,
  chapterTitle: 44,
  chapterLead: 150,
  section: 32,
  assertion: 120,
  point: 190,
  limitSubject: 38,
  limitCause: 110,
  contentsTitle: 56
} as const

export interface BuildInsightsDeckInput {
  readonly edition: InsightEditionRecord
  readonly report: InsightReportRecord
  readonly plan: EditorialPlanV1
  readonly snapshot: EvidenceSnapshotRecord
}

type Slide = Omit<CompositionSlideInput, 'slideId'>

interface Tabbed {
  tabNumber: string
  section: string
  period: string
}

const L = GH_INSIGHTS.catalog

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Láminas editoriales con pie «NN / total». La de evidencia (legado v1) no lo trae. */
const FOLIO_TYPES = new Set(['insights-narrative', 'insights-limits'])

/**
 * Láminas narrativas: el primer texto es el titular y el resto se reparte en puntos, sin recortar. La plantilla exige
 * al menos un punto; si no hay más texto, `fallback` dice DÓNDE está el resto — nunca «no hay más», que era falso
 * cuando las otras afirmaciones del capítulo ya titulaban figuras.
 */
const narrativeSlides = (tab: Tabbed, eyebrow: string, texts: readonly string[], field: string, fallback: string): Slide[] => {
  const [headline, ...rest] = texts

  if (!headline) return []

  const chunks = chunkByCapacity(rest.length > 0 ? rest : [fallback], CAPACITY.points, (_t, i) => `${field}-${i}`)

  return chunks.map(points => ({
    contentType: 'insights-narrative',
    slots: {
      ...tab,
      eyebrow: rejectIfLonger(eyebrow, BUDGET.chapterLabel, `${field}.eyebrow`),
      assertion: rejectIfLonger(headline, BUDGET.assertion, `${field}.assertion`),
      points: points.map(text => ({ text: rejectIfLonger(text, BUDGET.point, `${field}.point`) }))
    }
  }))
}

const chapterSlides = (
  chapter: PlanChapterV1,
  tab: Tabbed,
  factsById: ReadonlyMap<string, EvidenceFactV1>,
  locale: string
): { slide: Slide; contentsTitle?: string }[] => {
  const slides: { slide: Slide; contentsTitle?: string }[] = []
  const used = new Set<string>()

  for (const figure of chapter.charts.flatMap(chart => buildFigurePages(chart, factsById, locale, CAPACITY.figureRows))) {
    const own = claimsForFigure(chapter.claims, figure)
    const assertion = own.find(text => !used.has(text)) ?? own[0] ?? chapter.title

    used.add(assertion)

    slides.push({
      contentsTitle: figure.title,
      slide: {
        contentType: 'insights-evidence',
        slots: {
          chapterLabel: rejectIfLonger(chapter.title, BUDGET.chapterLabel, `${chapter.chapterId}.chapterLabel`),
          assertion: rejectIfLonger(assertion, BUDGET.assertion, `${chapter.chapterId}.assertion`),
          figureSeries: figure.rows,
          figureUnit: figure.unit,
          figureSource: GH_INSIGHTS.document.evidenceSource
        }
      }
    })
  }

  // Lo que ninguna lámina de evidencia tituló se narra: en el deck no hay tabla que lo sostenga.
  const remaining = chapter.claims.map(claim => claim.text).filter(text => !used.has(text))

  const narrated =
    remaining.length > 0
      ? narrativeSlides(tab, chapter.title, remaining, chapter.chapterId, GH_INSIGHTS.document.chapterInFigures)
      : slides.length === 0
        ? // Un capítulo sin datos se cuenta, no se omite.
          narrativeSlides(tab, chapter.title, [chapter.title, GH_INSIGHTS.document.chapterNoFindings], chapter.chapterId, GH_INSIGHTS.document.chapterNoFindings)
        : []

  for (const slide of narrated) slides.push({ slide, contentsTitle: String((slide.slots as { assertion: string }).assertion) })

  return slides
}

export const buildInsightsDeckPlanInput = ({ edition, report, plan, snapshot }: BuildInsightsDeckInput): CompositionPlanInput => {
  const frozen = withDedupedLimits(plan)
  const factsById = new Map(snapshot.facts.map(fact => [fact.factId, fact] as const))
  const period = periodLabelOf(edition, frozen.locale)
  const periodInline = periodInlineOf(edition, frozen.locale)

  if (frozen.chapters.length === 0) {
    throw new InsightsRenderRejectedError('El plan no tiene capítulos: no hay deck que componer.')
  }

  const slides: Slide[] = [
    {
      contentType: 'insights-cover',
      slots: {
        editionLabel: `${L.editionKind} · ${period}`,
        eyebrow: L.readingEyebrow,
        reportTitle: rejectIfLonger(report.title, BUDGET.reportTitle, 'cover.reportTitle'),
        confidentialityLine: `${L.confidential} · ${L.version} ${edition.version} · ${issuedLongLabelOf(edition, GH_INSIGHTS.document.unissued, frozen.locale)}`
      }
    }
  ]

  slides.push(
    ...narrativeSlides(
      { tabNumber: L.tabMarks.summary, section: GH_INSIGHTS.document.executiveSummary, period },
      GH_INSIGHTS.document.executiveSummary,
      frozen.executiveSummary.map(claim => claim.text),
      'summary',
      GH_INSIGHTS.document.summaryInChapters
    )
  )

  // Aperturas con su índice: los folios se conocen cuando el plan de láminas está completo.
  const openings: { slideIndex: number; entries: { title: string; offset: number }[] }[] = []

  frozen.chapters.forEach((chapter, index) => {
    const number = pad2(index + 1)
    const tab = { tabNumber: number, section: rejectIfLonger(chapter.title, BUDGET.section, `${chapter.chapterId}.section`), period }
    const body = chapterSlides(chapter, tab, factsById, frozen.locale)

    openings.push({
      slideIndex: slides.length,
      entries: body.flatMap((entry, offset) => (entry.contentsTitle ? [{ title: entry.contentsTitle, offset: offset + 1 }] : []))
    })

    slides.push({
      contentType: 'insights-chapter',
      slots: {
        chapterLabel: `${L.chapter} ${number}`,
        chapterNumeral: number,
        runningLabel: `${L.reportOf} ${periodInline}`,
        chapterTitle: rejectIfLonger(chapter.title, BUDGET.chapterTitle, `${chapter.chapterId}.title`),
        ...(chapter.opening
          ? { chapterLead: rejectIfLonger(chapter.opening.text, BUDGET.chapterLead, `${chapter.chapterId}.opening`) }
          : {})
      }
    })

    slides.push(...body.map(entry => entry.slide))
  })

  for (const limits of chunkByCapacity(limitEntriesOf(frozen.limits), CAPACITY.limits, (_l, i) => `limit-${i}`)) {
    slides.push({
      contentType: 'insights-limits',
      slots: {
        tabNumber: L.tabMarks.limits,
        section: GH_INSIGHTS.document.limitsAndMethod,
        period,
        eyebrow: L.limitsEyebrow,
        assertion: L.limitsTitleRich,
        limits: limits.map(entry => ({
          subject: rejectIfLonger(entry.subject, BUDGET.limitSubject, 'limit.subject'),
          cause: rejectIfLonger(entry.cause, BUDGET.limitCause, 'limit.cause')
        }))
      }
    })
  }

  slides.push({
    contentType: 'insights-back-cover',
    slots: {
      editionLabel: `${L.backCoverPrefix} · ${period}`,
      contact: {
        email: EFEONCE_CONTACT.email,
        phonePrimary: EFEONCE_CONTACT.phones[0].display,
        phoneSecondary: EFEONCE_CONTACT.phones[1].display,
        address: EFEONCE_CONTACT.addressDisplay
      },
      marketsLine: EFEONCE_OPERATING_MARKETS.join(' · '),
      legalLine: `${EFEONCE_LEGAL_NAME_FALLBACK} · RUT ${EFEONCE_TAX_ID_FALLBACK} · ${L.legalConfidential} · ${L.figuresAsOf} ${periodEndLongLabelOf(edition, frozen.locale)}`
    }
  })

  // Índice de cada apertura, con folios físicos; una entrada por título. Si no cabe, la apertura va
  // sin índice propio (nunca recortado).
  for (const { slideIndex, entries } of openings) {
    const seen = new Map<string, string>()

    for (const { title, offset } of entries) if (!seen.has(title)) seen.set(title, pad2(slideIndex + 1 + offset))

    const list = [...seen].map(([title, folio]) => ({ title, folio }))

    if (list.length > 0 && list.length <= CAPACITY.chapterContents && list.every(e => e.title.length <= BUDGET.contentsTitle)) {
      ;(slides[slideIndex]!.slots as Record<string, unknown>).contents = { label: L.inThisChapter, entries: list }
    }
  }

  const footerEdition = `${L.product} · ${L.reportOf} ${periodInline}`
  const total = pad2(slides.length)

  return {
    artifactId: edition.editionId,
    slides: slides.map((slide, i) => {
      const slots = { ...slide.slots } as Record<string, unknown>

      if (FOLIO_TYPES.has(slide.contentType)) Object.assign(slots, { footerEdition, folio: { page: pad2(i + 1), total } })
      if (slide.contentType === 'insights-chapter') slots.pageFolio = pad2(i + 1)

      return { ...slide, slideId: `slide-${pad2(i + 1)}`, slots }
    }) as CompositionSlideInput[]
  }
}
