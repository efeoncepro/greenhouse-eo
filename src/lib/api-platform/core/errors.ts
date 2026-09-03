export type ApiPlatformErrorCode =
  | 'ambiguous_reference'
  | 'bad_request'
  | 'binding_not_active'
  | 'binding_not_found'
  | 'consumer_expired'
  | 'consumer_not_active'
  | 'forbidden'
  // TASK-1773 — los TRES 409 del carril de desenlace, cada uno con su código. Aplanarlos a uno fue un
  // defecto real de la primera versión de este adaptador, y es la misma clase que TASK-1751 corrigió del
  // lado del candidato: cinco causas rindiendo un mensaje. Cada una tiene una acción distinta.
  //   · la propuesta caducó (alguien decidió/archivó entre `propose` y `confirm`) → volver a proponer
  //   · misma clave de idempotencia con otro payload → NO es replay, es conflicto: revisar qué se manda
  //   · la vacante ya está cerrada/cancelada → seleccionar ahí es imposible, no hay reintento que sirva
  | 'hiring_decision_proposal_stale'
  | 'hiring_decision_idempotency_conflict'
  | 'hiring_opening_not_open_for_decision'
  | 'idempotency_conflict'
  | 'idempotency_in_progress'
  | 'internal_error'
  | 'invalid_identifier'
  | 'invalid_delegated_context'
  | 'invalid_integration_keys'
  | 'invalid_refresh_token'
  | 'invalid_session'
  | 'invalid_token'
  // ISSUE-153 — contrato multi-mercado del lane SEO: la org tiene N mercados activos y el
  // request no eligió (`multiple_markets`), o eligió uno que no existe (`market_not_found`).
  | 'market_not_found'
  | 'multiple_markets'
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
  // TASK-1349 — carril app de revisión de offboarding: dos 409 con acción distinta.
  //   · la pantalla está desactualizada → recargar y volver a revisar
  //   · el caso nació de una señal de acceso y nadie lo ha revisado → revisar antes de aprobar
  | 'offboarding_case_version_conflict'
  | 'offboarding_case_review_required'
  | 'rate_limited'
  | 'scope_not_allowed'
  | 'session_revoked'
  | 'service_unavailable'
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
