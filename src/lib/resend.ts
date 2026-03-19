import 'server-only'

import { Resend } from 'resend'

const DEFAULT_EMAIL_FROM = 'Efeonce Greenhouse <greenhouse@efeoncepro.com>'

let cachedClient: Resend | null = null

const normalizeEnv = (value: string | undefined) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

export const getEmailFromAddress = () => normalizeEnv(process.env.EMAIL_FROM) || DEFAULT_EMAIL_FROM

export const getResendApiKey = () => normalizeEnv(process.env.RESEND_API_KEY)

export const isResendConfigured = () => Boolean(getResendApiKey())

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
