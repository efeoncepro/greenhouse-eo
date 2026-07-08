// TASK-1367 — Validación PURA del payload de postulación pública (single source of truth,
// estilo grader public-intake, NO Zod). Sin IO. Normaliza email + valida URLs browser-safe.

export interface PublicHiringApplicationInput {
  openingPublicId: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  portfolioUrl?: string | null
  linkedinUrl?: string | null
  availability?: string | null
  message?: string | null
  consent: boolean
  consentPolicyVersion?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME = 200
const MAX_MESSAGE = 4000
const MAX_URL = 2000

export const normalizeEmail = (value: string): string => value.trim().toLowerCase()

const asTrimmed = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** URL https browser-safe: `new URL()` válido, protocolo https, sin javascript:/data:/vbscript:. */
export const isSafeHttpUrl = (value: string): boolean => {
  if (!value) return false

  try {
    const url = new URL(value)


return url.protocol === 'https:'
  } catch {
    return false
  }
}

export interface NormalizedApplicationInput {
  openingPublicId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  portfolioUrl: string | null
  linkedinUrl: string | null
  availability: string | null
  message: string | null
  consentPolicyVersion: string | null
}

/**
 * Valida + normaliza el payload crudo (todo `unknown`). Devuelve la entrada normalizada o `null` si
 * es inválida (missing/consent-false/email-mal/URL-insegura). Es la frontera de enforcement: el
 * caller trata `null` como `invalid` genérico (nunca revela cuál campo falló al público).
 */
export const parsePublicHiringApplication = (raw: unknown): NormalizedApplicationInput | null => {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>

  if (body.consent !== true) return null

  const openingPublicId = asTrimmed(body.openingPublicId, 200)
  const firstName = asTrimmed(body.firstName, MAX_NAME)
  const lastName = asTrimmed(body.lastName, MAX_NAME)
  const email = normalizeEmail(asTrimmed(body.email, MAX_NAME))

  if (!openingPublicId || !firstName || !lastName) return null
  if (!EMAIL_RE.test(email)) return null

  const portfolioRaw = asTrimmed(body.portfolioUrl, MAX_URL)
  const linkedinRaw = asTrimmed(body.linkedinUrl, MAX_URL)

  // URLs opcionales: si vienen, DEBEN ser https browser-safe (rechazo javascript:/data:).
  if (portfolioRaw && !isSafeHttpUrl(portfolioRaw)) return null
  if (linkedinRaw && !isSafeHttpUrl(linkedinRaw)) return null

  return {
    openingPublicId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email,
    phone: asTrimmed(body.phone, MAX_NAME) || null,
    portfolioUrl: portfolioRaw || null,
    linkedinUrl: linkedinRaw || null,
    availability: asTrimmed(body.availability, MAX_NAME) || null,
    message: asTrimmed(body.message, MAX_MESSAGE) || null,
    consentPolicyVersion: asTrimmed(body.consentPolicyVersion, MAX_NAME) || null,
  }
}
