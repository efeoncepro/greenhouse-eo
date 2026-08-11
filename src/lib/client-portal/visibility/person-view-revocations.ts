import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1685 Slice 2 — Revocaciones per-persona vigentes.
 *
 * Lee `greenhouse_core.user_view_overrides` para el único insumo que expresa la dimensión
 * *persona* del primitive de visibilidad. Hasta esta task ese instrumento era **decorativo en
 * la puerta**: los overrides se aplicaban dentro de `resolveAuthorizedViewsForUser`, o sea
 * sobre el claim de la sesión, y el page guard nunca leía el claim. El repo tenía el
 * instrumento canónico para decir "esta persona no debe ver esto" y no cerraba nada.
 *
 * **Sólo `revoke`.** Los `grant` per-persona existen en la tabla y siguen alimentando el claim,
 * pero **no** entran a este reader: bajo la decisión (a′) el carril positivo es el módulo
 * contratado y nada más. Un `grant` per-persona que abriera una superficie que la organización
 * no contrató sería vender por la puerta de atrás.
 *
 * **Vigencia.** `expires_at IS NULL OR expires_at > now()`. Un override expirado no revoca —
 * es el mismo predicado de ciclo de vida que el resto de la plataforma aplica a asignaciones
 * temporales, y omitirlo dejaría revocaciones zombis cerrando puertas para siempre.
 *
 * **Cache 60s in-process**, keyed por `userId`. Mirror del cache del resolver de módulos
 * (`TASK-825`), que a su vez replica `home_rollout_flags` (`TASK-780`). Corre en el hot path
 * de cada page load del portal, así que no puede ser una query por render.
 *
 * ⚠️ El cache hace que revocar tarde **hasta 60s** en cerrar la puerta de una sesión activa.
 * Es la misma latencia que ya tiene quitar un módulo, y es aceptable porque el instrumento
 * gobierna visibilidad de superficies, no una acción destructiva. Si alguna vez se necesita
 * corte inmediato, el camino es invalidar desde el command que escribe el override —
 * `__clearClientPortalRevocationCache(userId)` existe para eso.
 */

interface CacheEntry {
  readonly data: readonly string[]
  readonly expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

/** Invalidación scoped por usuario (o full si se omite). Para commands y tests. */
export const __clearClientPortalRevocationCache = (userId?: string): void => {
  if (userId) cache.delete(userId)
  else cache.clear()
}

const SQL = `
  SELECT view_code
  FROM greenhouse_core.user_view_overrides
  WHERE user_id = $1
    AND override_type = 'revoke'
    AND (expires_at IS NULL OR expires_at > now())
`

/**
 * ViewCodes revocados y vigentes para una persona.
 *
 * **NUNCA** degrada a lista vacía en silencio: si la query falla, lanza. Un fallo del reader
 * que devolviera `[]` convertiría "no pude leer las revocaciones" en "no hay revocaciones", o
 * sea abriría lo que estaba cerrado. El caller decide cómo degradar — el page guard lo hace
 * hacia cerrado, con evidencia observable.
 */
export const resolvePersonRevokedViewCodes = async (userId: string): Promise<readonly string[]> => {
  const cached = cache.get(userId)

  if (cached && cached.expiresAt >= Date.now()) return cached.data

  if (cached) cache.delete(userId)

  try {
    const rows = await query<{ view_code: string } & Record<string, unknown>>(SQL, [userId])
    const result: readonly string[] = rows.map(row => row.view_code)

    cache.set(userId, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })

    return result
  } catch (error) {
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'person_view_revocations' },
      extra: { userId }
    })

    throw error
  }
}
