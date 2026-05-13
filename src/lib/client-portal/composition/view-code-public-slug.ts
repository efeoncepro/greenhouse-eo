import 'server-only'

/**
 * TASK-827 Slice 4 — Mapping canonical `viewCode → public slug`.
 *
 * Convierte un viewCode técnico (e.g. `'cliente.brand_intelligence'`) a un
 * slug user-facing (e.g. `'brand-intelligence'`). El slug es lo que se
 * persiste en `?denied=<slug>` query param + sirve como key para lookup en
 * `GH_CLIENT_PORTAL_COMPOSITION.modulePublicLabels`.
 *
 * Reglas canónicas:
 *   1. Strip prefix `'cliente.'`
 *   2. Replace underscores con dashes (URL-friendly)
 *   3. Lowercase (defensive — viewCodes ya son lowercase canonical)
 *
 * **NUNCA leak module_key técnico al usuario** (D4 hard rule). Si emerge un
 * viewCode con caracteres especiales, el slug se sanitiza primero a un
 * subset URL-safe + lowercase.
 *
 * Pure function, server-only por convención del módulo composition. Sin DB,
 * sin side effects, sin async. Idempotente.
 *
 * Pattern reusable cuando emerja otro context con misma necesidad
 * (e.g. capability_key → public slug, module_key → public slug).
 */

export const mapViewCodeToPublicSlug = (viewCode: string): string => {
  if (!viewCode) return ''

  const withoutPrefix = viewCode.startsWith('cliente.') ? viewCode.slice('cliente.'.length) : viewCode

  return withoutPrefix
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/_/g, '-')
}
