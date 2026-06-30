/**
 * TASK-1254 — Tier 1 de verificación de email (LOCAL, GRATIS, SÍNCRONO, ISOMÓRFICO).
 *
 * Resuelve "¿es corporativo / desechable / role-based?" sin red ni costo, a partir del
 * dataset canónico browser-safe. Es el primer (y para la mayoría de leads, único) filtro:
 * Tier 2 (provider pago, deliverability/MX) solo corre si Tier 1 pasa.
 *
 * REGLA DE PUREZA: browser-safe. NO importa `server-only`/`node:*`/Zod. El renderer
 * (UX, habilita/deshabilita submit) y `submitForm` (autoridad) llaman ESTO para paridad.
 * NO importa `validators/core.ts` (sería ciclo: core importa tier1).
 */
import {
  COMMON_DOMAIN_TYPOS,
  DISPOSABLE_EMAIL_DOMAINS,
  FREE_EMAIL_PROVIDERS,
  ROLE_BASED_LOCAL_PARTS,
} from './email-domain-data'

/** Sintaxis estructural mínima (mismo shape que `validators/core.ts`, replicado para evitar ciclo). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface Tier1EmailClassification {
  /** ¿pasa la sintaxis estructural `local@domain.tld`? */
  syntaxValid: boolean
  /** Email lowercased + trimmed (canónico a persistir). `''` si no parsea. */
  normalizedEmail: string
  /**
   * Clave de dedup canónica: para gmail/googlemail colapsa puntos del local-part y
   * todo lo que sigue a `+` (gmail los ignora), y unifica googlemail→gmail. Para otros
   * dominios = `normalizedEmail`. Sirve para no contar dos veces el mismo buzón real.
   */
  dedupeKey: string
  /** Dominio normalizado (lowercase). `null` si el email es inválido. */
  domain: string | null
  /** Local-part (antes del `@`), lowercase. `null` si el email es inválido. */
  localPart: string | null
  /** Dominio en la lista de proveedores free/personales (gmail, outlook…). */
  isFreeProvider: boolean
  /** Dominio desechable/temporal (mailinator…). */
  isDisposable: boolean
  /** Local-part genérica/role-based (info@, noreply@…). */
  isRoleBased: boolean
  /** Corporativo = sintaxis OK y dominio NO free NI desechable. */
  isCorporate: boolean
  /** Email corregido si se detecta un typo de dominio conocido; `null` si no. */
  suggestion: string | null
}

const parseEmail = (raw: unknown): { local: string; domain: string } | null => {
  const value = (raw == null ? '' : String(raw)).trim().toLowerCase()

  if (value.length === 0 || !EMAIL_RE.test(value)) return null

  const atIndex = value.lastIndexOf('@')
  const local = value.slice(0, atIndex)
  const domain = value.slice(atIndex + 1)

  if (local.length === 0 || domain.length === 0) return null
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null
  if (/\s/.test(domain)) return null

  return { local, domain }
}

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

/**
 * Colapsa el local-part de gmail para dedup: quita puntos y todo lo que sigue al primer
 * `+`, y unifica el dominio a gmail.com. Para no-gmail devuelve el email tal cual.
 */
const buildDedupeKey = (local: string, domain: string): string => {
  if (!GMAIL_DOMAINS.has(domain)) return `${local}@${domain}`

  const withoutPlus = local.split('+')[0] ?? local
  const withoutDots = withoutPlus.replace(/\./g, '')

  return `${withoutDots}@gmail.com`
}

const INVALID: Tier1EmailClassification = {
  syntaxValid: false,
  normalizedEmail: '',
  dedupeKey: '',
  domain: null,
  localPart: null,
  isFreeProvider: false,
  isDisposable: false,
  isRoleBased: false,
  isCorporate: false,
  suggestion: null,
}

/**
 * Clasifica un email con el dataset Tier 1. No-throwing. Para un email sintácticamente
 * inválido devuelve `INVALID` (todo en false / null). El caller decide qué hacer con
 * cada flag según la política del form (block_field / warn / tag_only).
 */
export const classifyEmailTier1 = (raw: unknown): Tier1EmailClassification => {
  const parsed = parseEmail(raw)

  if (!parsed) return { ...INVALID }

  const { local, domain } = parsed
  const normalizedEmail = `${local}@${domain}`

  const isFreeProvider = FREE_EMAIL_PROVIDERS.has(domain)
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain)
  const isRoleBased = ROLE_BASED_LOCAL_PARTS.has(local)
  const isCorporate = !isFreeProvider && !isDisposable

  const correctedDomain = COMMON_DOMAIN_TYPOS[domain] ?? null
  const suggestion = correctedDomain ? `${local}@${correctedDomain}` : null

  return {
    syntaxValid: true,
    normalizedEmail,
    dedupeKey: buildDedupeKey(local, domain),
    domain,
    localPart: local,
    isFreeProvider,
    isDisposable,
    isRoleBased,
    isCorporate,
    suggestion,
  }
}
