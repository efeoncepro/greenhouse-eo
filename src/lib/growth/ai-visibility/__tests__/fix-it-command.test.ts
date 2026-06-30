import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicGraderReport } from '../report/contracts'

vi.mock('server-only', () => ({}))

const calls = {
  getRun: [] as string[],
  getProfile: [] as string[]
}

const PUBLIC_REPORT = {
  reportVersion: 'ai_visibility_report_v1',
  recommendationPackVersion: 'ai_visibility_recommendation_pack_v1',
  audience: 'public',
  gate: { status: 'ready', reason: 'Ready', nextAction: 'Next' },
  headline: { dimensionKey: 'entity_clarity', metric: 'Claridad', value: '40/100', frame: 'Atencion', severity: 'atencion' },
  overallScore: 40,
  overallSeverity: 'atencion',
  findings: [],
  dimensions: [],
  recommendations: [],
  primaryGap: null,
  recommendedMotion: null,
  competitiveSov: { brandMentions: 0, competitors: [] },
  sourceTypeSummary: [],
  providerPresence: [],
  citationInsight: { ownDomainShare: null, findingsWithCitations: 0, findingsCitingOwnDomain: 0 },
  citationSourceBreakdown: { domains: [], totalCitations: 0, uniqueDomains: 0, reason: 'sin_citas_evaluables' },
  categoryTaxonomySummary: {
    taxonomyVersion: 'category_taxonomy_v1',
    status: 'unknown',
    categories: [],
    totalSignals: 0,
    unmappedCount: 0,
    ambiguousCount: 0
  },
  sentimentSummary: { positive: 0, neutral: 0, negative: 0, mixed: 0, evaluated: 0, net: 'sin_dato' },
  positionSummary: { best: null, average: null, ranked: 0 },
  trend: { status: 'sin_historico', reason: 'Sin histórico', previousAsOf: null, overall: null, dimensions: [] },
  readiness: null,
  provenance: {
    asOfDate: '2026-06-28T00:00:00.000Z',
    promptPackVersion: 'prompt-pack.v1',
    scoreVersion: 'ai_visibility_score_v1',
    providersSampled: [],
    promptCount: 0
  },
  disclaimer: 'Diagnóstico.'
} satisfies PublicGraderReport

vi.mock('../report/snapshot', () => ({
  readPublicGraderReport: async () => ({
    reportId: 'grpt-1',
    runId: 'run-from-token',
    reportToken: 'grt-token',
    asOf: '2026-06-28T00:00:00.000Z',
    expiresAt: null,
    publicReport: PUBLIC_REPORT
  })
}))

vi.mock('../report/command', () => ({
  readGraderReport: async () => ({ publicReport: PUBLIC_REPORT })
}))

vi.mock('../store', () => ({
  getGraderRun: async (runId: string) => {
    calls.getRun.push(runId)

    return { runId, profileId: 'profile-1' }
  },
  getGraderProfile: async (profileId: string) => {
    calls.getProfile.push(profileId)

    return {
      brandName: 'Marca',
      websiteUrl: 'https://marca.test',
      market: 'CL',
      locale: 'es-CL',
      category: 'SaaS',
      competitorsDeclared: []
    }
  }
}))

vi.mock('../probes/command', () => ({
  readRunProbes: async () => []
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const enabledEnv = {
  NODE_ENV: 'test',
  GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true',
  GROWTH_AI_VISIBILITY_FIX_IT_ENABLED: 'true'
} as NodeJS.ProcessEnv

beforeEach(() => {
  calls.getRun = []
  calls.getProfile = []
})

describe('TASK-1269 — fix-it command', () => {
  it('public token path resolves the immutable snapshot run id', async () => {
    const { generateFixItArtifactsForPublicToken } = await import('../fix-it/command')

    const result = await generateFixItArtifactsForPublicToken({ reportToken: 'grt-token', env: enabledEnv })

    expect(result?.runId).toBe('run-from-token')
    expect(calls.getRun).toEqual(['run-from-token'])
    expect(calls.getProfile).toEqual(['profile-1'])
    expect(result?.artifacts.length).toBeGreaterThanOrEqual(3)
  })

  it('flag off blocks generation', async () => {
    const { FixItArtifactsError, generateFixItArtifactsForPublicToken } = await import('../fix-it/command')

    await expect(
      generateFixItArtifactsForPublicToken({ reportToken: 'grt-token', env: { NODE_ENV: 'test' } as NodeJS.ProcessEnv })
    ).rejects.toBeInstanceOf(FixItArtifactsError)
  })
})
