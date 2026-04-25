export type ApiPlatformErrorCode =
  | 'bad_request'
  | 'binding_not_active'
  | 'binding_not_found'
  | 'consumer_expired'
  | 'consumer_not_active'
  | 'forbidden'
  | 'internal_error'
  | 'invalid_identifier'
  | 'invalid_integration_keys'
  | 'invalid_token'
  | 'missing_external_scope_id'
  | 'missing_external_scope_type'
  | 'missing_token'
  | 'not_found'
  | 'rate_limited'
  | 'scope_not_allowed'
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
