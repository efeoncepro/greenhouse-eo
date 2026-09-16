/**
 * TASK-1846 — mapper V1: plan editorial congelado → `CompositionPlanInput` del catálogo `deck-axis`.
 *
 * QUÉ ES: la traducción mínima y honesta de una edición a láminas que el catálogo actual sabe
 * componer. QUÉ NO ES: el catálogo A4 ni los gráficos analíticos — eso es TASK-1847, que reemplaza
 * este mapper por catálogos propios. Mientras tanto, el motor de render es real de punta a punta
 * y produce un deck de Insights con el vocabulario que existe.
 *
 * Reglas que no se negocian:
 *   · Las CIFRAS salen de los hechos sellados (`factId` → `value`/`unit`) y viajan con `evidenceRef`
 *     (el catálogo exige evidencia en toda cifra: `quantifiedClaimsRequireEvidenceRef`).
 *   · NUNCA se trunca una cifra ni una afirmación para que "quepa": si el texto excede el presupuesto
 *     del slot, el encargo se rechaza fail-closed con la causa (`render_rejected`). Sólo un LABEL o un
 *     TÍTULO (presentación, no dato) se puede acortar con elipsis.
 *   · No se emite CoverFull: su `proposalKind` imprime «Propuesta Técnica» o «Capacitación HubSpot» —
 *     vocabulario de licitación que mentiría en un informe. El divisor de sección abre el deck.
 *   · `plan.limits` llega deduplicado (decisión registrada: se deduplica en el RENDER, el plan
 *     congelado no se toca).
 */

import type { CompositionPlanInput } from '@/lib/artifact-composer'

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
import { InsightsRenderRejectedError } from '../errors'
import type { EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'

import { withDedupedLimits } from './plan-limits'

const MODULE_TITLES: Record<InsightModule, string> = {
  seo: 'Visibilidad orgánica',
  aeo: 'Respuesta de IA',
  ico: 'Entrega y cumplimiento'
}

const KPI_KIND: Record<InsightModule, 'visibility' | 'engines' | 'authority' | 'gap'> = {
  seo: 'visibility',
  aeo: 'engines',
  ico: 'authority'
}

/** Acorta SÓLO presentación (títulos/labels), nunca cifras ni afirmaciones. */
const ellipsize = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`

const rejectIfLonger = (value: string, max: number, slot: string, ref: string): string => {
  if (value.length > max) {
    throw new InsightsRenderRejectedError(
      `El contenido de "${slot}" excede el presupuesto del catálogo (${value.length} > ${max}); no se trunca en silencio`,
      { slot, ref, length: value.length, max }
    )
  }

  return value
}

const formatValue = (fact: EvidenceFactV1): string => {
  if (fact.value === null) return 'Ausente'

  const v = fact.value

  switch (fact.unit) {
    case 'percent':
      return `${(Math.round(v * 10) / 10).toLocaleString('es-CL')}%`
    case 'ratio':
      return (Math.round(v * 100) / 100).toLocaleString('es-CL')
    case 'position':
      return `#${Math.round(v)}`
    case 'days':
      return `${Math.round(v)} d`
    default:
      return Math.abs(v) >= 100000 ? `${Math.round(v / 1000)}k` : Math.round(v).toLocaleString('es-CL')
  }
}

const unitLabel = (fact: EvidenceFactV1): string | undefined => {
  switch (fact.unit) {
    case 'count':
      return undefined
    case 'visits_estimated':
      return 'visitas'
    case 'usd':
      return 'USD'
    case 'clp':
      return 'CLP'
    case 'score':
      return 'score'
    default:
      return undefined
  }
}

const periodLabel = (edition: InsightEditionRecord): string => {
  const { start, endExclusive } = edition.request.period

  return `${start} → ${endExclusive} · ${edition.periodTimeZone}`
}

const factsOf = (chapter: PlanChapterV1, byId: Map<string, EvidenceFactV1>): EvidenceFactV1[] => {
  const ids = new Set<string>()

  for (const claim of chapter.claims) for (const id of claim.factIds) ids.add(id)

  return [...ids].map(id => byId.get(id)).filter((f): f is EvidenceFactV1 => Boolean(f))
}

/**
 * Cuerpo de lectura de la lámina de KPIs: las dos primeras afirmaciones si caben juntas en el
 * presupuesto (200), si no sólo la primera; si tampoco cabe, se rechaza (nunca se recorta).
 */
const readBodyFor = (chapter: PlanChapterV1): string => {
  const two = chapter.claims.slice(0, 2).map(c => c.text).join(' ')

  if (two.length <= 200) return two || MODULE_TITLES[chapter.module]

  return chapter.claims[0]?.text ?? MODULE_TITLES[chapter.module]
}

/** Capítulo con ≥3 hechos numéricos → lámina de KPIs; si no, narrativa. */
const chapterSlide = (
  chapter: PlanChapterV1,
  byId: Map<string, EvidenceFactV1>,
  edition: InsightEditionRecord,
  clientLabel: string
): CompositionPlanInput['slides'][number] => {
  const facts = factsOf(chapter, byId).filter(f => f.value !== null)
  const slideId = `slide.${chapter.chapterId}`

  if (facts.length >= 3) {
    const kpis = facts.slice(0, 4).map(fact => {
      const claim = chapter.claims.find(c => c.factIds.includes(fact.factId))
      const qual = claim && claim.text.length <= 72 ? claim.text : `${fact.population} · cobertura ${fact.coverage.kind}`

      return {
        kind: KPI_KIND[fact.module],
        value: rejectIfLonger(formatValue(fact), 8, 'kpis.value', fact.factId),
        ...(unitLabel(fact) ? { unit: unitLabel(fact) } : {}),
        label: ellipsize(fact.label, 32),
        qual: ellipsize(qual, 72),
        evidenceRef: fact.evidenceRef
      }
    })

    const lead = chapter.claims[0]?.text ?? chapter.title

    return {
      slideId,
      contentType: 'several-kpis',
      slots: {
        title: ellipsize(chapter.title, 32),
        subtitle: { client: ellipsize(clientLabel, 22), context: ellipsize(periodLabel(edition), 28) },
        kpis,
        readLead: lead.length <= 50 ? lead : ellipsize(MODULE_TITLES[chapter.module], 50),
        readBody: rejectIfLonger(readBodyFor(chapter), 200, 'readBody', chapter.chapterId),
        source: ellipsize(`Snapshot sellado · ${periodLabel(edition)}`, 110)
      }
    }
  }

  const body = chapter.claims.slice(0, 2).map(c => rejectIfLonger(c.text, 300, 'body', c.claimId))

  return {
    slideId,
    contentType: 'narrative',
    slots: {
      sectionLabel: ellipsize(MODULE_TITLES[chapter.module], 40),
      title: rejectIfLonger(chapter.title, 80, 'title', chapter.chapterId),
      body: body.length > 0 ? body : [`${MODULE_TITLES[chapter.module]}: sin afirmaciones respaldadas por evidencia en este período.`],
      ...(chapter.limits[0] ? { closing: ellipsize(chapter.limits[0], 82) } : {}),
      conceptTitle: ellipsize(MODULE_TITLES[chapter.module], 32),
      conceptLegend: [
        { layer: 'Sellar', definition: 'Evidencia inmutable del período', tone: 'outer' },
        { layer: 'Congelar', definition: 'Plan editorial sobre esos hechos', tone: 'middle' },
        { layer: 'Emitir', definition: 'Outputs validados y gate humano', tone: 'core' }
      ]
    }
  }
}

export interface BuildInsightDeckInput {
  edition: InsightEditionRecord
  report: InsightReportRecord
  plan: EditorialPlanV1
  snapshot: EvidenceSnapshotRecord
}

/** `artifactId` = editionId: el nombre del archivo y el manifest quedan ligados a la edición. */
export const buildInsightDeckPlanInput = ({ edition, report, plan: frozen, snapshot }: BuildInsightDeckInput): CompositionPlanInput => {
  const plan = withDedupedLimits(frozen)
  const byId = new Map(snapshot.facts.map(f => [f.factId, f] as const))
  const chapters = plan.chapters

  if (chapters.length === 0) {
    throw new InsightsRenderRejectedError('El plan congelado no tiene capítulos: no hay nada que componer', { editionId: edition.editionId })
  }

  const items = chapters.map(ch => ({ title: ellipsize(ch.title, 32), description: ellipsize(ch.claims[0]?.text ?? MODULE_TITLES[ch.module], 60) }))

  // El divisor exige entre 2 y 5 ítems: con un solo capítulo se agrega el de límites, que existe siempre.
  const sectionItems = (items.length >= 2 ? items : [...items, { title: 'Límites y metodología', description: 'Qué no afirma esta edición y cómo se produjo' }]).slice(0, 5)

  const opener: CompositionPlanInput['slides'][number] = {
    slideId: 'slide.opener',
    contentType: 'section-divider',
    slots: {
      kicker: ellipsize(`Edición ${String(edition.version).padStart(2, '0')}`, 20),
      sectionNumber: '01',
      title: ellipsize(report.title, 34),
      lead: ellipsize(`Período ${periodLabel(edition)}. Evidencia sellada, plan congelado, cifras con referencia.`, 96),
      agendaLabel: 'EFEONCE INSIGHTS',
      sectionItems
    }
  }

  const clientLabel = report.title

  const chapterSlides = chapters.map(ch => chapterSlide(ch, byId, edition, clientLabel))

  const limitsText = plan.limits.length > 0 ? plan.limits.join(' ') : 'Sin límites declarados para este período.'
  const methodologyText = plan.methodology.length > 0 ? plan.methodology.join(' · ') : 'Metodología declarada en el snapshot sellado.'

  const closer: CompositionPlanInput['slides'][number] = {
    slideId: 'slide.limits',
    contentType: 'narrative',
    slots: {
      sectionLabel: 'LÍMITES Y METODOLOGÍA',
      title: 'Lo que esta edición <em>no</em> puede afirmar',
      body: [rejectIfLonger(limitsText, 300, 'limits', edition.editionId), ellipsize(methodologyText, 300)],
      closing: 'Una edición dice lo que la evidencia sostiene, y nombra lo que no.',
      conceptTitle: 'Evidencia + límite',
      conceptLegend: [
        { layer: 'Sellar', definition: 'Snapshot inmutable del período', tone: 'outer' },
        { layer: 'Congelar', definition: 'Plan editorial sobre esos hechos', tone: 'middle' },
        { layer: 'Emitir', definition: 'Outputs validados y gate humano', tone: 'core' }
      ]
    }
  }

  return { artifactId: edition.editionId, slides: [opener, ...chapterSlides, closer] }
}
