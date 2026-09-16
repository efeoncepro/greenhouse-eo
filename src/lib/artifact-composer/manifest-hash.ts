/**
 * TASK-1846 — hash canónico del `ResolvedCompositionManifest`, DOMAIN-FREE.
 *
 * Vivía dentro de `commercial/tenders/proposals/render-jobs.ts`. Con un segundo consumer del motor
 * (Efeonce Insights) tiene que ser UNA sola función: el worker re-resuelve el manifest y compara byte
 * a byte contra el hash sellado al encolar — si Proposal e Insights hashearan distinto, el drift
 * check daría falsos positivos en uno de los dos. Se movió VERBATIM y `render-jobs.ts` la re-exporta:
 * Proposal produce exactamente los mismos hashes que antes.
 */

import crypto from 'node:crypto'

/**
 * Serialización CANÓNICA (claves ordenadas, profunda). El manifest viaja por JSONB y PostgreSQL
 * normaliza el orden de claves de los objetos — un hash sensible al orden haría que el mismo
 * manifest nunca coincida tras el round-trip a DB (drift falso). Los arrays conservan su orden
 * (el orden de láminas SÍ es contenido).
 */
export const canonicalManifestJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalManifestJson).join(',')}]`
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalManifestJson(v)}`).join(',')}}`
  }

  return JSON.stringify(value)
}

/** Hash canónico del manifest: sha256 de la serialización canónica (estable ante JSONB). */
export const hashResolvedManifest = (manifest: unknown): string =>
  crypto.createHash('sha256').update(canonicalManifestJson(manifest)).digest('hex')
