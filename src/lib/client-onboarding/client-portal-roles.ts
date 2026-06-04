import { ROLE_CODES } from '@/config/role-codes'

/**
 * TASK-1001 — heurística canónica de sugerencia de rol de portal cliente a partir
 * del cargo (jobTitle) capturado en HubSpot. Pura (sin deps server) → testeable y
 * reusable. El operador SIEMPRE confirma/ajusta; esto es solo el default sugerido.
 *
 * Los únicos roles válidos para portal son los 3 canónicos client_* (ROLE_CODES).
 * NUNCA devuelve un rol interno (collaborator/efeonce_*).
 */
export type ClientPortalRole =
  | typeof ROLE_CODES.CLIENT_EXECUTIVE
  | typeof ROLE_CODES.CLIENT_MANAGER
  | typeof ROLE_CODES.CLIENT_SPECIALIST

export const CLIENT_PORTAL_ROLES: readonly ClientPortalRole[] = [
  ROLE_CODES.CLIENT_EXECUTIVE,
  ROLE_CODES.CLIENT_MANAGER,
  ROLE_CODES.CLIENT_SPECIALIST
] as const

export const isClientPortalRole = (value: string): value is ClientPortalRole =>
  (CLIENT_PORTAL_ROLES as readonly string[]).includes(value)

// C-level / VP / dirección / fundador → ejecutivo (acceso dashboard ejecutivo).
const EXECUTIVE_PATTERN =
  /\b(c[meofbtdi]o|chief|c-level|vp|vice ?president|director|directora|head of|founder|co-?founder|owner|president|presidente|gerente general|general manager)\b/

// Manager / jefatura / coordinación / supervisión → manager (contexto operativo).
const MANAGER_PATTERN =
  /\b(manager|gerente|jefe|jefa|team lead|tech lead|lead|l[ií]der|coordinador|coordinadora|supervisor|supervisora|head)\b/

/**
 * Sugiere el rol de portal por cargo. Cascade: ejecutivo → manager → specialist.
 * Sin cargo o sin match → client_specialist (el más restringido, fail-safe).
 */
export const suggestClientPortalRole = (jobTitle: string | null | undefined): ClientPortalRole => {
  const normalized = (jobTitle ?? '').trim().toLowerCase()

  if (!normalized) return ROLE_CODES.CLIENT_SPECIALIST
  if (EXECUTIVE_PATTERN.test(normalized)) return ROLE_CODES.CLIENT_EXECUTIVE
  if (MANAGER_PATTERN.test(normalized)) return ROLE_CODES.CLIENT_MANAGER

  return ROLE_CODES.CLIENT_SPECIALIST
}
