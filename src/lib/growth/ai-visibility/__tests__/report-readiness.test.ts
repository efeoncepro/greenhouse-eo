import { describe, expect, it } from 'vitest'

import { PROBE_LAYER_VERSION, type ProbeAxis, type ProbeKind, type ProbeResult } from '../probes/contracts'
import {
  buildGraderReport,
  toClientGraderReport,
  toPublicGraderReport,
  type ReportRunMeta
} from '../report/builder'
import { makeFinding, makeScore } from './report-fixtures'

const RUN: ReportRunMeta = {
  runId: 'run-fixture',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

const probe = (probeKind: ProbeKind, axis: ProbeAxis, score: number | null): ProbeResult => ({
  probeId: `gprb-${probeKind}`,
  runId: RUN.runId,
  probeKind,
  axis,
  status: score === null ? 'skipped' : 'succeeded',
  score,
  reason: `razón interna de ${probeKind}`,
  evidence: {},
  latencyMs: 1,
  errorCode: null,
  probeLayerVersion: PROBE_LAYER_VERSION,
  createdAt: '2026-06-28T00:00:00.000Z'
})

const SCORE = makeScore(
  { ai_visibility: 40, entity_clarity: 50, citation_quality: 60, category_ownership: 30, competitive_sov: 25, message_alignment: 70 },
  { scoreStatus: 'completed' }
)

const FINDINGS = [makeFinding({ brandMentioned: 'yes', competitorsMentioned: ['Acme'], sourceTypes: ['owned'] })]

const PROBES: ProbeResult[] = [
  probe('robots_txt', 'structural', 100),
  probe('json_ld', 'structural', 0),
  probe('llms_txt', 'structural', 0),
  probe('sitemap', 'structural', 100),
  probe('core_web_vitals', 'structural', null),
  probe('well_known_mcp', 'agentic', 0),
  probe('dom_semantics', 'agentic', 80)
]

describe('TASK-1266 · readiness en el reporte', () => {
  it('sin probe results → readiness null (additive, backward-compatible)', () => {
    const report = buildGraderReport({ score: SCORE, findings: FINDINGS, run: RUN })

    expect(report.readiness).toBeNull()
    expect(toPublicGraderReport(report).readiness).toBeNull()
    expect(toClientGraderReport(report).readiness).toBeNull()
  })

  it('con probe results → readiness con dos ejes ortogonales lado a lado', () => {
    const report = buildGraderReport({ score: SCORE, findings: FINDINGS, run: RUN, probeResults: PROBES })

    expect(report.readiness).not.toBeNull()
    expect(report.readiness?.structural.axis).toBe('structural')
    expect(report.readiness?.agentic.axis).toBe('agentic')
    // structural: (30*100 + 30*0 + 15*0 + 10*100)/85 = 47.1; CWV null excluido.
    expect(report.readiness?.structural.overallScore).toBe(47.1)
    expect(report.readiness?.structural.severity).toBe('atencion')
    // agentic: (25*0 + 15*80)/(25+15) = 1200/40 = 30.
    expect(report.readiness?.agentic.overallScore).toBe(30)
  })

  it('INVARIANTE no-blend: el score de percepción NO cambia con/ sin probes', () => {
    const without = buildGraderReport({ score: SCORE, findings: FINDINGS, run: RUN })
    const withProbes = buildGraderReport({ score: SCORE, findings: FINDINGS, run: RUN, probeResults: PROBES })

    expect(withProbes.overallScore).toBe(without.overallScore)
    expect(withProbes.overallSeverity).toBe(without.overallSeverity)
    expect(withProbes.dimensions).toEqual(without.dimensions)
    expect(withProbes.headline).toEqual(without.headline)
  })

  it('public/client readiness es leak-safe: sin reasons internos', () => {
    const report = buildGraderReport({ score: SCORE, findings: FINDINGS, run: RUN, probeResults: PROBES })
    const pub = toPublicGraderReport(report)
    const client = toClientGraderReport(report)

    // El interno SÍ lleva reason por dimensión; el público/cliente NO.
    expect(report.readiness?.structural.dimensions.every(d => 'reason' in d)).toBe(true)
    expect(pub.readiness?.structural.dimensions.every(d => !('reason' in d))).toBe(true)
    expect(client.readiness?.structural.dimensions.every(d => !('reason' in d))).toBe(true)

    // La razón interna cruda no aparece en el JSON público.
    expect(JSON.stringify(pub)).not.toContain('razón interna de')
    // Pero los scores/severidad por eje SÍ viajan (visibilidad del eje lado a lado).
    expect(pub.readiness?.structural.overallScore).toBe(47.1)
    expect(pub.readiness?.agentic.overallScore).toBe(30)
  })

  it('honest degradation: probe null no contamina el promedio del eje', () => {
    const report = buildGraderReport({ score: SCORE, findings: FINDINGS, run: RUN, probeResults: PROBES })
    const cwv = report.readiness?.structural.dimensions.find(d => d.key === 'core_web_vitals')

    expect(cwv?.status).toBe('empty')
    expect(cwv?.score).toBeNull()
    expect(cwv?.severity).toBe('sin_dato')
    expect(report.readiness?.structural.coverage.measured).toBe(4)
  })
})
