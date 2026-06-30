/**
 * TASK-1266 — Structural probe · Core Web Vitals / render (Slice 2, headless-dependiente).
 *
 * Requiere render headless (Chromium + Lighthouse) → corre en Cloud Run worker, NUNCA en
 * Vercel. Sin `HeadlessRenderer` inyectado, el gatherer lo degrada a `skipped/no_headless`
 * (honest degradation). Cuando hay runtime, puntúa desde el performance score de Lighthouse.
 */

import { NO_HEADLESS_OUTCOME, type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  if (!ctx.headless) return NO_HEADLESS_OUTCOME

  const rendered = await ctx.headless.render(ctx.baseUrl)
  const cwv = rendered.coreWebVitals

  if (!cwv || cwv.performanceScore === null) {
    return {
      status: 'skipped',
      score: null,
      reason: 'El render headless no entregó métricas de Core Web Vitals.',
      evidence: {},
      errorCode: 'no_metrics'
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(cwv.performanceScore * 1000) / 10))

  return {
    status: 'succeeded',
    score,
    reason: `Core Web Vitals: performance ${score}/100 (LCP ${cwv.lcpMs ?? '—'}ms, CLS ${cwv.cls ?? '—'}, INP ${cwv.inpMs ?? '—'}ms).`,
    evidence: { lcpMs: cwv.lcpMs, cls: cwv.cls, inpMs: cwv.inpMs, performanceScore: cwv.performanceScore }
  }
}

export const coreWebVitalsProbe: Probe = {
  kind: 'core_web_vitals',
  axis: 'structural',
  requiresHeadless: true,
  run
}
