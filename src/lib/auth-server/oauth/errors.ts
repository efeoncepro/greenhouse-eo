/**
 * Errores OAuth estándar del emisor (RFC 6749 §4.1.2.1/§5.2, RFC 7591 §3.2.2, RFC 7009, RFC 7662,
 * OIDC Core §3.1.2.6). El cliente sólo ve `error` + `error_description` terso; el detalle interno va a
 * `captureWithDomain`, nunca al wire.
 */

export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error'
  | 'temporarily_unavailable'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'
  | 'invalid_token'
  | 'unsupported_token_type'
  | 'login_required'
  | 'consent_required'
  | 'interaction_required'
  | 'slow_down'

const DEFAULT_STATUS: Record<OAuthErrorCode, number> = {
  invalid_request: 400,
  invalid_client: 401,
  invalid_grant: 400,
  unauthorized_client: 400,
  unsupported_grant_type: 400,
  unsupported_response_type: 400,
  invalid_scope: 400,
  access_denied: 403,
  server_error: 500,
  temporarily_unavailable: 503,
  invalid_redirect_uri: 400,
  invalid_client_metadata: 400,
  invalid_token: 401,
  unsupported_token_type: 400,
  login_required: 401,
  consent_required: 403,
  interaction_required: 403,
  slow_down: 429
}

export class OAuthProtocolError extends Error {
  readonly code: OAuthErrorCode
  readonly statusCode: number
  readonly description: string | null
  /** Motivo interno (nunca al cliente); útil para audit/signals. */
  readonly reason: string | null
  /** `true` cuando el error puede devolverse al `redirect_uri` (RFC 6749 §4.1.2.1). */
  readonly redirectable: boolean

  constructor(
    code: OAuthErrorCode,
    options: { description?: string; statusCode?: number; reason?: string; redirectable?: boolean } = {}
  ) {
    super(options.description ?? code)
    this.name = 'OAuthProtocolError'
    this.code = code
    this.statusCode = options.statusCode ?? DEFAULT_STATUS[code]
    this.description = options.description ?? null
    this.reason = options.reason ?? null
    this.redirectable = options.redirectable ?? false
  }

  toBody(): { error: OAuthErrorCode; error_description?: string } {
    return this.description ? { error: this.code, error_description: this.description } : { error: this.code }
  }
}

export const isOAuthProtocolError = (value: unknown): value is OAuthProtocolError =>
  value instanceof OAuthProtocolError ||
  (typeof value === 'object' && value !== null && (value as { name?: string }).name === 'OAuthProtocolError')
