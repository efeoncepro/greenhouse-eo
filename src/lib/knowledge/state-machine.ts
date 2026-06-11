/**
 * TASK-1081 — Knowledge Platform publication state machine (pure, no IO).
 *
 * `publication_status` (lifecycle) y `agentic_policy` (compuerta retrieval) son
 * DOS dimensiones ORTOGONALES (TASK-1080 D-3). Este módulo gobierna SOLO el
 * lifecycle; la compuerta agéntica se evalúa con `isAgentRetrievable`.
 *
 * El matrix de transiciones es espejo exacto del trigger DB
 * `knowledge_documents_validate_transition` (migración 20260611200140700).
 */

import { KnowledgePublicationTransitionError } from './errors'
import type {
  KnowledgeAgenticPolicy,
  KnowledgeFreshness,
  KnowledgePublicationStatus
} from './types'

export const KNOWLEDGE_PUBLICATION_TRANSITIONS: Record<
  KnowledgePublicationStatus,
  readonly KnowledgePublicationStatus[]
> = {
  draft: ['review', 'published', 'quarantined'],
  review: ['published', 'draft', 'quarantined'],
  published: ['stale', 'deprecated', 'quarantined'],
  stale: ['published', 'deprecated', 'quarantined'],
  deprecated: ['published', 'quarantined'],
  quarantined: ['draft', 'review', 'published']
}

export const isValidKnowledgePublicationTransition = (
  from: KnowledgePublicationStatus,
  to: KnowledgePublicationStatus
): boolean => {
  if (from === to) {
    return true
  }

  return KNOWLEDGE_PUBLICATION_TRANSITIONS[from].includes(to)
}

export const assertValidKnowledgePublicationTransition = (
  from: KnowledgePublicationStatus,
  to: KnowledgePublicationStatus
): void => {
  if (!isValidKnowledgePublicationTransition(from, to)) {
    throw new KnowledgePublicationTransitionError(from, to)
  }
}

/** `quarantined` gana sobre todo: invisible para humanos y agentes. */
export const isKnowledgeQuarantined = (status: KnowledgePublicationStatus): boolean =>
  status === 'quarantined'

/**
 * Elegibilidad de retrieval agéntico por defecto (la enforce real es pre-LLM en
 * TASK-1083). Reglas: `agent_allowed` Y publicado/stale. `deprecated` solo bajo
 * pregunta explícita (no default). `quarantined` y `agent_excluded` nunca.
 */
export const isKnowledgeAgentRetrievable = (
  status: KnowledgePublicationStatus,
  policy: KnowledgeAgenticPolicy
): boolean => policy === 'agent_allowed' && (status === 'published' || status === 'stale')

/** Deriva el `freshness` denormalizado del chunk desde el lifecycle del documento. */
export const deriveKnowledgeChunkFreshness = (
  status: KnowledgePublicationStatus
): KnowledgeFreshness => {
  switch (status) {
    case 'published':
      return 'current'
    case 'stale':
      return 'stale'
    case 'deprecated':
      return 'deprecated'
    default:
      // draft | review | quarantined — no debería ser retrievable de todas formas.
      return 'unknown'
  }
}
