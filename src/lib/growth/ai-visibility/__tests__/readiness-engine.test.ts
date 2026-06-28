import { describe, expect, it } from 'vitest'

import { PROBE_LAYER_VERSION, type ProbeAxis, type ProbeKind, type ProbeResult, type ProbeStatus } from '../probes/contracts'
import { computeReadinessScore } from '../scoring/readiness-engine'
import { AI_READINESS_SCORE_VERSION, readinessAxisWeightSum } from '../scoring/readiness-config'

const probe = (
  probeKind: ProbeKind,
  axis: ProbeAxis,
  score: number | null,
  status: ProbeStatus = score === null ? 'skipped' : 'succeeded'
): ProbeResult => ({
  probeId: `gprb-${probeKind}`,
  runId: 'grun-1',
  probeKind,
  axis,
  status,
  score,
  reason: 'r',
  evidence: {},
  latencyMs: 1,
  errorCode: null,
  probeLayerVersion: PROBE_LAYER_VERSION,
  createdAt: '2026-06-28T00:00:00.000Z'
})

describe('TASK-1266 · readiness config', () => {
  it('los pesos suman 100 por eje', () => {
    expect(readinessAxisWeightSum('structural')).toBe(100)
    expect(readinessAxisWeightSum('agentic')).toBe(100)
  })
})

describe('TASK-1266 · computeReadinessScore', () => {
  it('promedia ponderado SÓLO las dimensiones medidas (renormaliza pesos)', () => {
    // structural: robots 100 (w30), json_ld 0 (w30), llms 0 (w15), sitemap 100 (w10), CWV null (w15 skip).
    const result = computeReadinessScore([
      probe('robots_txt', 'structural', 100),
      probe('json_ld', 'structural', 0),
      probe('llms_txt', 'structural', 0),
      probe('sitemap', 'structural', 100),
      probe('core_web_vitals', 'structural', null) // skipped (no_headless)
    ])

    // (30*100 + 30*0 + 15*0 + 10*100) / (30+30+15+10) = 4000/85 = 47.058... → 47.1
    expect(result.structural.overallScore).toBe(47.1)
    expect(result.structural.coverage.probed).toBe(5)
    expect(result.structural.coverage.measured).toBe(4)

    const cwv = result.structural.dimensions.find(d => d.key === 'core_web_vitals')

    expect(cwv?.status).toBe('empty')
    expect(cwv?.score).toBeNull()
  })

  it('eje sin probes → overall null (honest degradation, nunca 0)', () => {
    const result = computeReadinessScore([probe('robots_txt', 'structural', 100)])

    expect(result.agentic.overallScore).toBeNull()
    expect(result.agentic.coverage.measured).toBe(0)
    expect(result.agentic.dimensions.every(d => d.status === 'empty')).toBe(true)
  })

  it('un 0 medido SÍ cuenta (distinto de no medido)', () => {
    const result = computeReadinessScore([probe('json_ld', 'structural', 0)])

    expect(result.structural.overallScore).toBe(0)
    expect(result.structural.coverage.measured).toBe(1)
  })

  it('versiona el score', () => {
    expect(computeReadinessScore([]).scoreVersion).toBe(AI_READINESS_SCORE_VERSION)
  })
})
