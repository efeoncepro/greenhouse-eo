import { minimatch } from 'minimatch'

import { RELIABILITY_REGISTRY } from './registry'
import type { ReliabilityModuleKey } from '@/types/reliability'

/**
 * TASK-633 — Change-based verification matrix.
 *
 * Mapea archivos cambiados (típicamente del diff de un PR) a los módulos del
 * `Reliability Registry` que los declaran como propios. El workflow CI usa
 * el resultado para correr solo los smoke specs relevantes.
 *
 * Usa `minimatch` para evaluar globs siguiendo la sintaxis canónica del
 * ecosistema npm. Los globs viven en `ReliabilityModuleDefinition.filesOwned`.
 *
 * Reglas:
 *  - Si `changedFiles` está vacío → retorna [].
 *  - Si un archivo matchea N módulos → todos los N quedan afectados.
 *  - Archivos que no matchean ningún módulo → ignorados (no rompen el matrix).
 *  - El orden del resultado preserva el orden del registry para output estable.
 */
export const getAffectedModules = (changedFiles: string[]): ReliabilityModuleKey[] => {
  if (changedFiles.length === 0) return []

  const affected = new Set<ReliabilityModuleKey>()

  for (const definition of RELIABILITY_REGISTRY) {
    for (const glob of definition.filesOwned) {
      const hit = changedFiles.some(file => minimatch(file, glob, { dot: true }))

      if (hit) {
        affected.add(definition.moduleKey)
        break
      }
    }
  }

  return RELIABILITY_REGISTRY.map(d => d.moduleKey).filter(key => affected.has(key))
}

/**
 * Devuelve el set único de smoke specs que protegen los módulos afectados.
 * El orden es estable: respeta el orden del registry y deduplica preservando
 * la primera aparición.
 */
export const mapModulesToSmokeSpecs = (modules: ReliabilityModuleKey[]): string[] => {
  if (modules.length === 0) return []

  const moduleSet = new Set(modules)
  const seen = new Set<string>()
  const ordered: string[] = []

  for (const definition of RELIABILITY_REGISTRY) {
    if (!moduleSet.has(definition.moduleKey)) continue

    for (const spec of definition.smokeTests) {
      if (seen.has(spec)) continue

      seen.add(spec)
      ordered.push(spec)
    }
  }

  return ordered
}
