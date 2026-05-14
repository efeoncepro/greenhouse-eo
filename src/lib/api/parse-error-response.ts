/**
 * Cliente-side helper para parsear canonical error responses del API.
 *
 * Mirror del shape definido en `src/lib/api/canonical-error-response.ts`.
 * NO importa server-only — debe ser invocable desde components React.
 *
 * **Por qué duplicar el shape**: el helper server (NextResponse) tiene
 * `import 'server-only'`, no se puede consumir desde Client Components.
 * La estructura es trivial (3 campos) y stable — el riesgo de drift es
 * mínimo si ambos archivos se mantienen alineados.
 */

export interface ParsedApiError {
  /** es-CL prose canónico, safe para mostrar al usuario. */
  message: string
  /** Stable machine code cuando el API devuelve canonical shape, else null. */
  code: string | null
  /** True si reintentar puede resolver. False si requiere acción humana externa. */
  actionable: boolean
}

const FALLBACK_MESSAGE = 'No fue posible completar la operación. Inténtalo de nuevo o contacta a soporte.'

/**
 * Parsea un payload (típicamente desde `res.json()` cuando `!res.ok`) y
 * devuelve un `ParsedApiError` canónico.
 *
 * **Compatible con dos shapes**:
 * 1. Canonical (2026-05-14): `{ error: 'es-CL prose', code, actionable }`.
 *    El consumer usa los 3 campos directamente.
 * 2. Legacy (pre-2026-05-14): `{ error: 'string' }`. El consumer hace fallback:
 *    `message` = ese string IF parece es-CL, ELSE el `fallbackMessage` provisto;
 *    `code` = null; `actionable` = true (asume reintentar puede ayudar).
 *
 * @param payload Respuesta JSON del API, o null si parsing falló.
 * @param fallbackMessage Mensaje es-CL local cuando el payload no es canonical
 *   y no podemos confiar en su `error` (por ejemplo si está en inglés).
 */
export const parseApiErrorPayload = (
  payload: unknown,
  fallbackMessage: string = FALLBACK_MESSAGE
): ParsedApiError => {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>

    const error = obj.error
    const code = typeof obj.code === 'string' ? obj.code : null
    const actionable = typeof obj.actionable === 'boolean' ? obj.actionable : true

    // Canonical shape: has both 'error' (string) and 'code' (string) →
    // confiamos el mensaje server-side (ya es es-CL por contrato).
    if (typeof error === 'string' && code !== null) {
      return { message: error, code, actionable }
    }

    // Legacy shape: solo `error` string sin code. Heurística: si el string
    // empieza con un caracter ASCII común y matchea inglés simple, usamos
    // el fallback. Para evitar falsos positivos en frases técnicas correctas
    // (e.g. "Email already used"), preferimos el fallback siempre que NO
    // haya code — el server canónico siempre proveerá code.
    if (typeof error === 'string') {
      return { message: fallbackMessage, code: null, actionable: true }
    }
  }

  return { message: fallbackMessage, code: null, actionable: true }
}

/**
 * Convenience: fetch wrapper que parsea el error response canónicamente.
 * Lanza `Error` con `.cause` apuntando al `ParsedApiError` para acceso
 * estructurado desde el catch site.
 */
export class CanonicalApiError extends Error {
  readonly code: string | null
  readonly actionable: boolean
  readonly status: number

  constructor(parsed: ParsedApiError, status: number) {
    super(parsed.message)
    this.name = 'CanonicalApiError'
    this.code = parsed.code
    this.actionable = parsed.actionable
    this.status = status
  }
}

export const isCanonicalApiError = (err: unknown): err is CanonicalApiError =>
  err instanceof CanonicalApiError

export const throwIfNotOk = async (
  res: Response,
  fallbackMessage: string
): Promise<void> => {
  if (res.ok) return

  const payload = await res.json().catch(() => null)
  const parsed = parseApiErrorPayload(payload, fallbackMessage)

  throw new CanonicalApiError(parsed, res.status)
}
