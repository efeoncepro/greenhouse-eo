/**
 * TASK-1282 — Convención del secret id per-org para el token Search Console.
 *
 * El token (refresh) vive en Secret Manager bajo `search-console-token-<orgSlug>`;
 * PG sólo guarda el `token_secret_ref` (el secret name). Mirror del patrón Notion
 * per-cliente (`notion-integration-token-greenhouse-<slug>`).
 *
 * ⚠️ IAM: el SA runtime `greenhouse-portal@` hoy sólo puede escribir secrets con
 * prefijo `notion-integration-token-greenhouse-*`. El prefijo de abajo requiere
 * ampliar el grant de secret-write (out-of-band; el flujo está gated OFF hasta
 * verificación del consent screen de Google, así que ningún write ocurre en prod
 * hasta el rollout). `createOrAddSecretVersion` degrada honesto con
 * `permission_denied` si el grant falta.
 */

import 'server-only'

const SECRET_PREFIX = 'search-console-token'

/** Sanitiza el organization_id a la forma válida de secret id (`[A-Za-z0-9_-]`). */
const sanitizeForSecretId = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

export const buildSearchConsoleSecretId = (organizationId: string): string => {
  const slug = sanitizeForSecretId(organizationId)

  if (!slug) {
    throw new Error('TASK-1282: organizationId inválido para secret id de Search Console')
  }

  return `${SECRET_PREFIX}-${slug}`
}

/**
 * Secret id del token de OPERADOR (flujo property-picker estilo Semrush): un solo
 * token por operador interno, reusado entre todas las orgs que ese operador conecta.
 * Evita copiar el mismo refresh token N veces (uno por org). Las filas per-org sólo
 * apuntan a este secret vía `token_secret_ref`. Prefijo cubierto por el grant IAM
 * `search-console-token-*` del SA runtime.
 */
export const buildOperatorSearchConsoleSecretId = (userId: string): string => {
  const slug = sanitizeForSecretId(userId)

  if (!slug) {
    throw new Error('TASK-1282: userId inválido para secret id de operador Search Console')
  }

  return `${SECRET_PREFIX}-operator-${slug}`
}
