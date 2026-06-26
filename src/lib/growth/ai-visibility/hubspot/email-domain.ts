import 'server-only'

import { PERSONAL_OR_DISPOSABLE_DOMAINS } from '@/lib/growth/forms/email-verification/email-domain-data'

/**
 * TASK-1242 — Clasificador de dominio de email (corporate vs personal/free).
 *
 * Lo usa el HubSpot lead handoff para decidir el dedup de Company: un lead con email
 * corporativo (`juan@acme.com`) matchea/crea la company "acme.com"; un email personal
 * (`juan@gmail.com`) entra SOLO como contact, sin company (evita companies basura tipo
 * "Gmail" en el CRM productivo).
 *
 * Default conservador: ante cualquier duda (dominio vacío, malformado, o en la lista de
 * free providers) → `personal`. Preferimos no crear una company antes que crear una mala.
 *
 * TASK-1254 — SSOT: la lista de dominios free/desechables YA NO vive acá. Consume el
 * dataset canónico browser-safe `email-verification/email-domain-data.ts` (mismo que
 * alimenta el Tier 1 + el validador `corporate_email`). Una sola lista, sin divergencia.
 * El conjunto `PERSONAL_OR_DISPOSABLE_DOMAINS` es un superconjunto del legacy (más
 * proveedores free/desechables conocidos), así que la clasificación solo gana precisión:
 * algún dominio antes mal marcado como corporativo ahora entra correcto como personal.
 */

export type EmailDomainClass = 'corporate' | 'personal'

export interface EmailDomainClassification {
  /** Dominio normalizado (lowercase, sin espacios). `null` si el email es inválido. */
  domain: string | null
  classification: EmailDomainClass
  /** Conveniencia: `true` solo cuando `classification === 'corporate'`. */
  isCorporate: boolean
}

/** Extrae el dominio normalizado de un email. `null` si no parsea como `local@domain`. */
export const extractEmailDomain = (email: string | null | undefined): string | null => {
  if (!email) return null

  const trimmed = email.trim().toLowerCase()
  const atIndex = trimmed.lastIndexOf('@')

  // Necesita exactamente un local-part no vacío + un domain no vacío con al menos un punto.
  if (atIndex <= 0 || atIndex === trimmed.length - 1) return null

  const domain = trimmed.slice(atIndex + 1)

  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null
  if (/\s/.test(domain)) return null

  return domain
}

/**
 * Clasifica el email como `corporate` o `personal`. Conservador: dominio inválido o en la
 * lista de free providers ⇒ `personal` (el handoff NO crea company en ese caso).
 */
export const classifyEmailDomain = (email: string | null | undefined): EmailDomainClassification => {
  const domain = extractEmailDomain(email)

  if (!domain || PERSONAL_OR_DISPOSABLE_DOMAINS.has(domain)) {
    return { domain, classification: 'personal', isCorporate: false }
  }

  return { domain, classification: 'corporate', isCorporate: true }
}

/** Helper directo: ¿este email justifica matchear/crear una Company por su dominio? */
export const isCorporateEmail = (email: string | null | undefined): boolean =>
  classifyEmailDomain(email).isCorporate
