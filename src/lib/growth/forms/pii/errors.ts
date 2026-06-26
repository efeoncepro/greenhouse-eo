/**
 * TASK-1255 — Errores del subsistema PII de Growth Forms.
 *
 * Browser-safe (sin server-only): el mensaje NUNCA contiene PII ni el valor crudo.
 */
export type GrowthFormsPiiReason =
  | 'encryption_key_unconfigured'
  | 'encryption_key_invalid'
  | 'decrypt_failed'
  | 'reason_required'
  | 'submission_not_found'
  | 'field_not_revealable'

export class GrowthFormsPiiError extends Error {
  readonly reason: GrowthFormsPiiReason
  readonly statusCode: number

  constructor(message: string, reason: GrowthFormsPiiReason, statusCode = 400) {
    super(message)
    this.name = 'GrowthFormsPiiError'
    this.reason = reason
    this.statusCode = statusCode
  }
}
