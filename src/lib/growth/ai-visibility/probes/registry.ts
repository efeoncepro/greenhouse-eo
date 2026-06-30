/**
 * TASK-1266 — Growth AI Visibility · Probe registry (Slice 1).
 *
 * Ensambla la lista de probes a ejecutar según los ejes habilitados por flag. El eje
 * `structural` lo habilita `GROWTH_AI_VISIBILITY_PROBES_ENABLED`; el eje `agentic` requiere
 * además `GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED`. Mantiene los probes desacoplados
 * del gatherer (que es puro sobre la lista que recibe).
 */

import { type Probe } from './contracts'
import { STRUCTURAL_PROBES } from './structural'
import { AGENTIC_PROBES } from './agentic'
import { ENTITY_PROBES } from './entity'

export interface ProbeRegistryAxes {
  structural: boolean
  agentic: boolean
  /** TASK-1267 — eje entity (backbone de marca: KG/Wikidata/Reddit). Aditivo sobre structural. */
  entity: boolean
}

export const createProbeRegistry = (axes: ProbeRegistryAxes): Probe[] => {
  const probes: Probe[] = []

  if (axes.structural) probes.push(...STRUCTURAL_PROBES)
  if (axes.agentic) probes.push(...AGENTIC_PROBES)
  if (axes.entity) probes.push(...ENTITY_PROBES)

  return probes
}
