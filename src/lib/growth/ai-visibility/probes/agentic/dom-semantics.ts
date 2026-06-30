/**
 * TASK-1266 — Agentic probe · DOM semántico (Slice 3).
 *
 * Read-only GET del HTML de la home + análisis ESTÁTICO de landmarks/ARIA/headings/meta.
 * Un DOM semántico permite que un agente interprete y navegue la página sin heurísticas
 * frágiles. Camino PARCIAL hacia la operabilidad agéntica. (La versión completa requeriría
 * render headless; el análisis estático ya da una señal honesta del markup servido.)
 * Home cargó → score medido (incluido 0); home inaccesible → null.
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'
import { analyzeDomSemantics } from '../html'

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const res = await ctx.fetcher('/')

  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo leer el HTML de la home para evaluar el DOM semántico.',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const dom = analyzeDomSemantics(res.body)

  // Señales ponderadas (suma 100): main 25, nav 15, header 10, footer 10, h1 20, title 10, meta 10.
  const score =
    (dom.hasMain ? 25 : 0) +
    (dom.hasNav ? 15 : 0) +
    (dom.hasHeader ? 10 : 0) +
    (dom.hasFooter ? 10 : 0) +
    (dom.h1Count >= 1 ? 20 : 0) +
    (dom.titleLength > 0 ? 10 : 0) +
    (dom.metaDescriptionLength > 0 ? 10 : 0)

  return {
    status: 'succeeded',
    score,
    reason:
      score >= 70
        ? 'DOM con landmarks semánticos sólidos (interpretable por agentes).'
        : 'DOM semántico parcial: faltan landmarks/headings que ayudan a los agentes.',
    evidence: { ...dom }
  }
}

export const domSemanticsProbe: Probe = {
  kind: 'dom_semantics',
  axis: 'agentic',
  requiresHeadless: false,
  run
}
