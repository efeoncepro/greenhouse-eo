import 'server-only'

import { getAuthReadinessSnapshot, type AuthReadinessSnapshot } from '@/lib/auth/readiness'
import { validateSecretFormat } from '@/lib/secrets/format-validators'
import { resolveSecret, type SecretResolution } from '@/lib/secrets/secret-manager'

// TASK-765 follow-up — eliminamos top-level await para preservar
// compatibilidad con tsx --require CJS shim (rompiendo tsx CLI scripts
// post-TASK-742). El comportamiento canonico de TASK-742 (resolucion
// from Secret Manager + env fallback + readiness check) se preserva via
// una promesa memoizada que es awaiteada por getCurrentAuthReadiness()
// y por el endpoint /api/auth/health.
//
// **Sync API contract preservado:** getNextAuthSecret(), getAzureAdClientSecret(),
// getGoogleClientSecret(), hasMicrosoftAuthProvider(), hasGoogleAuthProvider()
// son sync. Fast-path lee `process.env` directo (99% del trafico de
// produccion donde los secrets se inyectan via Vercel env). Slow-path lee
// del cache Secret Manager si fue resuelto async (typically resuelto
// during Next.js startup via la primera llamada a getCurrentAuthReadiness()
// hecha desde middleware o auth options).

interface AuthSecretsResolution {
  nextAuth: SecretResolution
  azureAdClient: SecretResolution
  googleClient: SecretResolution
}

let cachedAuthSecrets: AuthSecretsResolution | null = null
let inFlightResolution: Promise<AuthSecretsResolution> | null = null

const resolveAuthSecretsInternal = async (): Promise<AuthSecretsResolution> => {
  if (cachedAuthSecrets) return cachedAuthSecrets
  if (inFlightResolution) return inFlightResolution

  inFlightResolution = (async () => {
    const [nextAuthSecret, azureAdClientSecret, googleClientSecret] = await Promise.all([
      resolveSecret({ envVarName: 'NEXTAUTH_SECRET' }),
      resolveSecret({ envVarName: 'AZURE_AD_CLIENT_SECRET' }),
      resolveSecret({ envVarName: 'GOOGLE_CLIENT_SECRET' })
    ])

    cachedAuthSecrets = {
      nextAuth: nextAuthSecret,
      azureAdClient: azureAdClientSecret,
      googleClient: googleClientSecret
    }

    return cachedAuthSecrets
  })()

  return inFlightResolution
}

/**
 * **Public:** dispara la resolucion async de los 3 secrets canonicos.
 * Idempotente: re-llamar reusa el cache. Llamar al menos una vez durante
 * Next.js startup (typically via getCurrentAuthReadiness()) garantiza que
 * los sync getters tengan datos fresh post-Secret-Manager.
 */
export const ensureAuthSecretsResolved = (): Promise<AuthSecretsResolution> =>
  resolveAuthSecretsInternal()

/**
 * **Public:** acceso directo al cache de secrets. Si el cache no fue
 * poblado todavia, devuelve null en lugar de await — para callers que ya
 * estan en async context y prefieren manejar el caso themselves.
 */
export const peekAuthSecretsCache = (): AuthSecretsResolution | null => cachedAuthSecrets

/**
 * TASK-742 Capa 2 — Compute the readiness snapshot using the same secrets
 * the providers use. Cached 30s in `getAuthReadinessSnapshot`. Esta funcion
 * dispara la resolucion lazy del cache y luego pasa los valores al snapshot.
 */
export const getCurrentAuthReadiness = async (): Promise<AuthReadinessSnapshot> => {
  const secrets = await resolveAuthSecretsInternal()

  return getAuthReadinessSnapshot({
    azureAdClientSecret: secrets.azureAdClient.value,
    googleClientSecret: secrets.googleClient.value,
    nextAuthSecret: secrets.nextAuth.value
  })
}

const readSyncSecret = (envVarName: string, cacheKey: keyof AuthSecretsResolution): string | null => {
  // 1. Fast path: env var directa (Vercel inyecta secrets aqui).
  const envValue = process.env[envVarName]?.trim()

  if (envValue) return envValue

  // 2. Slow path: cache poblado via async resolver (post-startup).
  if (cachedAuthSecrets) {
    return cachedAuthSecrets[cacheKey].value?.trim() || null
  }

  // 3. Trigger background resolve para que el siguiente call (post-Secret
  //    Manager) tenga el valor cacheado. NO awaiteamos aqui — sync getters
  //    deben permanecer sync.
  resolveAuthSecretsInternal().catch(() => {
    // Silenciado — el caller veria null desde el cache si la resolucion
    // falla; observability via getCurrentAuthReadiness() captura el detalle.
  })

  return null
}

export const getNextAuthSecret = () => {
  const secret = readSyncSecret('NEXTAUTH_SECRET', 'nextAuth')

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set')
  }

  return secret
}

export const getAzureAdClientSecret = () => readSyncSecret('AZURE_AD_CLIENT_SECRET', 'azureAdClient')

export const getGoogleClientSecret = () => readSyncSecret('GOOGLE_CLIENT_SECRET', 'googleClient')

export const hasMicrosoftAuthProvider = () =>
  Boolean(
    process.env.AZURE_AD_CLIENT_ID?.trim() &&
      validateSecretFormat('AZURE_AD_CLIENT_ID', process.env.AZURE_AD_CLIENT_ID.trim()).ok &&
      getAzureAdClientSecret()
  )

export const hasGoogleAuthProvider = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      validateSecretFormat('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID.trim()).ok &&
      getGoogleClientSecret()
  )
