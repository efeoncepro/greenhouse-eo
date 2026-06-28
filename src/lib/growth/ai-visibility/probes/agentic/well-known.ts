/**
 * TASK-1266 — Agentic probes · helper de sondeo de paths well-known (Slice 3).
 *
 * Sondea una lista de paths candidatos (cortesía: secuencial, se corta al primer 200).
 * Distingue "ausencia MEDIDA" (al menos un 404 definitivo, sin ningún 200) de "no medible"
 * (sólo errores de red/timeout) → honest degradation en el probe que lo usa.
 */

import { type ProbeContext } from '../contracts'

export interface WellKnownProbeResult {
  found: boolean
  foundPath: string | null
  /** true si hubo al menos una respuesta HTTP definitiva (200/404…) → la ausencia es medida. */
  definitiveAbsence: boolean
}

export const probeWellKnownPaths = async (
  ctx: ProbeContext,
  paths: readonly string[]
): Promise<WellKnownProbeResult> => {
  let sawDefinitive = false

  for (const path of paths) {
    const res = await ctx.fetcher(path, { accept: 'application/json,text/plain,application/yaml' })

    if (res.ok) {
      return { found: true, foundPath: path, definitiveAbsence: false }
    }

    // 4xx (incluido 404) = respuesta definitiva del servidor → ausencia medida.
    if (res.status >= 400 && res.status < 500) sawDefinitive = true
  }

  return { found: false, foundPath: null, definitiveAbsence: sawDefinitive }
}
