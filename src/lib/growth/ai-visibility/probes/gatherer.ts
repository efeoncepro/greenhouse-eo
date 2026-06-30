/**
 * TASK-1266 — Growth AI Visibility · Probe gatherer (Slice 1).
 *
 * Orquesta la ejecución de los probes sobre un sitio: por cada probe resuelve un
 * `ProbeResult` aplicando honest degradation. PURO (sin IO): recibe los probes + el
 * contexto (fetcher/headless inyectados) + factories de id/clock → devuelve los results;
 * el command es quien hace IO (carga el run, persiste). Un probe que requiere headless
 * sin runtime → `skipped`/`no_headless`; un probe que lanza → `failed` con razón (NUNCA
 * propaga el throw: un sitio caído no debe tumbar el gatherer ni el run).
 */

import {
  NO_HEADLESS_OUTCOME,
  type Probe,
  type ProbeContext,
  type ProbeOutcome,
  type ProbeResult,
  PROBE_LAYER_VERSION
} from './contracts'

export interface RunProbesInput {
  runId: string
  probes: Probe[]
  ctx: ProbeContext
  /** Reloj monotónico en ms para medir latencia (inyectable para tests). Default Date.now. */
  clock?: () => number
  /** Generador de probeId (inyectable para tests). Default crypto.randomUUID con prefijo. */
  newProbeId?: () => string
  /** Timestamp ISO factory (inyectable para tests). Default Date. */
  now?: () => string
}

const FAILED_OUTCOME = (reason: string): ProbeOutcome => ({
  status: 'failed',
  score: null,
  reason,
  evidence: {},
  errorCode: 'probe_error'
})

/**
 * Ejecuta los probes SECUENCIALMENTE (cortesía con el sitio analizado: no martillar con
 * N requests concurrentes). Devuelve un ProbeResult por probe; nunca lanza.
 */
export const runProbes = async (input: RunProbesInput): Promise<ProbeResult[]> => {
  const clock = input.clock ?? (() => Date.now())
  const newProbeId = input.newProbeId ?? (() => `gprb-${crypto.randomUUID()}`)
  const now = input.now ?? (() => new Date().toISOString())

  const results: ProbeResult[] = []

  for (const probe of input.probes) {
    const startedAt = clock()

    let outcome: ProbeOutcome

    if (probe.requiresHeadless && !input.ctx.headless) {
      outcome = NO_HEADLESS_OUTCOME
    } else {
      try {
        outcome = await probe.run(input.ctx)
      } catch {
        // Defensa: un probe NUNCA debería lanzar (resuelve a outcome), pero si lo hace,
        // degradamos honestamente. El raw error de fetch ya se capturó en safe-fetch.
        outcome = FAILED_OUTCOME('El probe falló de forma inesperada; sin evidencia.')
      }
    }

    results.push({
      probeId: newProbeId(),
      runId: input.runId,
      probeKind: probe.kind,
      axis: probe.axis,
      status: outcome.status,
      score: outcome.score,
      reason: outcome.reason,
      evidence: outcome.evidence,
      errorCode: outcome.errorCode ?? null,
      latencyMs: Math.max(0, clock() - startedAt),
      probeLayerVersion: PROBE_LAYER_VERSION,
      createdAt: now()
    })
  }

  return results
}
