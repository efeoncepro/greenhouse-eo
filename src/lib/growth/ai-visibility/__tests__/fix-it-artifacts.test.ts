import { describe, expect, it } from 'vitest'

import { buildFixItArtifacts } from '../fix-it/generators'
import type { ProbeResult } from '../probes/contracts'
import type { PublicGraderReport } from '../report/contracts'

const REPORT: PublicGraderReport = {
  reportVersion: 'ai_visibility_report_v1',
  recommendationPackVersion: 'ai_visibility_recommendation_pack_v1',
  audience: 'public',
  gate: { status: 'ready', reason: 'Ready', nextAction: 'Next' },
  headline: { dimensionKey: 'entity_clarity', metric: 'Claridad de entidad', value: '35/100', frame: 'Atencion', severity: 'atencion' },
  overallScore: 42,
  overallSeverity: 'atencion',
  findings: [],
  dimensions: [],
  recommendations: [
    {
      gapKey: 'low_entity_clarity',
      dimensionKey: 'entity_clarity',
      title: 'Clarificar la entidad de marca',
      action: 'Publicar structured data y alinear perfiles oficiales.',
      motion: 'entity_foundation',
      severity: 'atencion'
    }
  ],
  primaryGap: { gapKey: 'low_entity_clarity', dimensionKey: 'entity_clarity', title: 'Clarificar la entidad', severity: 'atencion' },
  recommendedMotion: 'entity_foundation',
  competitiveSov: { brandMentions: 0, competitors: [] },
  sourceTypeSummary: [],
  providerPresence: [],
  citationInsight: { ownDomainShare: null, findingsWithCitations: 0, findingsCitingOwnDomain: 0 },
  sentimentSummary: { positive: 0, neutral: 0, negative: 0, mixed: 0, evaluated: 0, net: 'sin_dato' },
  positionSummary: { best: null, average: null, ranked: 0 },
  trend: { status: 'sin_historico', reason: 'Sin histórico', previousAsOf: null, overall: null, dimensions: [] },
  readiness: null,
  provenance: {
    asOfDate: '2026-06-28T00:00:00.000Z',
    promptPackVersion: 'prompt-pack.v1',
    scoreVersion: 'ai_visibility_score_v1',
    providersSampled: ['openai'],
    promptCount: 1
  },
  disclaimer: 'Diagnóstico asistido.'
}

const probe = (probeKind: ProbeResult['probeKind'], score: number | null, reason = 'reason'): ProbeResult => ({
  probeId: `probe-${probeKind}`,
  runId: 'run-1',
  probeKind,
  axis: probeKind === 'knowledge_graph' || probeKind === 'wikidata' || probeKind === 'reddit_ugc' ? 'entity' : 'structural',
  status: score === null ? 'failed' : 'succeeded',
  score,
  reason,
  evidence: { safe: true },
  latencyMs: 12,
  probeLayerVersion: 'ai_readiness_probe_v1',
  createdAt: '2026-06-28T00:00:00.000Z'
})

describe('TASK-1269 — fix-it artifacts', () => {
  it('genera JSON-LD válido con Organization y Service sin inventar campos sensibles', () => {
    const artifacts = buildFixItArtifacts(
      {
        brandName: 'Efeonce',
        websiteUrl: 'https://efeoncepro.com',
        market: 'CL',
        locale: 'es-CL',
        category: 'marketing operativo',
        competitorsDeclared: []
      },
      REPORT,
      [probe('json_ld', 0), probe('knowledge_graph', 0)]
    )

    const jsonLd = artifacts.find(artifact => artifact.kind === 'json_ld_starter')

    expect(jsonLd).toBeDefined()
    expect(jsonLd?.publicSafe).toBe(true)

    const parsed = JSON.parse(jsonLd?.content ?? '{}') as { '@graph': Array<Record<string, unknown>> }

    expect(parsed['@graph'].some(node => node['@type'] === 'Organization')).toBe(true)
    expect(parsed['@graph'].some(node => node['@type'] === 'Service')).toBe(true)
    expect(jsonLd?.pendingFields).toContain('same_as_profiles')
    expect(jsonLd?.content).not.toContain('raw provider')
  })

  it('incluye brief de entidad sólo cuando hay gaps de entidad medidos', () => {
    const withoutEntity = buildFixItArtifacts(
      { brandName: 'Marca', websiteUrl: 'marca.test', market: 'CL', locale: 'es-CL', category: null, competitorsDeclared: [] },
      REPORT,
      [probe('json_ld', 0), probe('llms_txt', 0)]
    )

    expect(withoutEntity.some(artifact => artifact.kind === 'entity_action_brief')).toBe(false)

    const withEntity = buildFixItArtifacts(
      { brandName: 'Marca', websiteUrl: 'marca.test', market: 'CL', locale: 'es-CL', category: null, competitorsDeclared: [] },
      REPORT,
      [probe('wikidata', 0)]
    )

    expect(withEntity.some(artifact => artifact.kind === 'entity_action_brief')).toBe(true)
  })

  it('no incluye claims de ranking garantizado ni evidencia cruda', () => {
    const artifacts = buildFixItArtifacts(
      { brandName: 'Marca', websiteUrl: 'https://marca.test', market: 'CL', locale: 'es-CL', category: 'SaaS', competitorsDeclared: ['Competidor'] },
      REPORT,
      [probe('reddit_ugc', 0, 'Internal probe reason that must not be copied verbatim')]
    )

    const serialized = JSON.stringify(artifacts)

    expect(serialized).not.toMatch(/garant/i)
    expect(serialized).not.toContain('Internal probe reason')
    expect(artifacts.every(artifact => artifact.publicSafe)).toBe(true)
  })
})
