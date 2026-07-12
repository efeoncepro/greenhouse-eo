/**
 * Proposal Studio F0 — errores tipados y sanitizados (TASK-1392).
 *
 * Los mensajes son seguros para logs y para traducir a `canonicalErrorResponse` en la capa API:
 * jamás contienen contenido de RFP, precios de costo, SQL ni payloads de proveedor.
 */

export class ProposalNotFoundError extends Error {
  constructor(public readonly proposalId: string) {
    super(`La propuesta "${proposalId}" no existe o no pertenece a la organización del contexto.`)
    this.name = 'ProposalNotFoundError'
  }
}

export class ProposalInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProposalInputError'
  }
}

export class ProposalHumanGateError extends Error {
  constructor(fromState: string, toState: string) {
    super(
      `La transición ${fromState} → ${toState} es un GATE HUMANO: exige un actor member con confirmación explícita. ` +
        `Un agente/sistema no la cruza (propose → confirm → execute).`
    )
    this.name = 'ProposalHumanGateError'
  }
}

export class ProposalQuoteGateError extends Error {
  constructor(
    public readonly code:
      | 'quote_missing'
      | 'quote_not_found'
      | 'margin_unknown'
      | 'margin_not_positive'
      | 'margin_below_floor',
    message: string
  ) {
    super(message)
    this.name = 'ProposalQuoteGateError'
  }
}

export class ProposalQuoteMismatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProposalQuoteMismatchError'
  }
}

export class ProposalAudienceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProposalAudienceError'
  }
}

/** Rechazo de un render por regla de la propuesta (audience/constraint/semántica). */
export class ProposalRenderRejectedError extends Error {
  constructor(
    public readonly code:
      | 'audience_violation'
      | 'accessibility_unsupported'
      | 'semantic_rejected'
      | 'deadline_expired'
      | 'flag_disabled',
    message: string
  ) {
    super(message)
    this.name = 'ProposalRenderRejectedError'
  }
}

/** Conflicto de estado de un job de render (retry inválido, job no reintentable…). */
export class ProposalRenderStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProposalRenderStateError'
  }
}

export class ProposalEntitlementError extends Error {
  constructor(public readonly ownerOrgId: string) {
    super(
      `La organización "${ownerOrgId}" no tiene el módulo proposal_studio_v1 activo: la capability se contrata por org, no se hereda por rol.`
    )
    this.name = 'ProposalEntitlementError'
  }
}

export class ProposalForbiddenError extends Error {
  constructor(need: string) {
    super(`El actor no tiene la capability requerida para esta operación (${need}).`)
    this.name = 'ProposalForbiddenError'
  }
}
