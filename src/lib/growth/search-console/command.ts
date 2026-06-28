/**
 * TASK-1282 — Commands gobernados de la conexión Search Console (Full API Parity).
 *
 * Un primitive, muchos consumers (route admin v1, UI follow-up, Nexa/MCP). El LLM
 * NUNCA conecta directo: el loop gobernado es start (consent) → callback humano
 * (complete). El token (refresh) sólo se escribe a Secret Manager; PG guarda metadata.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { createOrAddSecretVersion } from '@/lib/secrets/secret-manager'

import { tokenCanAccessSite } from './api-client'
import {
  disconnectSearchConsoleConnection,
  getSearchConsoleConnection,
  upsertActiveSearchConsoleConnection
} from './connection-store'
import { SEARCH_CONSOLE_SCOPE, type SearchConsoleCommandResult } from './contracts'
import { isSearchConsoleEnabled } from './flags'
import {
  buildConsentUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  resolveSearchConsoleOAuthConfig
} from './oauth-client'
import { buildSearchConsoleSecretId } from './secret-naming'
import { createSearchConsoleOAuthState, consumeSearchConsoleOAuthState } from './state-store'

export type StartSearchConsoleConnectionResult =
  | { ok: true; consentUrl: string }
  | { ok: false; errorCode: 'disabled' | 'not_configured' }

export interface StartSearchConsoleConnectionInput {
  organizationId: string
  siteUrl: string
  userId: string | null
}

/**
 * Inicia el flujo OAuth: crea el state single-use (ancla org+site server-side) y
 * devuelve la consent URL de Google. Capability-gated en la route. La org NUNCA
 * llega desde el browser sin validación: el caller la resuelve (admin = param
 * gobernado validado; client-portal = sesión).
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
    siteUrl: input.siteUrl,
    createdByUserId: input.userId
  })

  return { ok: true, consentUrl: buildConsentUrl(config, rawState) }
}

/**
 * Completa la conexión desde el callback OAuth. La org + site provienen del state
 * consumido (server-side), NUNCA del browser. Idempotente por state (single-use):
 * un replay del mismo `state` resuelve `state_invalid`.
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
    return { ok: false, errorCode: 'oauth_failed' }
  }

  try {
    const tokens = await exchangeCodeForTokens(config, input.code)

    if (!tokens.refreshToken) {
      // Sin refresh token no podemos leer en el futuro (debería venir por prompt=consent).
      captureWithDomain(new Error('search console: code exchange sin refresh_token'), 'growth', {
        tags: { source: 'search_console_connect', stage: 'token_exchange' },
        extra: { organizationId: state.organizationId }
      })

      return { ok: false, errorCode: 'oauth_failed' }
    }

    // Verificación de propiedad: el token DEBE poder ver la propiedad elegida.
    const accessToken = tokens.accessToken ?? (await refreshAccessToken(config, tokens.refreshToken))
    const canAccess = await tokenCanAccessSite(accessToken, state.siteUrl)

    if (!canAccess) {
      return { ok: false, errorCode: 'site_not_accessible' }
    }

    // Token → Secret Manager (NUNCA a PG). Honest degradation si el grant IAM falta.
    const secretId = buildSearchConsoleSecretId(state.organizationId)
    const secretResult = await createOrAddSecretVersion(secretId, tokens.refreshToken)

    if (!secretResult.ok) {
      captureWithDomain(new Error(`search console secret write failed: ${secretResult.errorCode}`), 'growth', {
        tags: { source: 'search_console_connect', stage: 'secret_write' },
        extra: { organizationId: state.organizationId, reason: secretResult.reason }
      })

      return { ok: false, errorCode: 'secret_write_failed' }
    }

    const connection = await upsertActiveSearchConsoleConnection({
      organizationId: state.organizationId,
      siteUrl: state.siteUrl,
      scopes: tokens.scopes.length > 0 ? tokens.scopes : [SEARCH_CONSOLE_SCOPE],
      tokenSecretRef: secretResult.secretId,
      connectedByUserId: state.createdByUserId
    })

    return { ok: true, connection }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'search_console_connect', stage: 'oauth_callback' },
      extra: { organizationId: state.organizationId }
    })

    return { ok: false, errorCode: 'oauth_failed' }
  }
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
