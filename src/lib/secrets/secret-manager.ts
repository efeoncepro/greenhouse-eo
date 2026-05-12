import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

import { createGoogleAuth, getGoogleProjectId } from '@/lib/google-credentials'
import {
  isKnownSecretFormat,
  summarizeFormatViolation,
  validateSecretFormat,
  type SecretFormatViolation
} from '@/lib/secrets/format-validators'

export type SecretResolutionSource = 'secret_manager' | 'env' | 'unconfigured'

export interface SecretResolution {
  source: SecretResolutionSource
  value: string | null
  envVarName: string
  secretRefEnvVarName: string
  secretRef: string | null
  /** TASK-742 — populated when the payload was rejected by format validation. */
  formatViolations?: SecretFormatViolation[]
}

type SecretResolutionOptions = {
  envVarName: string
  secretRefEnvVarName?: string
  env?: NodeJS.ProcessEnv
  cacheTtlMs?: number
}

type CachedSecretResolution = SecretResolution & {
  expiresAt: number
}

declare global {
   
  var __greenhouseSecretManagerClient: SecretManagerServiceClient | undefined
   
  var __greenhouseSecretResolutionCache: Map<string, CachedSecretResolution> | undefined
}

const DEFAULT_CACHE_TTL_MS = 60_000

const SECRET_MANAGER_SCOPES = ['https://www.googleapis.com/auth/cloud-platform']

const getSecretManagerClient = () => {
  globalThis.__greenhouseSecretManagerClient ??= new SecretManagerServiceClient({
    auth: createGoogleAuth({
      scopes: SECRET_MANAGER_SCOPES
    })
  })

  return globalThis.__greenhouseSecretManagerClient
}

const getSecretResolutionCache = () => {
  globalThis.__greenhouseSecretResolutionCache ??= new Map()

  return globalThis.__greenhouseSecretResolutionCache
}

const getSecretRefEnvVarName = (envVarName: string, provided?: string) => provided || `${envVarName}_SECRET_REF`

/**
 * TASK-870 — Single-source-of-truth para higiene de env var values consumidos
 * como secret references o secret content. Aplica el contrato canónico:
 *
 *   trim → strip surrounding quotes → strip trailing literal `\r`/`\n` y reales → trim
 *
 * Cierra el bug class detectado live 2026-05-12 donde `normalizeSecretRefValue`
 * (legacy) NO strippa comillas envolventes y el `normalizeSecretRef` downstream
 * construía paths como `projects/.../secrets/"name"/versions/latest` → GCP
 * NOT_FOUND → fallback silencioso → "is not valid PEM" en Sentry.
 *
 * NO loggear `value` ni el sanitized result (puede contener PII / leak de
 * secret content). Solo length + boolean flags si se necesita observability.
 */
const stripEnvVarContamination = (value: string | undefined): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const withoutQuotes = trimmed.replace(/^['"]+|['"]+$/g, '').trim()
  const withoutLiteralLineEndings = withoutQuotes.replace(/(?:\\r|\\n|\r|\n)+/g, '').trim()

  return withoutLiteralLineEndings ? withoutLiteralLineEndings : null
}

const normalizeSecretValue = (value: string | undefined) => stripEnvVarContamination(value)

/**
 * TASK-870 — Shape canónico para el VALOR de un `*_SECRET_REF` env var.
 *
 * Acepta las 3 formas documentadas en CLAUDE.md "Secret Manager Hygiene":
 *   1. bare name             `greenhouse-github-app-private-key`
 *   2. shorthand             `greenhouse-github-app-private-key:42`
 *   3. full path             `projects/<project>/secrets/<name>/versions/<version>`
 *
 * Sin Capa 2 (esta regex), payloads contaminados que sobrevivan a la limpieza
 * (quotes embebidos en el medio, whitespace interno, characters fuera del set
 * permitido por GCP Secret Manager grammar) caerían al cliente GCP y producirían
 * un NOT_FOUND silencioso. Rechazar en el boundary garantiza que ningún consumer
 * downstream vea un ref malformado.
 */
const SECRET_REF_SHAPE =
  /^(?:[A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?|projects\/[A-Za-z0-9_-]+\/secrets\/[A-Za-z0-9_-]+(?:\/versions\/(?:latest|\d+))?)$/

const normalizeSecretRefValue = (value: string | undefined) => {
  const sanitized = stripEnvVarContamination(value)

  if (!sanitized) {
    return null
  }

  if (!SECRET_REF_SHAPE.test(sanitized)) {
    console.warn('[secrets] Secret ref failed canonical shape validation; rejecting.', {
      sanitizedLength: sanitized.length,
      firstChar: sanitized[0],
      lastChar: sanitized[sanitized.length - 1]
    })

    return null
  }

  return sanitized
}

/**
 * TASK-870 — Predicate exportable para uso desde reliability signals y
 * scripts de auditoría externos. Sigue la misma regla que el normalizer
 * canónico (post-strip + shape regex).
 */
export const isCanonicalSecretRefShape = (value: string | undefined): boolean => {
  return normalizeSecretRefValue(value) !== null
}

const normalizeSecretRef = (ref: string, env: NodeJS.ProcessEnv) => {
  const trimmed = ref.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.includes('/versions/')) {
    return trimmed
  }

  if (trimmed.startsWith('projects/')) {
    return `${trimmed}/versions/latest`
  }

  // Soporta shorthand `<secret-name>:<version>` (formato Vercel env display +
  // gcloud convention). Convierte a path canonico `/versions/<version>`.
  // Sin shorthand, default a 'latest'. Grammar Google secret names:
  // letters/digits/dash/underscore.
  const projectId = getGoogleProjectId(env)
  const colonMatch = trimmed.match(/^([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/)

  if (colonMatch) {
    return `projects/${projectId}/secrets/${colonMatch[1]}/versions/${colonMatch[2]}`
  }

  return `projects/${projectId}/secrets/${trimmed}/versions/latest`
}

const getCacheKey = ({
  envVarName,
  secretRefEnvVarName,
  env
}: {
  envVarName: string
  secretRefEnvVarName: string
  env: NodeJS.ProcessEnv
}) => {
  const envValue = normalizeSecretValue(env[envVarName])
  const secretRefValue = normalizeSecretRefValue(env[secretRefEnvVarName])

  return `${envVarName}|${secretRefEnvVarName}|${envValue ? 'env' : 'no-env'}|${secretRefValue || 'no-secret-ref'}`
}

const readSecretFromSecretManager = async ({
  normalizedSecretRef,
  envVarName
}: {
  normalizedSecretRef: string
  envVarName: string
}) => {
  try {
    const [version] = await getSecretManagerClient().accessSecretVersion({
      name: normalizedSecretRef
    })

    const value = normalizeSecretValue(version.payload?.data?.toString('utf8'))

    if (!value) {
      console.warn(`[secrets] Secret Manager returned an empty payload for ${envVarName}.`, {
        secretRef: normalizedSecretRef
      })

      return null
    }

    return value
  } catch (error) {
    console.warn(`[secrets] Secret Manager lookup failed for ${envVarName}; falling back without exposing the secret value.`, {
      secretRef: normalizedSecretRef,
      error: error instanceof Error ? error.message : 'unknown_error'
    })

    return null
  }
}

export const clearSecretManagerResolutionCache = () => {
  getSecretResolutionCache().clear()
}

type SecretByRefOptions = {
  env?: NodeJS.ProcessEnv
  cacheTtlMs?: number
}

export const resolveSecretByRef = async (
  secretRef: string,
  options: SecretByRefOptions = {}
): Promise<string | null> => {
  const { env = process.env, cacheTtlMs = DEFAULT_CACHE_TTL_MS } = options
  const sanitized = normalizeSecretRefValue(secretRef)

  if (!sanitized) {
    return null
  }

  let normalizedSecretRef: string

  try {
    const ref = normalizeSecretRef(sanitized, env)

    if (!ref) {
      return null
    }

    normalizedSecretRef = ref
  } catch (error) {
    console.warn('[secrets] Secret ref normalization failed for direct lookup; not exposing the secret value.', {
      error: error instanceof Error ? error.message : 'unknown_error'
    })

    return null
  }

  const cacheKey = `direct-ref|${normalizedSecretRef}`
  const cache = getSecretResolutionCache()
  const now = Date.now()
  const cached = cache.get(cacheKey)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const value = await readSecretFromSecretManager({
    normalizedSecretRef,
    envVarName: `<direct-ref:${sanitized}>`
  })

  cache.set(cacheKey, {
    source: value ? 'secret_manager' : 'unconfigured',
    value,
    envVarName: `<direct-ref:${sanitized}>`,
    secretRefEnvVarName: '',
    secretRef: normalizedSecretRef,
    expiresAt: now + cacheTtlMs
  })

  return value
}

export const resolveSecret = async ({
  envVarName,
  secretRefEnvVarName,
  env = process.env,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS
}: SecretResolutionOptions): Promise<SecretResolution> => {
  const resolvedSecretRefEnvVarName = getSecretRefEnvVarName(envVarName, secretRefEnvVarName)

  const cacheKey = getCacheKey({
    envVarName,
    secretRefEnvVarName: resolvedSecretRefEnvVarName,
    env
  })

  const cache = getSecretResolutionCache()
  const now = Date.now()
  const cached = cache.get(cacheKey)

  if (cached && cached.expiresAt > now) {
    return cached
  }

  const envValue = normalizeSecretValue(env[envVarName])
  const secretRef = normalizeSecretRefValue(env[resolvedSecretRefEnvVarName])
  let normalizedSecretRef: string | null = null

  if (secretRef) {
    try {
      normalizedSecretRef = normalizeSecretRef(secretRef, env)
    } catch (error) {
      console.warn(`[secrets] Secret ref normalization failed for ${envVarName}; falling back without exposing the secret value.`, {
        secretRefEnvVarName: resolvedSecretRefEnvVarName,
        error: error instanceof Error ? error.message : 'unknown_error'
      })
    }
  }

  let resolution: SecretResolution = {
    source: 'unconfigured',
    value: null,
    envVarName,
    secretRefEnvVarName: resolvedSecretRefEnvVarName,
    secretRef: normalizedSecretRef
  }

  if (normalizedSecretRef) {
    const secretManagerValue = await readSecretFromSecretManager({
      normalizedSecretRef,
      envVarName
    })

    if (secretManagerValue) {
      resolution = {
        ...resolution,
        source: 'secret_manager',
        value: secretManagerValue
      }
    }
  }

  if (resolution.source === 'unconfigured' && envValue) {
    resolution = {
      ...resolution,
      source: 'env',
      value: envValue
    }
  }

  // TASK-742 Capa 1 — Reject malformed payloads before they reach runtime.
  // Format validators only fire for known critical secrets (NEXTAUTH_SECRET,
  // AZURE_AD_CLIENT_SECRET, etc.). Unknown secrets get a basic hygiene check
  // only (no length/charset enforcement, see format-validators.ts).
  if (resolution.value && isKnownSecretFormat(envVarName)) {
    const formatResult = validateSecretFormat(envVarName, resolution.value)

    if (!formatResult.ok) {
      console.warn(
        `[secrets] Format validation failed for ${envVarName}; rejecting payload without exposing value.`,
        summarizeFormatViolation(envVarName, formatResult)
      )

      resolution = {
        ...resolution,
        source: 'unconfigured',
        value: null,
        formatViolations: formatResult.violations
      }
    }
  }

  // TASK-742 Capa 1 — Telemetry: emit a domain=identity warning when a critical
  // secret silently falls back to env (signals SECRET_REF is broken in prod).
  if (
    resolution.source === 'env' &&
    isKnownSecretFormat(envVarName) &&
    process.env.NODE_ENV === 'production'
  ) {
    console.warn(
      `[secrets] Critical secret ${envVarName} resolved from process.env in production (SECRET_REF unavailable). Investigate Secret Manager.`,
      {
        envVarName,
        secretRefEnvVarName: resolvedSecretRefEnvVarName,
        secretRefConfigured: Boolean(secretRef)
      }
    )
  }

  cache.set(cacheKey, {
    ...resolution,
    expiresAt: now + cacheTtlMs
  })

  return resolution
}

export const getSecretSource = async (options: SecretResolutionOptions) => {
  const resolution = await resolveSecret(options)

  return {
    source: resolution.source,
    envVarName: resolution.envVarName,
    secretRefEnvVarName: resolution.secretRefEnvVarName,
    secretRef: resolution.secretRef
  }
}
