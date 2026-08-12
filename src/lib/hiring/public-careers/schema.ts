// TASK-1367 — Validación PURA del payload de postulación pública (single source of truth,
// estilo grader public-intake, NO Zod). Sin IO. Normaliza email + valida URLs browser-safe.

import { validateE164PhoneValue } from '@/lib/growth/forms/validators/phone'
import { isValidCountryCode } from '@/lib/locale/countries'

export interface PublicHiringApplicationInput {
  openingPublicId: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  /** TASK-1688 — ISO 3166-1 alpha-2 autodeclarado. La UI lo exige; el parser lo valida si viene
   * (expand/contract: se vuelve requerido a nivel parser tras verificar ambas superficies en prod). */
  residenceCountryCode?: string | null
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
  residenceCountryCode: string | null
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
  const phoneRaw = asTrimmed(body.phone, MAX_NAME)

  // URLs opcionales: si vienen, DEBEN ser https browser-safe (rechazo javascript:/data:).
  if (portfolioRaw && !isSafeHttpUrl(portfolioRaw)) return null
  if (linkedinRaw && !isSafeHttpUrl(linkedinRaw)) return null

  // TASK-1688 — país de residencia autodeclarado, REQUERIDO (flip contract 2026-08-12: ambas
  // superficies verificadas en producción con release 393144e9f; ver ADR delta en la
  // arquitectura Hiring). Un valor ausente o inválido = payload inválido (nunca persistir un
  // país inventado ni aceptar postulación sin residencia declarada).
  // OJO: NO truncar — 'Chile'.slice(0,2)='CH' sería Suiza. Exactamente 2 chars ISO o rechazo.
  const residenceRaw = asTrimmed(body.residenceCountryCode, 10).toUpperCase()

  if (residenceRaw.length !== 2 || !isValidCountryCode(residenceRaw)) return null

  // El país de residencia SÓLO sirve como hint de formato local del teléfono cuando el
  // candidato no escribe el prefijo internacional — nunca al revés (residencia no se infiere).
  const phoneResult = phoneRaw
    ? validateE164PhoneValue(phoneRaw, { country: residenceRaw || 'CL' })
    : null

  if (phoneResult && !phoneResult.valid) return null

  return {
    openingPublicId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email,
    phone: phoneResult ? String(phoneResult.normalized) : null,
    residenceCountryCode: residenceRaw || null,
    portfolioUrl: portfolioRaw || null,
    linkedinUrl: linkedinRaw || null,
    availability: asTrimmed(body.availability, MAX_NAME) || null,
    message: asTrimmed(body.message, MAX_MESSAGE) || null,
    consentPolicyVersion: asTrimmed(body.consentPolicyVersion, MAX_NAME) || null,
  }
}
