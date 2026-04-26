import { getVercelOidcToken, getVercelOidcTokenSync } from '@vercel/oidc'
import { ExternalAccountClient, GoogleAuth, type AuthClient, type GoogleAuthOptions } from 'google-auth-library'

export type GoogleCredentialSource = 'wif' | 'service_account_key' | 'ambient_adc'

type GoogleCredentialPreference = GoogleCredentialSource | 'auto'

const stripWrappingQuotes = (value: string) => {
  const trimmed = value.trim()
  const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"')
  const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'")

  return hasDoubleQuotes || hasSingleQuotes ? trimmed.slice(1, -1).trim() : trimmed
}

const normalizeLegacyEscapedJson = (value: string) => {
  return stripWrappingQuotes(value)
    .replace(/\r?\n/g, '')
    .replace(/^\{\\n\s*/, '{')
    .replace(/,\\n\s*"/g, ',"')
    .replace(/\\n\}$/g, '}')
    .replace(/\\n\\r\\n$/g, '')
}

const collapseDoubledQuotes = (value: string) => value.replace(/""/g, '"')

const extractJsonEnvelope = (value: string) => {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')

  return start >= 0 && end > start ? value.slice(start, end + 1) : value
}

const buildCredentialCandidates = (value: string) => {
  const stripped = stripWrappingQuotes(value)
  const unescaped = stripped.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\"/g, '"')
  const normalized = normalizeLegacyEscapedJson(stripped)
  const extracted = extractJsonEnvelope(stripped)
  const extractedNormalized = extractJsonEnvelope(normalized)

  return Array.from(
    new Set(
      [
        value,
        stripped,
        unescaped,
        normalized,
        collapseDoubledQuotes(stripped),
        collapseDoubledQuotes(unescaped),
        extracted,
        extractedNormalized
      ].filter(Boolean)
    )
  )
}

const parseCredentials = (candidates: string[]) => {
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)

      if (parsed && typeof parsed === 'object') {
        return parsed
      }

      if (typeof parsed === 'string') {
        const reparsed = JSON.parse(parsed)

        if (reparsed && typeof reparsed === 'object') {
          return reparsed
        }
      }
    } catch {
      // Preview envs may inject escaped or re-quoted JSON strings.
    }
  }

  return undefined
}

const normalizeCredentialString = (value: string) =>
  stripWrappingQuotes(value)
    .replace(/\r/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .trim()

const normalizeOptionalCredentialEnv = (value: string | undefined) => {
  if (!value?.trim()) {
    return undefined
  }

  const normalized = stripWrappingQuotes(value).trim()

  return normalized ? normalized : undefined
}

const normalizePrivateKey = (value: string) => {
  const normalized = normalizeCredentialString(value)

  if (!normalized) {
    return normalized
  }

  if (normalized.includes('\n')) {
    return normalized.endsWith('\n') ? normalized : `${normalized}\n`
  }

  const beginMarker = '-----BEGIN PRIVATE KEY-----'
  const endMarker = '-----END PRIVATE KEY-----'

  if (normalized.startsWith(beginMarker) && normalized.endsWith(endMarker)) {
    const body = normalized.slice(beginMarker.length, normalized.length - endMarker.length).trim()

    return `${beginMarker}\n${body}\n${endMarker}\n`
  }

  return normalized.endsWith('\n') ? normalized : `${normalized}\n`
}

const normalizeParsedCredentials = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const credentials = { ...(value as Record<string, unknown>) }

  if (typeof credentials.private_key === 'string') {
    credentials.private_key = normalizePrivateKey(credentials.private_key)
  }

  if (typeof credentials.client_email === 'string') {
    credentials.client_email = normalizeCredentialString(credentials.client_email)
  }

  if (typeof credentials.project_id === 'string') {
    credentials.project_id = normalizeCredentialString(credentials.project_id)
  }

  return credentials
}

const hasValue = (value: string | undefined) => Boolean(value?.trim())

const getGoogleCredentialPreference = (env: NodeJS.ProcessEnv = process.env): GoogleCredentialPreference => {
  const value = env.GCP_AUTH_PREFERENCE?.trim().toLowerCase()

  switch (value) {
    case 'wif':
      return 'wif'
    case 'service_account_key':
      return 'service_account_key'
    case 'ambient_adc':
      return 'ambient_adc'
    default:
      return 'auto'
  }
}

const hasVercelRuntimeMetadata = (env: NodeJS.ProcessEnv = process.env) =>
  hasValue(env.VERCEL_URL) || hasValue(env.VERCEL_DEPLOYMENT_ID) || hasValue(env.VERCEL_REGION)

const isVercelRuntime = (env: NodeJS.ProcessEnv = process.env) => hasValue(env.VERCEL) && hasVercelRuntimeMetadata(env)

const hasInjectedVercelOidcToken = (env: NodeJS.ProcessEnv = process.env) =>
  env !== process.env && hasValue(env.VERCEL_OIDC_TOKEN)

export const hasPersistedLocalVercelOidcToken = (env: NodeJS.ProcessEnv = process.env) =>
  env === process.env && !isVercelRuntime(env) && hasValue(env.VERCEL_OIDC_TOKEN)

const getAvailableVercelOidcTokenSync = (env: NodeJS.ProcessEnv = process.env) => {
  if (hasInjectedVercelOidcToken(env)) {
    return env.VERCEL_OIDC_TOKEN?.trim()
  }

  if (!isVercelRuntime(env)) {
    return undefined
  }

  if (hasValue(process.env.VERCEL_OIDC_TOKEN)) {
    return process.env.VERCEL_OIDC_TOKEN!.trim()
  }

  try {
    return getVercelOidcTokenSync().trim()
  } catch {
    return undefined
  }
}

const normalizeWorkloadIdentityProvider = (value: string) => {
  const trimmed = value.trim()

  if (trimmed.startsWith('https://iam.googleapis.com/')) {
    return trimmed.replace('https://iam.googleapis.com/', '')
  }

  if (trimmed.startsWith('//iam.googleapis.com/')) {
    return trimmed.replace('//iam.googleapis.com/', '')
  }

  if (trimmed.startsWith('iam.googleapis.com/')) {
    return trimmed.replace('iam.googleapis.com/', '')
  }

  return trimmed.replace(/^\/+/, '')
}

const normalizeWorkloadIdentityAudience = (value: string) => `//iam.googleapis.com/${normalizeWorkloadIdentityProvider(value)}`

const getServiceAccountKeyCredentials = (env: NodeJS.ProcessEnv = process.env) => {
  const rawCredentials = normalizeOptionalCredentialEnv(env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const rawCredentialsBase64 = normalizeOptionalCredentialEnv(env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64)

  if (!rawCredentials && !rawCredentialsBase64) {
    return undefined
  }

  if (rawCredentials) {
    const parsed = parseCredentials(buildCredentialCandidates(rawCredentials))

    if (parsed) {
      return normalizeParsedCredentials(parsed)
    }
  }

  if (rawCredentialsBase64) {
    try {
      const decoded = Buffer.from(stripWrappingQuotes(rawCredentialsBase64), 'base64').toString('utf8')
      const parsed = parseCredentials(buildCredentialCandidates(decoded))

      if (parsed) {
        return normalizeParsedCredentials(parsed)
      }
    } catch {
      // Fall through to the explicit runtime error below.
    }
  }

  console.error('Unable to parse GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable.')

  throw new Error('Invalid Google Cloud credentials environment variable')
}

const getWorkloadIdentityProvider = (env: NodeJS.ProcessEnv = process.env) => {
  const explicitProvider = env.GCP_WORKLOAD_IDENTITY_PROVIDER?.trim()

  if (explicitProvider) {
    return normalizeWorkloadIdentityProvider(explicitProvider)
  }

  const projectNumber = env.GCP_PROJECT_NUMBER?.trim()
  const poolId = env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim()
  const providerId = env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim()

  if (!projectNumber || !poolId || !providerId) {
    return undefined
  }

  return `projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`
}

export const isWorkloadIdentityConfigured = (env: NodeJS.ProcessEnv = process.env) =>
  hasValue(getWorkloadIdentityProvider(env)) && hasValue(env.GCP_SERVICE_ACCOUNT_EMAIL)

const getWorkloadIdentityAuthClient = ({
  env = process.env,
  scopes
}: {
  env?: NodeJS.ProcessEnv
  scopes?: string | string[]
}) => {
  const provider = getWorkloadIdentityProvider(env)
  const serviceAccountEmail = env.GCP_SERVICE_ACCOUNT_EMAIL?.trim()

  if (!provider || !serviceAccountEmail) {
    throw new Error('Workload Identity Federation is not fully configured for this runtime')
  }

  const client = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience: normalizeWorkloadIdentityAudience(provider),
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccountEmail)}:generateAccessToken`,
    ...(scopes ? { scopes: Array.isArray(scopes) ? scopes : [scopes] } : {}),
    subject_token_supplier: {
      getSubjectToken: async () => {
        if (hasInjectedVercelOidcToken(env)) {
          return env.VERCEL_OIDC_TOKEN!.trim()
        }

        if (!isVercelRuntime(env)) {
          throw new Error('Vercel OIDC token is only available during real Vercel runtime execution')
        }

        const token = await getVercelOidcToken().catch(() => process.env.VERCEL_OIDC_TOKEN?.trim())

        if (!token) {
          throw new Error('Vercel OIDC token is not available in this runtime context')
        }

        return token.trim()
      }
    }
  })

  if (!client) {
    throw new Error('Unable to build Google external account client for Workload Identity Federation')
  }

  return client
}

export const shouldUseWorkloadIdentity = (env: NodeJS.ProcessEnv = process.env) => {
  const preference = getGoogleCredentialPreference(env)

  if (preference === 'service_account_key' || preference === 'ambient_adc') {
    return false
  }

  if (preference === 'wif') {
    return isWorkloadIdentityConfigured(env) && (isVercelRuntime(env) || hasInjectedVercelOidcToken(env))
  }

  if (!isWorkloadIdentityConfigured(env)) {
    return false
  }

  return isVercelRuntime(env)
}

export const getGoogleCredentialSource = (env: NodeJS.ProcessEnv = process.env): GoogleCredentialSource => {
  const preference = getGoogleCredentialPreference(env)

  if (preference === 'ambient_adc') {
    return 'ambient_adc'
  }

  if (shouldUseWorkloadIdentity(env)) {
    return 'wif'
  }

  const serviceAccountCredentials = getServiceAccountKeyCredentials(env)

  if (preference === 'service_account_key' && serviceAccountCredentials) {
    return 'service_account_key'
  }

  if (serviceAccountCredentials) {
    return 'service_account_key'
  }

  return 'ambient_adc'
}

export const getGoogleCredentialDiagnostics = (env: NodeJS.ProcessEnv = process.env) => {
  const preference = getGoogleCredentialPreference(env)
  const source = getGoogleCredentialSource(env)

  return {
    preference,
    source,
    isVercelRuntime: isVercelRuntime(env),
    workloadIdentityConfigured: isWorkloadIdentityConfigured(env),
    hasInjectedVercelOidcToken: hasInjectedVercelOidcToken(env),
    hasPersistedLocalVercelOidcToken: hasPersistedLocalVercelOidcToken(env),
    serviceAccountKeyConfigured: hasValue(env.GOOGLE_APPLICATION_CREDENTIALS_JSON) || hasValue(env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64),
    hasResolvableVercelOidcToken: hasValue(getAvailableVercelOidcTokenSync(env))
  }
}

export const getGoogleCredentials = (env: NodeJS.ProcessEnv = process.env) => getServiceAccountKeyCredentials(env)

export const getGoogleProjectId = (env: NodeJS.ProcessEnv = process.env) => {
  const explicitProjectId = env.GCP_PROJECT?.trim() || env.GOOGLE_CLOUD_PROJECT?.trim()

  if (explicitProjectId) {
    return explicitProjectId
  }

  const credentials = getServiceAccountKeyCredentials(env)

  const projectId = typeof credentials?.project_id === 'string' ? normalizeCredentialString(credentials.project_id) : undefined

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT or GOOGLE_CLOUD_PROJECT environment variable')
  }

  return projectId
}

export const getGoogleAuthOptions = ({
  env = process.env,
  scopes
}: {
  env?: NodeJS.ProcessEnv
  scopes?: string | string[]
} = {}): GoogleAuthOptions<AuthClient> => {
  const projectId = getGoogleProjectId(env)
  const source = getGoogleCredentialSource(env)

  if (source === 'wif') {
    return {
      projectId,
      ...(scopes ? { scopes } : {}),
      authClient: getWorkloadIdentityAuthClient({ env, scopes })
    }
  }

  const credentials = getServiceAccountKeyCredentials(env)

  if (credentials) {
    return {
      projectId,
      ...(scopes ? { scopes } : {}),
      credentials
    }
  }

  return {
    projectId,
    ...(scopes ? { scopes } : {})
  }
}

export const createGoogleAuth = ({
  env = process.env,
  scopes
}: {
  env?: NodeJS.ProcessEnv
  scopes?: string | string[]
} = {}) => new GoogleAuth(getGoogleAuthOptions({ env, scopes }))
