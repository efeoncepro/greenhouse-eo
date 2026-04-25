import 'server-only'

import { Resend } from 'resend'

import { resolveSecret } from '@/lib/secrets/secret-manager'

const DEFAULT_EMAIL_FROM = 'Efeonce Greenhouse <greenhouse@efeoncepro.com>'

let cachedClient: Resend | null = null

const normalizeEnv = (value: string | undefined) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

export const getEmailFromAddress = () => normalizeEnv(process.env.EMAIL_FROM) || DEFAULT_EMAIL_FROM

const resendApiKeyResolution = await resolveSecret({
  envVarName: 'RESEND_API_KEY'
})

const resendWebhookSigningSecretResolution = await resolveSecret({
  envVarName: 'RESEND_WEBHOOK_SIGNING_SECRET'
})

export const getResendApiKey = () => resendApiKeyResolution.value?.trim() || null

export const getResendWebhookSigningSecret = () => resendWebhookSigningSecretResolution.value?.trim() || null

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
