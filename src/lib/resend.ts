import 'server-only'

import { Resend } from 'resend'

import { resolveSecret, type SecretResolution } from '@/lib/secrets/secret-manager'

// TASK-765 follow-up — eliminamos top-level await para preservar
// compatibilidad con tsx CLI scripts (mismo refactor que auth-secrets.ts).
// Lazy-resolve secrets con cache idempotente; fast-path env-first preserva
// el contrato sync existente; getXxx() siguen siendo sync.

const DEFAULT_EMAIL_FROM = 'Efeonce Greenhouse <greenhouse@efeoncepro.com>'

let cachedClient: Resend | null = null
let cachedApiKeyResolution: SecretResolution | null = null
let cachedWebhookResolution: SecretResolution | null = null
let inFlightApiKey: Promise<SecretResolution> | null = null
let inFlightWebhook: Promise<SecretResolution> | null = null

const normalizeEnv = (value: string | undefined) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

export const getEmailFromAddress = () => normalizeEnv(process.env.EMAIL_FROM) || DEFAULT_EMAIL_FROM

const resolveResendApiKeyInternal = async (): Promise<SecretResolution> => {
  if (cachedApiKeyResolution) return cachedApiKeyResolution
  if (inFlightApiKey) return inFlightApiKey

  inFlightApiKey = resolveSecret({ envVarName: 'RESEND_API_KEY' }).then(r => {
    cachedApiKeyResolution = r

    return r
  })

  return inFlightApiKey
}

const resolveResendWebhookInternal = async (): Promise<SecretResolution> => {
  if (cachedWebhookResolution) return cachedWebhookResolution
  if (inFlightWebhook) return inFlightWebhook

  inFlightWebhook = resolveSecret({ envVarName: 'RESEND_WEBHOOK_SIGNING_SECRET' }).then(r => {
    cachedWebhookResolution = r

    return r
  })

  return inFlightWebhook
}

const readSyncSecret = (
  envVarName: string,
  cached: SecretResolution | null,
  trigger: () => Promise<SecretResolution>
): string | null => {
  // 1. Fast path: env directo (caso comun en Vercel/Cloud Run).
  const envValue = process.env[envVarName]?.trim()

  if (envValue) return envValue

  // 2. Slow path: cache poblado por trigger async previo (e.g. startup
  //    Next.js, primer call a una funcion async).
  if (cached) return cached.value?.trim() || null

  // 3. Trigger background resolve para que el siguiente call (post-Secret
  //    Manager) tenga el cache caliente. NO awaiteamos — sync API.
  trigger().catch(() => {})

  return null
}

/**
 * **Public:** dispara la resolucion async de los 2 secrets canonicos
 * (api key + webhook signing). Idempotente: re-llamar reusa el cache.
 */
export const ensureResendSecretsResolved = async () => {
  await Promise.all([resolveResendApiKeyInternal(), resolveResendWebhookInternal()])
}

export const getResendApiKey = () =>
  readSyncSecret('RESEND_API_KEY', cachedApiKeyResolution, resolveResendApiKeyInternal)

export const getResendWebhookSigningSecret = () =>
  readSyncSecret('RESEND_WEBHOOK_SIGNING_SECRET', cachedWebhookResolution, resolveResendWebhookInternal)

export const isResendConfigured = () => Boolean(getResendApiKey())

export const clearResendClientCache = () => {
  cachedClient = null
}

export const getResendClient = () => {
  if (cachedClient) {
    return cachedClient
  }

  const apiKey = getResendApiKey()

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable.')
  }

  cachedClient = new Resend(apiKey)

  return cachedClient
}

export const resend = new Proxy(
  {},
  {
    get(_target, property) {
      const client = getResendClient()
      const value = Reflect.get(client as object, property)

      return typeof value === 'function' ? value.bind(client) : value
    }
  }
) as Resend

export const EMAIL_FROM = getEmailFromAddress()
