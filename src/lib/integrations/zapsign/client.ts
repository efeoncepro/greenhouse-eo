import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'

export interface ZapSignSignerInput {
  name: string
  email?: string
  phoneCountry?: string
  phoneNumber?: string
  authMode?: string
  orderGroup?: number
  lockName?: boolean
  lockEmail?: boolean
  lockPhone?: boolean
  qualification?: string
  externalId?: string
  redirectLink?: string
  signaturePlacement?: string
  initialsPlacement?: string
  sendAutomaticEmail?: boolean
  sendAutomaticWhatsapp?: boolean
  sendAutomaticWhatsappSignedFile?: boolean
}

export interface ZapSignDocument {
  token: string
  open_id?: number
  status: string
  name: string
  original_file: string | null
  signed_file: string | null
  created_at?: string
  last_update_at?: string
  signers?: Array<{
    token: string
    sign_url?: string
    status?: string
    name?: string
    email?: string
    phone_country?: string
    phone_number?: string
    signed_at?: string | null
    resend_attempts?: number | null
  }>
  [key: string]: unknown
}

interface ZapSignConfig {
  baseUrl: string
  apiToken: string
}

const DEFAULT_BASE_URL = 'https://api.zapsign.com.br'

const normalizeBaseUrl = (value: string | null | undefined) =>
  (value?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')

const normalizeToken = (value: string | null | undefined) => {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  return trimmed.replace(/^['"]+|['"]+$/g, '').trim()
}

const getZapSignConfig = async (): Promise<ZapSignConfig> => {
  const { value } = await resolveSecret({
    envVarName: 'ZAPSIGN_API_TOKEN'
  })

  const apiToken = normalizeToken(value)

  if (!apiToken) {
    throw new Error('ZAPSIGN_API_TOKEN is not configured')
  }

  return {
    baseUrl: normalizeBaseUrl(process.env.ZAPSIGN_API_BASE_URL),
    apiToken
  }
}

const zapsignFetch = async <T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> => {
  const { baseUrl, apiToken } = await getZapSignConfig()
  const timeoutMs = init?.timeoutMs ?? 30_000

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
      Authorization: `Bearer ${apiToken}`
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')

    throw new Error(`ZapSign ${init?.method || 'GET'} ${path} failed with ${response.status}: ${body.slice(0, 400)}`)
  }

  return (await response.json()) as T
}

const buildSignerPayload = (signer: ZapSignSignerInput) => ({
  name: signer.name,
  ...(signer.email ? { email: signer.email } : {}),
  ...(signer.phoneCountry ? { phone_country: signer.phoneCountry } : {}),
  ...(signer.phoneNumber ? { phone_number: signer.phoneNumber } : {}),
  ...(signer.authMode ? { auth_mode: signer.authMode } : {}),
  ...(signer.orderGroup ? { order_group: signer.orderGroup } : {}),
  ...(signer.lockName !== undefined ? { lock_name: signer.lockName } : {}),
  ...(signer.lockEmail !== undefined ? { lock_email: signer.lockEmail } : {}),
  ...(signer.lockPhone !== undefined ? { lock_phone: signer.lockPhone } : {}),
  ...(signer.qualification ? { qualification: signer.qualification } : {}),
  ...(signer.externalId ? { external_id: signer.externalId } : {}),
  ...(signer.redirectLink ? { redirect_link: signer.redirectLink } : {}),
  ...(signer.signaturePlacement ? { signature_placement: signer.signaturePlacement } : {}),
  ...(signer.initialsPlacement ? { rubrica_placement: signer.initialsPlacement } : {}),
  ...(signer.sendAutomaticEmail !== undefined
    ? { send_automatic_email: signer.sendAutomaticEmail }
    : {}),
  ...(signer.sendAutomaticWhatsapp !== undefined
    ? { send_automatic_whatsapp: signer.sendAutomaticWhatsapp }
    : {}),
  ...(signer.sendAutomaticWhatsappSignedFile !== undefined
    ? { send_automatic_whatsapp_signed_file: signer.sendAutomaticWhatsappSignedFile }
    : {})
})

export const isZapSignConfigured = async () => {
  try {
    await getZapSignConfig()
    
return true
  } catch {
    return false
  }
}

export const createZapSignDocument = async (input: {
  name: string
  base64Pdf: string
  signers: ZapSignSignerInput[]
  language?: 'es' | 'en'
  disableSignerEmails?: boolean
  signatureOrderActive?: boolean
  folderPath?: string
  externalId?: string
  dateLimitToSign?: string
  observers?: string[]
  metadata?: Array<{ key: string; value: string }>
}) =>
  zapsignFetch<ZapSignDocument>('/api/v1/docs/', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      base64_pdf: input.base64Pdf,
      signers: input.signers.map(buildSignerPayload),
      ...(input.language ? { lang: input.language } : {}),
      ...(input.disableSignerEmails !== undefined
        ? { disable_signer_emails: input.disableSignerEmails }
        : {}),
      ...(input.signatureOrderActive !== undefined
        ? { signature_order_active: input.signatureOrderActive }
        : {}),
      ...(input.folderPath ? { folder_path: input.folderPath } : {}),
      ...(input.externalId ? { external_id: input.externalId } : {}),
      ...(input.dateLimitToSign ? { date_limit_to_sign: input.dateLimitToSign } : {}),
      ...(input.observers?.length ? { observers: input.observers } : {}),
      ...(input.metadata?.length ? { metadata: input.metadata } : {})
    })
  })

export const getZapSignDocument = async (documentToken: string) =>
  zapsignFetch<ZapSignDocument>(`/api/v1/docs/${encodeURIComponent(documentToken)}/`, {
    method: 'GET'
  })
