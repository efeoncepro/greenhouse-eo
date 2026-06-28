/**
 * TASK-1266 — Agentic probe · WebMCP tools (Slice 3, headless-dependiente).
 *
 * El TECHO de la operabilidad agéntica: tools WebMCP registradas en la página vía
 * `navigator.modelContext` / `document.modelContext` (pre-estándar — detección tolerante).
 * Requiere render headless (Chromium) → corre en Cloud Run worker, NUNCA en Vercel. Sin
 * `HeadlessRenderer`, el gatherer lo degrada a `skipped/no_headless` (honest degradation).
 * WebMCP es el techo, NO el único camino: un sitio sin WebMCP puede scorear alto en el eje
 * agentic vía MCP (.well-known/mcp) + structured data + DOM semántico.
 */

import { NO_HEADLESS_OUTCOME, type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  if (!ctx.headless) return NO_HEADLESS_OUTCOME

  const rendered = await ctx.headless.render(ctx.baseUrl)
  const tools = rendered.webmcpTools

  // El renderer no inspeccionó modelContext → no medible (distinto de "sin tools").
  if (tools === null) {
    return {
      status: 'skipped',
      score: null,
      reason: 'El render headless no inspeccionó WebMCP (navigator.modelContext).',
      evidence: {},
      errorCode: 'no_webmcp_inspection'
    }
  }

  if (tools.length === 0) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'La página no registra tools WebMCP (navigator.modelContext).',
      evidence: { toolCount: 0 }
    }
  }

  return {
    status: 'succeeded',
    score: 100,
    reason: `La página registra ${tools.length} tool(s) WebMCP (operabilidad agéntica directa).`,
    evidence: { toolCount: tools.length, tools }
  }
}

export const webmcpToolsProbe: Probe = {
  kind: 'webmcp_tools',
  axis: 'agentic',
  requiresHeadless: true,
  run
}
