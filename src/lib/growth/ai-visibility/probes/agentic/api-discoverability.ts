/**
 * TASK-1266 — Agentic probe · API discoverability (Slice 3).
 *
 * Read-only GET de contratos programáticos descubribles (OpenAPI / ai-plugin). Un contrato
 * público permite que un agente entienda y opere las capacidades del sitio sin scraping.
 * Es un camino PARCIAL hacia la operabilidad agéntica (WebMCP es el techo). Ausencia MEDIDA
 * → 0; sin respuesta definitiva → null.
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'
import { probeWellKnownPaths } from './well-known'

const API_PATHS = [
  '/openapi.json',
  '/.well-known/ai-plugin.json',
  '/.well-known/openapi.json',
  '/.well-known/openapi.yaml'
] as const

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const probed = await probeWellKnownPaths(ctx, API_PATHS)

  if (probed.found) {
    return {
      status: 'succeeded',
      score: 100,
      reason: `Contrato programático descubrible en ${probed.foundPath}.`,
      evidence: { found: true, path: probed.foundPath }
    }
  }

  if (probed.definitiveAbsence) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'Sin contrato programático descubrible (OpenAPI / ai-plugin).',
      evidence: { found: false, checked: [...API_PATHS] }
    }
  }

  return {
    status: 'failed',
    score: null,
    reason: 'No se pudo verificar la discoverability de API (sin respuesta definitiva).',
    evidence: { checked: [...API_PATHS] },
    errorCode: 'http_error'
  }
}

export const apiDiscoverabilityProbe: Probe = {
  kind: 'api_discoverability',
  axis: 'agentic',
  requiresHeadless: false,
  run
}
