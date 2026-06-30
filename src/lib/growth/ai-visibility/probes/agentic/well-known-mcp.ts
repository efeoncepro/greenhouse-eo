/**
 * TASK-1266 — Agentic probe · .well-known/mcp (Slice 3).
 *
 * Read-only GET de /.well-known/mcp(.json). Un servidor MCP descubrible es la señal MÁS
 * fuerte de operabilidad agéntica vía protocolo (un agente puede listar y ejecutar tools).
 * Ausencia MEDIDA (404 definitivo) → score 0; sin respuesta definitiva (red/timeout) → null.
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'
import { probeWellKnownPaths } from './well-known'

const MCP_PATHS = ['/.well-known/mcp', '/.well-known/mcp.json'] as const

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const probed = await probeWellKnownPaths(ctx, MCP_PATHS)

  if (probed.found) {
    return {
      status: 'succeeded',
      score: 100,
      reason: `Servidor MCP descubrible en ${probed.foundPath}.`,
      evidence: { found: true, path: probed.foundPath }
    }
  }

  if (probed.definitiveAbsence) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'Sin .well-known/mcp: los agentes no pueden descubrir un servidor MCP.',
      evidence: { found: false, checked: [...MCP_PATHS] }
    }
  }

  return {
    status: 'failed',
    score: null,
    reason: 'No se pudo verificar .well-known/mcp (sin respuesta definitiva).',
    evidence: { checked: [...MCP_PATHS] },
    errorCode: 'http_error'
  }
}

export const wellKnownMcpProbe: Probe = {
  kind: 'well_known_mcp',
  axis: 'agentic',
  requiresHeadless: false,
  run
}
