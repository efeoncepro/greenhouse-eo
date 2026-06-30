/**
 * TASK-1266 — Structural probe · llms.txt (Slice 2).
 *
 * Read-only GET de /llms.txt (estándar emergente que cura para LLMs el contenido clave del
 * sitio). Presente = señal AEO positiva; ausencia MEDIDA (404) → score 0 (gap accionable,
 * lo cierra el fix-it de TASK-1269). Fetch fallido (red/timeout) → null.
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const res = await ctx.fetcher('/llms.txt', { accept: 'text/plain,text/markdown' })

  if (res.status === 404) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'Sin llms.txt: el sitio no cura contenido para los LLMs.',
      evidence: { status: 404, present: false }
    }
  }

  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo verificar llms.txt (sin respuesta utilizable).',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const bytes = res.body.trim().length

  // Un llms.txt vacío/trivial cuenta como ausencia funcional (medida → 0).
  if (bytes < 16) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'llms.txt presente pero vacío/trivial: sin contenido curado útil.',
      evidence: { status: res.status, present: true, bytes }
    }
  }

  return {
    status: 'succeeded',
    score: 100,
    reason: 'llms.txt presente con contenido curado para LLMs.',
    evidence: { status: res.status, present: true, bytes }
  }
}

export const llmsTxtProbe: Probe = {
  kind: 'llms_txt',
  axis: 'structural',
  requiresHeadless: false,
  run
}
