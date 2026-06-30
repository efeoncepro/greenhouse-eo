/**
 * TASK-1282 — Commands gobernados de la conexión Search Console (Full API Parity).
 *
 * Flujo property-picker (estilo Semrush): el operador conecta su cuenta UNA vez
 * (un token de operador, NO per-org) → la app lista TODAS sus propiedades → el
 * operador elige cuál atar a cada org. El LLM NUNCA conecta directo: el loop
 * gobernado es start (consent) → callback humano → selectProperty. El token
 * (refresh) sólo se escribe a Secret Manager; PG guarda metadata + el ref.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { createOrAddSecretVersion, resolveSecretByRef } from '@/lib/secrets/secret-manager'

import { listSearchConsoleSiteOptions, SearchConsoleApiError } from './api-client'
import {
  disconnectSearchConsoleConnection,
  getSearchConsoleConnection,
  setSearchConsoleConnectionProperty,
  setSearchConsoleConnectionStatus,
  upsertPendingSearchConsoleConnection
} from './connection-store'
import {
  SEARCH_CONSOLE_SCOPE,
  type SearchConsoleCommandResult,
  type SearchConsoleSitesResult,
  type SelectSearchConsolePropertyResult
} from './contracts'
import { isSearchConsoleEnabled } from './flags'
import {
  buildConsentUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  resolveSearchConsoleOAuthConfig
} from './oauth-client'
import { buildOperatorSearchConsoleSecretId } from './secret-naming'
import { createSearchConsoleOAuthState, consumeSearchConsoleOAuthState } from './state-store'

export type StartSearchConsoleConnectionResult =
  | { ok: true; consentUrl: string }
  | { ok: false; errorCode: 'disabled' | 'not_configured' }

export interface StartSearchConsoleConnectionInput {
  organizationId: string
  userId: string | null
  returnToPath?: string | null
}

const isRevocationError = (error: unknown): boolean => {
  if (error instanceof SearchConsoleApiError) {
    return error.status === 401 || error.status === 403
  }

  const message = error instanceof Error ? error.message.toLowerCase() : ''

  return message.includes('invalid_grant') || message.includes('invalid grant')
}

const normalizeSite = (value: string) => value.trim().replace(/\/+$/, '')

/**
 * Inicia el flujo OAuth: crea el state single-use (ancla org + operador server-side)
 * y devuelve la consent URL de Google. Ya NO pide propiedad — la propiedad se elige
 * después del desplegable. La org NUNCA llega del browser sin validación (capability).
 */
export const startSearchConsoleConnection = async (
  input: StartSearchConsoleConnectionInput
): Promise<StartSearchConsoleConnectionResult> => {
  if (!isSearchConsoleEnabled()) {
    return { ok: false, errorCode: 'disabled' }
  }

  const config = await resolveSearchConsoleOAuthConfig()

  if (!config) {
    return { ok: false, errorCode: 'not_configured' }
  }

  const rawState = await createSearchConsoleOAuthState({
    organizationId: input.organizationId,
    createdByUserId: input.userId,
    returnToPath: input.returnToPath ?? null
  })

  return { ok: true, consentUrl: buildConsentUrl(config, rawState) }
}

/**
 * Completa el consentimiento desde el callback OAuth: intercambia el code por tokens,
 * guarda el refresh token en el secret de OPERADOR (un token reusable entre orgs) y
 * deja la conexión de la org en `pending` (token listo, propiedad SIN elegir). El
 * operador elegirá la propiedad del desplegable (selectSearchConsoleProperty).
 * Idempotente por state (single-use): un replay resuelve `state_invalid`.
 */
export const completeSearchConsoleConnection = async (input: {
  rawState: string
  code: string
}): Promise<SearchConsoleCommandResult> => {
  if (!isSearchConsoleEnabled()) {
    return { ok: false, errorCode: 'disabled' }
  }

  const state = await consumeSearchConsoleOAuthState(input.rawState)

  if (!state) {
    return { ok: false, errorCode: 'state_invalid' }
  }

  const config = await resolveSearchConsoleOAuthConfig()

  if (!config) {
    return { ok: false, errorCode: 'oauth_failed', returnToPath: state.returnToPath }
  }

  try {
    const tokens = await exchangeCodeForTokens(config, input.code)

    if (!tokens.refreshToken) {
      captureWithDomain(new Error('search console: code exchange sin refresh_token'), 'growth', {
        tags: { source: 'search_console_connect', stage: 'token_exchange' },
        extra: { organizationId: state.organizationId }
      })

      return { ok: false, errorCode: 'oauth_failed', returnToPath: state.returnToPath }
    }

    // Token de OPERADOR → Secret Manager (NUNCA a PG). Un token reusable entre orgs.
    const secretId = buildOperatorSearchConsoleSecretId(state.createdByUserId ?? state.organizationId)
    const secretResult = await createOrAddSecretVersion(secretId, tokens.refreshToken)

    if (!secretResult.ok) {
      captureWithDomain(new Error(`search console secret write failed: ${secretResult.errorCode}`), 'growth', {
        tags: { source: 'search_console_connect', stage: 'secret_write' },
        extra: { organizationId: state.organizationId, reason: secretResult.reason }
      })

      return { ok: false, errorCode: 'secret_write_failed', returnToPath: state.returnToPath }
    }

    const connection = await upsertPendingSearchConsoleConnection({
      organizationId: state.organizationId,
      scopes: tokens.scopes.length > 0 ? tokens.scopes : [SEARCH_CONSOLE_SCOPE],
      tokenSecretRef: secretResult.secretId,
      connectedByUserId: state.createdByUserId
    })

    return { ok: true, connection, returnToPath: state.returnToPath }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_connect', stage: 'oauth_callback' },
      extra: { organizationId: state.organizationId }
    })

    return { ok: false, errorCode: 'oauth_failed', returnToPath: state.returnToPath }
  }
}

/**
 * Lista las propiedades disponibles para la org (desplegable post-consentimiento).
 * Resuelve el token de operador de la conexión y llama `sites.list`. Honest
 * degradation: si el token fue revocado, marca la conexión y devuelve token_unhealthy.
 */
export const listSearchConsoleSitesForOrg = async (
  organizationId: string
): Promise<SearchConsoleSitesResult> => {
  if (!isSearchConsoleEnabled()) {
    return { ok: false, errorCode: 'disabled' }
  }

  const connection = await getSearchConsoleConnection(organizationId)

  if (!connection?.tokenSecretRef || connection.status === 'revoked') {
    return { ok: false, errorCode: 'not_connected' }
  }

  const config = await resolveSearchConsoleOAuthConfig()

  if (!config) {
    return { ok: false, errorCode: 'not_connected' }
  }

  const refreshToken = await resolveSecretByRef(connection.tokenSecretRef)

  if (!refreshToken) {
    await setSearchConsoleConnectionStatus(organizationId, 'revoked', 'token_secret_missing')

    return { ok: false, errorCode: 'token_unhealthy' }
  }

  try {
    const accessToken = await refreshAccessToken(config, refreshToken)
    const sites = await listSearchConsoleSiteOptions(accessToken)

    return { ok: true, sites }
  } catch (error) {
    if (isRevocationError(error)) {
      await setSearchConsoleConnectionStatus(organizationId, 'revoked', 'invalid_grant')

      return { ok: false, errorCode: 'token_unhealthy' }
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_list_sites', stage: 'sites_list' },
      extra: { organizationId }
    })

    return { ok: false, errorCode: 'query_failed' }
  }
}

/**
 * Ata la propiedad elegida del desplegable a la org. Verifica server-side que el token
 * realmente tenga acceso a esa propiedad (anti-binding de una propiedad ajena) y la
 * marca `active`. El LLM nunca elige: es una acción humana confirmada.
 */
export const selectSearchConsoleProperty = async (
  organizationId: string,
  siteUrl: string
): Promise<SelectSearchConsolePropertyResult> => {
  if (!isSearchConsoleEnabled()) {
    return { ok: false, errorCode: 'disabled' }
  }

  const listed = await listSearchConsoleSitesForOrg(organizationId)

  if (!listed.ok) {
    return { ok: false, errorCode: listed.errorCode === 'query_failed' ? 'token_unhealthy' : listed.errorCode }
  }

  const target = normalizeSite(siteUrl)
  const match = listed.sites.find(site => normalizeSite(site.siteUrl) === target)

  if (!match) {
    return { ok: false, errorCode: 'site_not_accessible' }
  }

  const connection = await setSearchConsoleConnectionProperty(organizationId, match.siteUrl)

  if (!connection) {
    return { ok: false, errorCode: 'not_connected' }
  }

  return { ok: true, connection }
}

/** Desconecta la propiedad de una org (status revoked + limpia ref). Idempotente. */
export const disconnectSearchConsoleProperty = async (
  organizationId: string
): Promise<SearchConsoleCommandResult> => {
  const connection = await getSearchConsoleConnection(organizationId)

  if (!connection) {
    return { ok: false, errorCode: 'not_connected' }
  }

  await disconnectSearchConsoleConnection(organizationId)
  const updated = await getSearchConsoleConnection(organizationId)

  return { ok: true, connection: updated ?? { ...connection, status: 'revoked', tokenSecretRef: null } }
}
