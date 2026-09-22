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
 * Browser-safe en su frontera: sólo tipos y módulos puros del composer (un import de VALOR del barrel
 * arrastra Playwright y los catálogos a la función de Vercel — ISSUE-177).
 */

import 'server-only'

import type { CompositionPlanInput, CompositionSlideInput } from '@/lib/artifact-composer'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'
import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'
import { InsightsRenderRejectedError } from '../errors'
import { chunkByCapacity, limitEntriesOf, rejectIfLonger } from './composition-helpers'
import { buildFigurePages, claimsForFigure } from './figure-pages'
import { periodLabelOf } from './labels'
import { withDedupedLimits } from './plan-limits'

/** Capacidades declaradas por las plantillas del catálogo (`*.slots.json`). Son del molde. */
const CAPACITY = { figureRows: 5, points: 4, limits: 6 } as const

const BUDGET = {
  editionId: 24,
  reportTitle: 70,
  chapterLabel: 40,
  assertion: 120,
  point: 190,
  limitsAssertion: 90,
  limitSubject: 38,
  limitCause: 96
} as const

export interface BuildInsightsDeckInput {
  readonly edition: InsightEditionRecord
  readonly report: InsightReportRecord
  readonly plan: EditorialPlanV1
  readonly snapshot: EvidenceSnapshotRecord
}

type Slide = Omit<CompositionSlideInput, 'slideId'>

/** Láminas narrativas: el primer texto es el titular y el resto se reparte en puntos, sin recortar. */
const narrativeSlides = (chapterLabel: string, texts: readonly string[], field: string): Slide[] => {
  const [headline, ...rest] = texts

  if (!headline) return []

  const chunks = chunkByCapacity(rest.length > 0 ? rest : [GH_INSIGHTS.document.summaryNoMore], CAPACITY.points, (_t, i) => `${field}-${i}`)

  return chunks.map(points => ({
    contentType: 'insights-narrative',
    slots: {
      chapterLabel: rejectIfLonger(chapterLabel, BUDGET.chapterLabel, `${field}.chapterLabel`),
      assertion: rejectIfLonger(headline, BUDGET.assertion, `${field}.assertion`),
      points: points.map(text => ({ text: rejectIfLonger(text, BUDGET.point, `${field}.point`) }))
    }
  }))
}

const chapterSlides = (chapter: PlanChapterV1, factsById: ReadonlyMap<string, EvidenceFactV1>, locale: string): Slide[] => {
  const slides: Slide[] = []
  const used = new Set<string>()

  for (const figure of chapter.charts.flatMap(chart => buildFigurePages(chart, factsById, locale, CAPACITY.figureRows))) {
    const own = claimsForFigure(chapter.claims, figure)
    const assertion = own.find(text => !used.has(text)) ?? own[0] ?? chapter.title

    used.add(assertion)

    slides.push({
      contentType: 'insights-evidence',
      slots: {
        chapterLabel: rejectIfLonger(chapter.title, BUDGET.chapterLabel, `${chapter.chapterId}.chapterLabel`),
        assertion: rejectIfLonger(assertion, BUDGET.assertion, `${chapter.chapterId}.assertion`),
        figureSeries: figure.rows,
        figureUnit: figure.unit,
        figureSource: GH_INSIGHTS.document.evidenceSource
      }
    })
  }

  // Lo que ninguna lámina de evidencia tituló se narra: en el deck no hay tabla que lo sostenga.
  const remaining = chapter.claims.map(claim => claim.text).filter(text => !used.has(text))

  if (remaining.length > 0) {
    slides.push(...narrativeSlides(chapter.title, remaining, chapter.chapterId))
  } else if (slides.length === 0) {
    // Un capítulo sin datos se cuenta, no se omite.
    slides.push(...narrativeSlides(chapter.title, [chapter.title, GH_INSIGHTS.document.chapterNoFindings], chapter.chapterId))
  }

  return slides
}

export const buildInsightsDeckPlanInput = ({ edition, report, plan, snapshot }: BuildInsightsDeckInput): CompositionPlanInput => {
  const frozen = withDedupedLimits(plan)
  const factsById = new Map(snapshot.facts.map(fact => [fact.factId, fact] as const))

  if (frozen.chapters.length === 0) {
    throw new InsightsRenderRejectedError('El plan no tiene capítulos: no hay deck que componer.')
  }

  const slides: Slide[] = [
    {
      contentType: 'insights-cover',
      slots: {
        editionId: rejectIfLonger(`${report.reportCode} · v${edition.version}`, BUDGET.editionId, 'cover.editionId'),
        reportTitle: rejectIfLonger(report.title, BUDGET.reportTitle, 'cover.reportTitle'),
        periodLabel: periodLabelOf(edition, frozen.locale),
        versionLabel: `v${edition.version}`
      }
    }
  ]

  slides.push(...narrativeSlides(GH_INSIGHTS.document.executiveSummary, frozen.executiveSummary.map(claim => claim.text), 'summary'))

  for (const chapter of frozen.chapters) slides.push(...chapterSlides(chapter, factsById, frozen.locale))

  for (const limits of chunkByCapacity(limitEntriesOf(frozen.limits), CAPACITY.limits, (_l, i) => `limit-${i}`)) {
    slides.push({
      contentType: 'insights-limits',
      slots: {
        assertion: rejectIfLonger(GH_INSIGHTS.document.limitsTitle, BUDGET.limitsAssertion, 'limits.assertion'),
        limits: limits.map(entry => ({
          subject: rejectIfLonger(entry.subject, BUDGET.limitSubject, 'limit.subject'),
          cause: rejectIfLonger(entry.cause, BUDGET.limitCause, 'limit.cause')
        }))
      }
    })
  }

  return {
    artifactId: edition.editionId,
    slides: slides.map((slide, i) => ({ ...slide, slideId: `slide-${String(i + 1).padStart(2, '0')}` })) as CompositionSlideInput[]
  }
}
