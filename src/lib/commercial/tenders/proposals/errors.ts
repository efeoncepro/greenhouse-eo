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
