/**
 * TASK-1921 — errores tipados del render de marca. El transporte (lane App, MCP) los traduce a códigos sanitizados;
 * nunca viaja un error crudo, el intent ni las rutas de las fuentes en el mensaje.
 */
export type BrandRenderErrorCode =
  | 'invalid_request'
  | 'render_rejected'
  | 'missing_source'
  | 'forbidden'
  | 'not_found'
  | 'render_disabled'
  | 'invalid_transition'

export class BrandRenderError extends Error {
  readonly code: BrandRenderErrorCode
  readonly statusCode: number
  readonly details: Record<string, unknown>

  constructor(code: BrandRenderErrorCode, message: string, statusCode: number, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'BrandRenderError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/** El pedido no tiene la forma del contrato (campo desconocido, familia inexistente, sources inválidas). */
export class BrandRenderInputError extends BrandRenderError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('invalid_request', message, 400, details)
    this.name = 'BrandRenderInputError'
  }
}

/**
 * El contrato AXIS o la línea gráfica rechazan el pedido (receta no aprobada, issues del contrato, manifiesto de Glitch
 * inválido, portada sin candidata…). `details.reason` lleva el código del mapper y `details.issues` los issues saneados.
 */
export class BrandRenderRejectedError extends BrandRenderError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('render_rejected', message, 422, details)
    this.name = 'BrandRenderRejectedError'
  }
}

/** Una foto, plate o logo que el pedido nombra no está en `sources`, no existe o no es una fuente de marca válida. */
export class BrandRenderMissingSourceError extends BrandRenderError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('missing_source', message, 422, details)
    this.name = 'BrandRenderMissingSourceError'
  }
}

export class BrandRenderForbiddenError extends BrandRenderError {
  constructor(message = 'Acción no autorizada para este actor', details: Record<string, unknown> = {}) {
    super('forbidden', message, 403, details)
    this.name = 'BrandRenderForbiddenError'
  }
}

export class BrandRenderNotFoundError extends BrandRenderError {
  constructor(resource: string, id: string) {
    super('not_found', `No existe ${resource}`, 404, { resource, id })
    this.name = 'BrandRenderNotFoundError'
  }
}

export class BrandRenderDisabledError extends BrandRenderError {
  constructor() {
    super('render_disabled', 'El render de piezas de marca no está habilitado en este entorno', 503)
    this.name = 'BrandRenderDisabledError'
  }
}

/** Un worker que perdió su lease intentó finalizar un job que ya reclamó otra ejecución: su resultado se descarta. */
export class BrandRenderFenceLostError extends Error {
  constructor(readonly jobId: string, readonly fenceToken: number) {
    super(`El job ${jobId} fue reclamado por otra ejecución (fence ${fenceToken} vencido)`)
    this.name = 'BrandRenderFenceLostError'
  }
}
