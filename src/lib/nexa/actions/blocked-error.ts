/**
 * TASK-1399 — `NexaActionBlockedError`: el preview determinó que la acción NO puede ocurrir.
 *
 * El runtime ya distinguía "no existe" / "no está habilitada" / "no tienes permiso" / "el input no
 * valida". Faltaba el cuarto caso, que es el que aparece apenas una acción tiene INVARIANTES DE
 * DOMINIO (no sólo permisos): la acción existe, está habilitada, tienes permiso y el input valida —
 * pero el estado real la bloquea (una evidencia interna citada en un artefacto para el cliente, un
 * deadline vencido, un manifest con un validador en rojo).
 *
 * Antes, ese caso sólo podía morir en el `execute` (después de que el humano confirmara). Eso es
 * deshonesto: la tarjeta prometía una acción que iba a fallar cerrado. Con este error, el
 * `buildPreview` la bloquea ANTES de proponerla y Nexa la EXPLICA (gap `unavailable`) en vez de
 * ofrecerla.
 *
 * Sólo este error se traduce a gap: cualquier otra excepción del preview es un bug y sigue siendo
 * ruidosa (no se disfraza de "no disponible").
 */
export class NexaActionBlockedError extends Error {
  /** Mensaje es-CL, seguro para mostrar al usuario verbatim (nunca detalle técnico ni PII). */
  readonly userMessage: string
  /** CTA alternativa honesta (la superficie donde el humano SÍ puede resolver el bloqueo). */
  readonly deepLink?: string

  constructor(userMessage: string, options?: { deepLink?: string }) {
    super(userMessage)
    this.name = 'NexaActionBlockedError'
    this.userMessage = userMessage
    this.deepLink = options?.deepLink
  }
}

export const isNexaActionBlockedError = (error: unknown): error is NexaActionBlockedError =>
  error instanceof NexaActionBlockedError
