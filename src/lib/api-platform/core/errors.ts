export type ApiPlatformErrorCode =
  | 'ambiguous_reference'
  | 'bad_request'
  | 'binding_not_active'
  | 'binding_not_found'
  | 'consumer_expired'
  | 'consumer_not_active'
  | 'forbidden'
  | 'idempotency_conflict'
  | 'idempotency_in_progress'
  | 'internal_error'
  | 'invalid_identifier'
  | 'invalid_integration_keys'
  | 'invalid_refresh_token'
  | 'invalid_session'
  | 'invalid_token'
  | 'kortex_binding_missing'
  | 'kortex_admin_command_disabled'
  | 'kortex_admin_confirmation_required'
  | 'kortex_command_adapter_disabled'
  | 'kortex_confirmation_required'
  | 'kortex_live_execute_disabled'
  | 'kortex_portal_mismatch'
  | 'kortex_preflight_failed'
  | 'kortex_preview_required'
  | 'kortex_github_command_disabled'
  | 'kortex_github_command_not_allowed'
  | 'kortex_github_confirmation_required'
  | 'kortex_github_preflight_failed'
  | 'kortex_github_upstream_failed'
  | 'kortex_upstream_timeout'
  | 'kortex_upstream_unauthorized'
  | 'public_site_github_command_disabled'
  | 'public_site_github_command_not_allowed'
  | 'public_site_github_confirmation_required'
  | 'public_site_github_preflight_failed'
  | 'public_site_github_upstream_failed'
  | 'missing_external_scope_id'
  | 'missing_external_scope_type'
  | 'missing_session'
  | 'missing_token'
  | 'not_found'
  | 'rate_limited'
  | 'scope_not_allowed'
  | 'session_revoked'
  | 'unsupported_api_version'

export class ApiPlatformError extends Error {
  statusCode: number
  errorCode: ApiPlatformErrorCode
  details: Record<string, unknown> | null

  constructor(
    message: string,
    options?: {
      statusCode?: number
      errorCode?: ApiPlatformErrorCode
      details?: Record<string, unknown> | null
    }
  ) {
    super(message)
    this.name = 'ApiPlatformError'
    this.statusCode = options?.statusCode ?? 400
    this.errorCode = options?.errorCode ?? 'bad_request'
    this.details = options?.details ?? null
  }
}

export const normalizeApiPlatformError = (error: unknown) => {
  if (error instanceof ApiPlatformError) {
    return error
  }

  return new ApiPlatformError('Internal server error', {
    statusCode: 500,
    errorCode: 'internal_error'
  })
}
