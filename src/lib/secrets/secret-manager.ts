import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

import { createGoogleAuth, getGoogleProjectId } from '@/lib/google-credentials'

export type SecretResolutionSource = 'secret_manager' | 'env' | 'unconfigured'

export interface SecretResolution {
  source: SecretResolutionSource
  value: string | null
  envVarName: string
  secretRefEnvVarName: string
  secretRef: string | null
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
  // eslint-disable-next-line no-var
  var __greenhouseSecretManagerClient: SecretManagerServiceClient | undefined
  // eslint-disable-next-line no-var
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

const normalizeSecretValue = (value: string | undefined) => {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const withoutQuotes = trimmed.replace(/^['"]+|['"]+$/g, '').trim()
  const withoutLiteralLineEndings = withoutQuotes.replace(/(?:\\r|\\n)+$/g, '').trim()

  return withoutLiteralLineEndings ? withoutLiteralLineEndings : null
}

const normalizeSecretRefValue = (value: string | undefined) => {
  if (!value) {
    return null
  }

  const sanitized = value.replace(/\\r/g, '').replace(/\\n/g, '').trim()

  return sanitized ? sanitized : null
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

  const projectId = getGoogleProjectId(env)

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
