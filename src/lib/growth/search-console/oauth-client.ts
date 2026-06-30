/**
 * TASK-1282 — Google OAuth 3-legged client para Search Console.
 *
 * `src/lib/google-credentials.ts` es server-to-server (WIF/ADC) — NO sirve para el
 * flujo de usuario. Acá usamos `OAuth2Client` de `google-auth-library` (ya dep) para:
 *   - generar la consent URL (`access_type=offline` + `prompt=consent` → refresh token),
 *   - intercambiar el `code` por tokens,
 *   - refrescar un access token desde el refresh token (reader, Slice 2).
 *
 * El client id/secret se resuelven server-side (Secret Manager-first). El redirect
 * URI debe coincidir EXACTO con el registrado en el OAuth client de Google.
 */

import 'server-only'

import { OAuth2Client } from 'google-auth-library'

import { resolveGreenhouseBaseUrl } from '@/lib/navigation/deep-links/base-url'
import { resolveSecret } from '@/lib/secrets/secret-manager'

import { SEARCH_CONSOLE_SCOPE } from './contracts'

const OAUTH_CALLBACK_PATH = '/api/admin/growth/search-console/oauth/callback'

export interface SearchConsoleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/** Resuelve la config OAuth; `null` si falta client id/secret (no configurado). */
export const resolveSearchConsoleOAuthConfig = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<SearchConsoleOAuthConfig | null> => {
  const clientIdResolution = await resolveSecret({
    envVarName: 'GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID',
    secretRefEnvVarName: 'GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID_SECRET_REF',
    env
  })

  const clientSecretResolution = await resolveSecret({
    envVarName: 'GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET',
    secretRefEnvVarName: 'GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF',
    env
  })

  const clientId = clientIdResolution.value?.trim()
  const clientSecret = clientSecretResolution.value?.trim()

  if (!clientId || !clientSecret) {
    return null
  }

  const explicitRedirect = env.GOOGLE_SEARCH_CONSOLE_OAUTH_REDIRECT_URI?.trim()
  const redirectUri = explicitRedirect || `${resolveGreenhouseBaseUrl({ env })}${OAUTH_CALLBACK_PATH}`

  return { clientId, clientSecret, redirectUri }
}

const buildClient = (config: SearchConsoleOAuthConfig): OAuth2Client =>
  new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri
  })

/**
 * Construye la consent URL de Google. `state` es el token random single-use cuyo
 * hash + binding org viven server-side (ver state-store).
 */
export const buildConsentUrl = (config: SearchConsoleOAuthConfig, state: string): string =>
  buildClient(config).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [SEARCH_CONSOLE_SCOPE],
    include_granted_scopes: false,
    state
  })

export interface SearchConsoleTokenExchange {
  refreshToken: string | null
  accessToken: string | null
  scopes: string[]
}

/** Intercambia el `code` por tokens. Lanza si Google rechaza. */
export const exchangeCodeForTokens = async (
  config: SearchConsoleOAuthConfig,
  code: string
): Promise<SearchConsoleTokenExchange> => {
  const client = buildClient(config)
  const { tokens } = await client.getToken(code)
  const scopes = typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/).filter(Boolean) : []


  return {
    refreshToken: tokens.refresh_token ?? null,
    accessToken: tokens.access_token ?? null,
    scopes
  }
}

/**
 * Obtiene un access token fresco desde el refresh token per-org. Lanza si Google
 * responde `invalid_grant` (revocado) — el reader lo traduce a honest degradation.
 */
export const refreshAccessToken = async (
  config: SearchConsoleOAuthConfig,
  refreshToken: string
): Promise<string> => {
  const client = buildClient(config)

  client.setCredentials({ refresh_token: refreshToken })
  const { token } = await client.getAccessToken()

  if (!token) {
    throw new Error('TASK-1282: Google no devolvió un access token al refrescar')
  }


  return token
}
