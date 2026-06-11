/**
 * TASK-1081 — Knowledge Platform domain errors (pure).
 */

export class KnowledgeValidationError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(message: string, code = 'knowledge_validation_error', statusCode = 422) {
    super(message)
    this.name = 'KnowledgeValidationError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class KnowledgePublicationTransitionError extends KnowledgeValidationError {
  readonly from: string
  readonly to: string

  constructor(from: string, to: string) {
    super(
      `Transición de publicación inválida: ${from} → ${to}.`,
      'knowledge_invalid_publication_transition',
      409
    )
    this.name = 'KnowledgePublicationTransitionError'
    this.from = from
    this.to = to
  }
}

export class KnowledgeNotFoundError extends KnowledgeValidationError {
  constructor(entity: string, id: string) {
    super(`${entity} no encontrado: ${id}.`, 'knowledge_not_found', 404)
    this.name = 'KnowledgeNotFoundError'
  }
}
