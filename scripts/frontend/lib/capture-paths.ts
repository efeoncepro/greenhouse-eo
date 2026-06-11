/**
 * Parseo canónico de nombres de carpeta de capturas. Módulo hoja (sin deps
 * internas) para que tanto gc.ts como el índice lo consuman sin ciclo de import.
 */

/** Subdir canónico de conceptos generados por IA (CLI `ai:image --concept`). */
export const CONCEPTS_DIRNAME = 'concepts'

/**
 * Dirs de primer nivel de `.captures/` que NO son corridas de captura GVC y por
 * lo tanto el GC NUNCA debe podar como "iteración" ni el índice tratar como
 * scenario. Hoy: la carpeta de conceptos de IA (curados, no efímeros).
 */
export const RESERVED_TOP_LEVEL_DIRS = new Set<string>([CONCEPTS_DIRNAME])

/**
 * Extrae el nombre del scenario del dir name `<timestamp>_<scenario>`.
 * El timestamp ISO usa guiones (sin `_`), así que el primer `_` separa
 * timestamp de scenario. Dirs sin `_` (legado) caen a su nombre completo.
 */
export const scenarioFromDirName = (name: string): string => {
  const sep = name.indexOf('_')

  return sep === -1 ? name : name.slice(sep + 1)
}
