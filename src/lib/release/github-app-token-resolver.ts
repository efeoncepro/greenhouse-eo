import 'server-only'

import { SignJWT, importPKCS8 } from 'jose'

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-849 Slice 7 (V1.1 robustness layer) — GitHub App installation token
 * resolver canonico.
 *
 * Switching del watchdog desde fine-grained PAT (V1.0) a GitHub App
 * installation token (V1.1) por decision arquitectonica del usuario:
 *   - Token NO ligado a usuario individual (sobrevive si la persona sale)
 *   - Rate limit per-installation (15K req/h) > rate limit per-user (5K req/h)
 *   - Required cuando emerge TASK-851 orchestrator (server-side dispatch)
 *   - Auditoria per-installation en GitHub UI
 *
 * **Cost impact**: $0 GitHub side (Apps son free); ~$0.72/anio GCP Secret
 * Manager para el private key. Effort: 2-3hrs setup one-time.
 *
 * **Token lifecycle**: installation tokens caducan a la 1h. Cache in-process
 * con renovacion 5min antes del expiry para evitar bursts de mint requests.
 *
 * **Degradacion canonica**: si GitHub App config faltante o JWT mint falla,
 * fallback al PAT (`GITHUB_RELEASE_OBSERVER_TOKEN` / `GITHUB_TOKEN`). NO
 * crashear — el watchdog debe seguir funcionando con la opcion menos privilege.
 *
 * Spec: docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9 +
 * docs/operations/runbooks/production-release-watchdog.md §8.1.
 */

interface InstallationTokenResponse {
  token: string
  expires_at: string
}

interface CachedInstallationToken {
  token: string
  /** Epoch ms cuando el token expira realmente. */
  expiresAtMs: number
  /** Epoch ms cuando consideramos el token "stale" para renovar proactivo. */
  staleAtMs: number
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 min antes del expiry
const JWT_TIMEOUT_MS = 10_000

const APP_ID_ENV = 'GITHUB_APP_ID'
const INSTALLATION_ID_ENV = 'GITHUB_APP_INSTALLATION_ID'
const PRIVATE_KEY_SECRET_REF_ENV = 'GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF'

/**
 * Cache global del installation token. Vive el tiempo del Lambda/Vercel
 * function instance — en cold-start se mintea un token nuevo.
 *
 * En CI runner (single-shot) el cache no agrega valor pero tampoco hace daño.
 */
let cachedToken: CachedInstallationToken | null = null

/**
 * ¿Existen las 3 env vars requeridas para GH App?
 * Si alguna falta, retorna false y el caller debe fallback a PAT.
 */
export const isGithubAppConfigured = (): boolean => {
  return Boolean(
    process.env[APP_ID_ENV] &&
      process.env[INSTALLATION_ID_ENV] &&
      process.env[PRIVATE_KEY_SECRET_REF_ENV]
  )
}

/**
 * Mint JWT firmado con el private key del GitHub App.
 * JWT vive solo 9 minutos (max permitido por GitHub: 10 min). Despues
 * lo usamos para mintar el installation token (1h).
 *
 * Algoritmo: RS256 con private key PEM (PKCS8) del App.
 */
const mintAppJwt = async (appId: string, privateKeyPem: string): Promise<string> => {
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')
  const nowSec = Math.floor(Date.now() / 1000)

  // GitHub recomienda iat 60s en el pasado para clock skew tolerance.
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(nowSec - 60)
    .setExpirationTime(nowSec + 9 * 60) // 9 min
    .setIssuer(appId)
    .sign(privateKey)

  return jwt
}

/**
 * Mint installation token (1h TTL) usando el JWT del App.
 * POST /app/installations/<id>/access_tokens
 */
const mintInstallationToken = async (
  jwt: string,
  installationId: string
): Promise<InstallationTokenResponse> => {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), JWT_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${jwt}`,
        'User-Agent': 'greenhouse-release-observer'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')

      throw new Error(
        `GitHub App installation token mint returned ${response.status} ${response.statusText}: ${body.slice(0, 200)}`
      )
    }

    return (await response.json()) as InstallationTokenResponse
  } finally {
    clearTimeout(timeout)
  }
}

const isCacheValid = (): boolean => {
  if (!cachedToken) return false

  return Date.now() < cachedToken.staleAtMs
}

/**
 * Reset cache. Util para tests o cuando se rota private key.
 */
export const __resetGithubAppTokenCache = (): void => {
  cachedToken = null
}

/**
 * Resuelve installation token con cache + renovacion proactiva.
 *
 * Flow:
 *   1. Si cache valido (>5min antes de expiry), retorna cached.
 *   2. Sino, mint JWT firmado con private key.
 *   3. POST a installation endpoint, recibe access token.
 *   4. Guarda en cache con `staleAtMs = expiresAtMs - 5min`.
 *
 * Returns null si GH App no configurado o falla — caller fallback a PAT.
 */
export const resolveGithubAppInstallationToken = async (): Promise<string | null> => {
  if (!isGithubAppConfigured()) {
    return null
  }

  if (isCacheValid()) {
    return cachedToken!.token
  }

  const appId = process.env[APP_ID_ENV]!
  const installationId = process.env[INSTALLATION_ID_ENV]!
  const privateKeySecretRef = process.env[PRIVATE_KEY_SECRET_REF_ENV]!

  try {
    const privateKeyPem = await resolveSecretByRef(privateKeySecretRef)

    if (!privateKeyPem || !privateKeyPem.trim().startsWith('-----BEGIN')) {
      throw new Error(
        `GitHub App private key from secret '${privateKeySecretRef}' is not valid PEM`
      )
    }

    const jwt = await mintAppJwt(appId, privateKeyPem)
    const tokenResponse = await mintInstallationToken(jwt, installationId)
    const expiresAtMs = new Date(tokenResponse.expires_at).getTime()

    cachedToken = {
      token: tokenResponse.token,
      expiresAtMs,
      staleAtMs: expiresAtMs - TOKEN_REFRESH_BUFFER_MS
    }

    return cachedToken.token
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: {
        source: 'github_app_token_resolver',
        stage: 'mint_installation_token'
      },
      extra: {
        appId,
        installationId,
        privateKeySecretRef
      }
    })

    // Fallback path: caller debe usar PAT como degraded mode.
    return null
  }
}
