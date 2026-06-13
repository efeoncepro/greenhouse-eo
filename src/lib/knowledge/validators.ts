/**
 * TASK-1081 — Knowledge Platform light validators (pure).
 */

import { KnowledgeValidationError } from './errors'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Slug humano estable (kebab-case ascii). Es la clave canónica del documento. */
export const assertKnowledgeSlug = (slug: string): string => {
  const trimmed = (slug ?? '').trim()

  if (!SLUG_RE.test(trimmed)) {
    throw new KnowledgeValidationError(
      'El slug debe ser kebab-case ascii (ej. "como-preguntar-a-nexa").',
      'knowledge_invalid_slug'
    )
  }

  return trimmed
}

export const assertNonEmptyKnowledgeText = (value: string, field: string): string => {
  const trimmed = (value ?? '').trim()

  if (trimmed.length === 0) {
    throw new KnowledgeValidationError(`El campo "${field}" no puede estar vacío.`, 'knowledge_empty_field')
  }

  return trimmed
}

/**
 * Feedback debe referenciar al menos un documento o chunk; de lo contrario es
 * ruido sin destino editorial.
 */
export const assertKnowledgeFeedbackTarget = (
  documentId: string | null | undefined,
  chunkId: string | null | undefined
): void => {
  if (!documentId && !chunkId) {
    throw new KnowledgeValidationError(
      'El feedback debe referenciar un documento o un chunk.',
      'knowledge_feedback_without_target'
    )
  }
}
