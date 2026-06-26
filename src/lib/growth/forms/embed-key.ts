/**
 * TASK-1258 — Embed key per-surface (credencial per-site del editor externo).
 *
 * Modelo de auth del catálogo externo (decisión Safety hard-to-reverse, Opción A):
 * reusa la primitiva de seguridad de `form_host_surface`. Cada surface puede tener
 * una credencial per-site:
 *   - `embed_key_id`   — identificador NO secreto (rotación/audit; ej. `ehk_<hex>`).
 *   - `embed_key_hash` — sha256(secret) en hex; el secreto crudo NUNCA se persiste.
 *
 * El plugin WordPress guarda el secreto `ghek_…` server-side (NUNCA llega al browser;
 * el editor lo consume vía proxy server-side, ver TASK-1259) y lo presenta al endpoint
 * de catálogo. El servidor hashea lo presentado y compara timing-safe contra el hash
 * almacenado. El secreto es alta-entropía (32 bytes) ⇒ sha256 es apropiado (no bcrypt,
 * que es para low-entropy passwords).
 */
import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Prefijo del secreto crudo (identifica el tipo de credencial; no es secreto). */
export const EMBED_KEY_SECRET_PREFIX = 'ghek_'
/** Prefijo del identificador público de la llave. */
export const EMBED_KEY_ID_PREFIX = 'ehk_'

export interface MintedEmbedKey {
  /** Identificador público (no secreto) para rotación/audit. */
  embedKeyId: string
  /** Secreto crudo. Se muestra UNA sola vez; se guarda server-side en el plugin. */
  secret: string
  /** sha256(secret) en hex; es lo único que se persiste en la surface. */
  embedKeyHash: string
}

/** sha256(secret) en hex. Determinista; única forma de derivar el hash almacenado. */
export const hashEmbedKeySecret = (secret: string): string =>
  createHash('sha256').update(secret, 'utf8').digest('hex')

/**
 * Genera una credencial per-site nueva. El secreto es 32 bytes base64url con prefijo;
 * el caller persiste `embedKeyId` + `embedKeyHash` en la surface y entrega `secret`
 * UNA vez al operador para configurarlo server-side en el plugin.
 */
export const mintEmbedKey = (): MintedEmbedKey => {
  const secret = `${EMBED_KEY_SECRET_PREFIX}${randomBytes(32).toString('base64url')}`
  const embedKeyId = `${EMBED_KEY_ID_PREFIX}${randomBytes(6).toString('hex')}`

  return { embedKeyId, secret, embedKeyHash: hashEmbedKeySecret(secret) }
}

/**
 * Verifica timing-safe que el secreto presentado corresponde al hash almacenado.
 * Fail-closed: si falta cualquiera de los dos, o el secreto no tiene el prefijo
 * esperado, devuelve `false` sin filtrar el motivo.
 */
export const verifyEmbedKeySecret = (presentedSecret: string | null | undefined, storedHash: string | null | undefined): boolean => {
  if (!presentedSecret || !storedHash) return false
  if (!presentedSecret.startsWith(EMBED_KEY_SECRET_PREFIX)) return false

  const presentedHash = hashEmbedKeySecret(presentedSecret)
  const a = Buffer.from(presentedHash, 'hex')
  const b = Buffer.from(storedHash, 'hex')

  if (a.length !== b.length || a.length === 0) return false

  return timingSafeEqual(a, b)
}
