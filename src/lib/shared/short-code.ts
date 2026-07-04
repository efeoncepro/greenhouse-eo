import { randomBytes } from 'node:crypto'

/**
 * Generador compartido de short codes base62 de alta entropía (TASK-1330).
 *
 * Home neutral del patrón que TASK-631 (`quote_short_links`) introdujo inline: cada dominio
 * que necesite un alias corto no enumerable (quote share, AI Visibility report share, futuros)
 * reusa este generador + el retry por colisión, en vez de re-implementar la crypto. PURO (solo
 * `node:crypto`), sin IO ni acoplamiento a tabla → testeable y compartible entre server modules.
 *
 * NOTA: `quote-share/short-link.ts` mantiene su copia histórica por ahora (flujo comercial en
 * producción; no se toca en esta task P2). Puede adoptar este módulo en un follow-up de bajo riesgo.
 */

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

const MIN_LENGTH = 6
const MAX_LENGTH = 32
const DEFAULT_MAX_ATTEMPTS = 5

/**
 * Genera un código base62 criptográficamente aleatorio de `length` chars.
 * Rechaza longitudes fuera de `[6, 32]` (defensa contra códigos triviales/enumerables).
 */
export const generateBase62Code = (length: number): string => {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new Error(`short code length must be an integer in [${MIN_LENGTH}, ${MAX_LENGTH}], got ${length}`)
  }

  const bytes = randomBytes(length)
  let code = ''

  for (let i = 0; i < length; i++) {
    code += BASE62[bytes[i] % 62]
  }

  return code
}

/** ¿El error es una violación de unicidad de Postgres (`23505`)? */
export const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string } | null)?.code === '23505'

export interface UniqueShortCodeOptions {
  length: number
  maxAttempts?: number
}

/**
 * Genera códigos hasta que `persist(code)` tenga éxito o se agoten los intentos. `persist`
 * intenta el INSERT y, si el código ya existe, lanza el error de colisión que `isCollision`
 * reconoce → se reintenta con un código fresco. Cualquier otro error se propaga tal cual (p.ej.
 * un conflicto de constraint DISTINTO al del código, que el caller debe manejar aparte).
 */
export const withUniqueShortCode = async <T>(
  options: UniqueShortCodeOptions,
  persist: (code: string) => Promise<T>,
  isCollision: (error: unknown) => boolean
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateBase62Code(options.length)

    try {
      return await persist(code)
    } catch (error) {
      // Error que no es colisión → propagar tal cual (el caller lo maneja).
      if (!isCollision(error)) throw error
      // Colisión → siguiente intento; si se agotan, cae al throw descriptivo de abajo.
    }
  }

  throw new Error(`Failed to generate a unique short code after ${maxAttempts} attempts`)
}
