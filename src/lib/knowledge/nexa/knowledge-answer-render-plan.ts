/**
 * Domain adapter — `KnowledgeRetrievalPacket` (knowledge-search.v1) → `NexaAnswersRenderPlan`. TASK-1101.
 *
 * El PUENTE de dominio que hace concreto el invariante "Knowledge es un consumer del canvas, NO el
 * destino": traduce el packet de retrieval REAL (TASK-1083/1085) al render plan NEUTRAL que
 * `NexaAnswersCanvas` consume. Vive en territorio de Knowledge — el consumer mapea SU dominio al
 * contrato transversal; la primitive NUNCA conoce `knowledge-search.v1`. Cualquier consumer futuro
 * (finance/agency) escribe SU propio adapter análogo; la primitive no cambia.
 *
 * Honestidad (state-design): `confidence='none'` / 0 chunks → gap honesto (NUNCA respuesta inventada).
 * Citas inline: reusa el mapper canónico (TASK-1092) — cero número nuevo, `score` verbatim, `href`=`humanUrl`.
 * Proof: reusa el evidence converter canónico (`nexa-evidence.v1`).
 *
 * PURA: cero IO, cero UI, cero React. Testeable con fixtures del packet.
 */
import type {
  NexaAnswerPoint,
  NexaAnswerTrustCue,
  NexaAnswersBubbleBlock,
  NexaAnswersProofSpec,
  NexaAnswersRenderPlan,
  NexaExpressiveTextValue
} from '@/components/greenhouse/primitives'
import type { KnowledgeRetrievalPacket } from '@/lib/knowledge/search/types'
import { knowledgePacketToConversationalEvidence } from '@/lib/nexa/conversational-evidence'
import { mapKnowledgeChunkToCitationSource, truncateCitationExcerpt } from '@/lib/nexa/nexa-answers-citation-mapper'

/** Cuántos pasajes citados se materializan como puntos del answer bubble. El resto vive en el proof. */
const DEFAULT_MAX_POINTS = 4

/** Largo del pasaje visible en cada punto (más corto que el peek: acá se lee de un vistazo). */
const POINT_EXCERPT_LENGTH = 200

/**
 * Copy es-CL del adapter (TASK-265: copy de dominio reusable + overridable). El host puede pasar
 * overrides; los defaults son honestos y no sobre-prometen ("esto encontré", no "la respuesta es").
 */
export interface KnowledgeAnswerRenderPlanCopy {
  groundedTitle: string
  groundedIntroLead: string
  groundedIntroTail: string
  emptyTitle: string
  emptyBody: string
  proofLabel: string
  proofCollapsedLabel: string
  proofExpandedLabel: string
  proofUnavailableReason: string
  trustGroundedLabel: string
  trustStaleLabel: string
  trustLowLabel: string
  trustEmptyLabel: string
  trustEmptyDetail: string
}

export const KNOWLEDGE_ANSWER_RENDER_PLAN_COPY: KnowledgeAnswerRenderPlanCopy = {
  groundedTitle: 'Esto encontré en el conocimiento publicado',
  groundedIntroLead: 'Reuní ',
  groundedIntroTail: ' del corpus para responder. Cada punto cita su origen.',
  emptyTitle: 'No encontré una guía publicada para esto',
  emptyBody: 'No hay fuentes en el corpus que respalden una respuesta, así que no voy a inventar una. Reformulá la pregunta o pedile a tu equipo que documente el tema.',
  proofLabel: 'Cómo lo sé',
  proofCollapsedLabel: 'Ver fuentes y traza',
  proofExpandedLabel: 'Ocultar fuentes y traza',
  proofUnavailableReason: 'No hay fuentes que citar para esta consulta.',
  trustGroundedLabel: 'Respuesta con respaldo',
  trustStaleLabel: 'Fuentes con revisión pendiente',
  trustLowLabel: 'Respaldo parcial',
  trustEmptyLabel: 'Sin fuentes publicadas',
  trustEmptyDetail: 'No encontré conocimiento que respalde una respuesta.'
}

export interface BuildKnowledgeAnswerRenderPlanOptions {
  /** Override del copy es-CL (defaults honestos incluidos). */
  copy?: Partial<KnowledgeAnswerRenderPlanCopy>
  /** Máximo de pasajes citados como puntos (default 4; el resto queda en el proof). */
  maxPoints?: number
}

const pluralFuentes = (count: number): string => (count === 1 ? '1 fuente' : `${count} fuentes`)

const isStaleFreshness = (packet: KnowledgeRetrievalPacket): boolean =>
  packet.freshness === 'stale' || packet.freshness === 'deprecated'

const citedDocumentCount = (packet: KnowledgeRetrievalPacket): number =>
  new Set(packet.chunks.map(chunk => chunk.documentId)).size

/**
 * Trust cue derivado del packet (confidence × freshness). Honesto: `none`/vacío → warning sin respaldo;
 * stale → warning de vigencia; low → info parcial; high/medium vigente → success con respaldo.
 */
export const deriveKnowledgeTrustCue = (
  packet: KnowledgeRetrievalPacket,
  copy: KnowledgeAnswerRenderPlanCopy = KNOWLEDGE_ANSWER_RENDER_PLAN_COPY
): NexaAnswerTrustCue => {
  const cited = citedDocumentCount(packet)

  if (packet.confidence === 'none' || packet.chunks.length === 0) {
    return { tone: 'warning', label: copy.trustEmptyLabel, detail: copy.trustEmptyDetail }
  }

  if (isStaleFreshness(packet)) {
    return { tone: 'warning', label: copy.trustStaleLabel, detail: `${pluralFuentes(cited)} citadas · vigencia: revisar` }
  }

  if (packet.confidence === 'low') {
    return { tone: 'info', label: copy.trustLowLabel, detail: `${pluralFuentes(cited)} con relevancia baja` }
  }

  return { tone: 'success', label: copy.trustGroundedLabel, detail: `${pluralFuentes(cited)} citadas · vigentes` }
}

/** Construye el proof spec (evidence `nexa-evidence.v1`) o su razón de no-disponibilidad. */
const buildProofSpec = (
  packet: KnowledgeRetrievalPacket,
  copy: KnowledgeAnswerRenderPlanCopy
): NexaAnswersProofSpec => {
  const base = {
    id: 'knowledge-proof',
    label: copy.proofLabel,
    collapsedLabel: copy.proofCollapsedLabel,
    expandedLabel: copy.proofExpandedLabel
  }

  if (packet.chunks.length === 0) {
    return { ...base, unavailableReason: copy.proofUnavailableReason }
  }

  return { ...base, evidence: knowledgePacketToConversationalEvidence(packet) }
}

/** Construye los puntos del answer bubble: cada pasaje citado lleva su marcador inline [n] (evidence-peek). */
const buildGroundedPoints = (packet: KnowledgeRetrievalPacket, maxPoints: number): NexaAnswerPoint[] =>
  packet.chunks.slice(0, maxPoints).map(chunk => {
    const source = mapKnowledgeChunkToCitationSource(chunk)
    const title: NexaExpressiveTextValue = [{ text: chunk.title, style: 'strong' }]

    const body: NexaExpressiveTextValue = [
      { text: truncateCitationExcerpt(chunk.text, POINT_EXCERPT_LENGTH) },
      { text: ' ' },
      { type: 'citation', source }
    ]

    return { title, body }
  })

/**
 * Construye el `NexaAnswersRenderPlan` desde el packet de retrieval. SSOT de la presentación de Knowledge
 * en el canvas. Reutilizable por cualquier host (lente Nexa de `/knowledge`, mockup, futuras superficies).
 */
export const buildKnowledgeAnswerRenderPlan = (
  packet: KnowledgeRetrievalPacket,
  options?: BuildKnowledgeAnswerRenderPlanOptions
): NexaAnswersRenderPlan => {
  const copy: KnowledgeAnswerRenderPlanCopy = { ...KNOWLEDGE_ANSWER_RENDER_PLAN_COPY, ...options?.copy }
  const maxPoints = options?.maxPoints ?? DEFAULT_MAX_POINTS
  const hasGrounding = packet.confidence !== 'none' && packet.chunks.length > 0
  const trustCue = deriveKnowledgeTrustCue(packet, copy)
  const cited = citedDocumentCount(packet)
  const blockId = 'knowledge-answer'

  const block: NexaAnswersBubbleBlock = hasGrounding
    ? {
        id: blockId,
        renderer: 'answerBubble',
        rendererVersion: 'v1',
        variant: 'explanation',
        kind: 'knowledgeExplanationAnswer',
        title: [{ text: copy.groundedTitle }],
        body: [
          { text: copy.groundedIntroLead },
          { text: pluralFuentes(cited), style: 'strong' },
          { text: copy.groundedIntroTail }
        ],
        metaLabel: [{ text: `${pluralFuentes(cited)} · ${isStaleFreshness(packet) ? 'revisar vigencia' : 'vigentes'}` }],
        points: buildGroundedPoints(packet, maxPoints),
        trustCue
      }
    : {
        id: blockId,
        renderer: 'answerBubble',
        rendererVersion: 'v1',
        variant: 'explanation',
        kind: 'knowledgeExplanationAnswer',
        title: [{ text: copy.emptyTitle }],
        body: [{ text: copy.emptyBody, style: 'soft' }],
        metaLabel: [{ text: 'Sin fuentes' }],
        points: [],
        trustCue
      }

  return {
    id: `knowledge-answer-plan-${packet.generatedAt ?? 'now'}`,
    version: 'nexa-answer-render-plan.v1',
    intent: 'explain',
    autonomyTier: 'observeOnly',
    primaryBlockId: blockId,
    blocks: [block],
    trustCue,
    // La interacción (Abrir fuente) vive en el evidence-peek de cada cita + el proof; sin acciones de plan en V1.
    actions: [],
    proof: buildProofSpec(packet, copy)
  }
}
