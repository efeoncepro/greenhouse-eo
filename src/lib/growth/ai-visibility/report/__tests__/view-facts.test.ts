import { describe, expect, it } from 'vitest'

import { SAMPLE_PUBLIC_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'

import type { PublicGraderReport } from '../contracts'
import {
  PUBLIC_ENGINE_ROSTER,
  PUBLIC_ENGINE_ROSTER_COVERS_PROVIDER_IDS
} from '../engine-roster'
import { buildPublicReportViewFacts } from '../view-facts'

const cloneReport = (): PublicGraderReport => structuredClone(SAMPLE_PUBLIC_REPORT)

describe('growth/ai-visibility/report — public view facts (TASK-1331)', () => {
  it('mantiene el roster público en paridad con los provider ids del grader', () => {
    expect(PUBLIC_ENGINE_ROSTER_COVERS_PROVIDER_IDS).toBe(true)
    expect(PUBLIC_ENGINE_ROSTER).toEqual(['openai', 'anthropic', 'gemini', 'perplexity', 'google_ai_overview'])
  })

  it('deriva engine coverage y Share of Model desde providerPresence + provenance', () => {
    const facts = buildPublicReportViewFacts(SAMPLE_PUBLIC_REPORT)

    expect(facts.engineCoverage.providers).toHaveLength(5)
    expect(facts.engineCoverage.providers.map(provider => provider.displayId)).toEqual([
      'chatgpt',
      'claude',
      'gemini',
      'perplexity',
      'google_ai_overview'
    ])
    expect(facts.engineCoverage.providers.find(provider => provider.displayId === 'chatgpt')).toMatchObject({
      providerId: 'openai',
      label: 'ChatGPT',
      surface: 'answer_engines',
      status: 'measured_with_mentions',
      resolved: 24,
      present: 18,
      mentionRate: 75
    })
    expect(facts.engineCoverage.providers.find(provider => provider.displayId === 'claude')).toMatchObject({
      providerId: 'anthropic',
      label: 'Claude',
      mentionRate: 71
    })
    expect(facts.engineCoverage.providers.find(provider => provider.displayId === 'gemini')).toMatchObject({
      mentionRate: 79
    })
    expect(facts.engineCoverage.providers.find(provider => provider.displayId === 'perplexity')).toMatchObject({
      mentionRate: 58
    })
    expect(facts.engineCoverage.providers.find(provider => provider.displayId === 'google_ai_overview')).toMatchObject({
      status: 'not_sampled',
      resolved: null,
      present: null,
      mentionRate: null
    })
    expect(facts.engineCoverage.summary).toEqual({
      roster: 5,
      sampled: 4,
      resolved: 96,
      present: 68,
      shareOfModel: 71,
      strongestDisplayId: 'gemini',
      weakestMeasuredDisplayId: 'perplexity'
    })
  })

  it('distingue no_response y measured_without_mentions sin colapsarlos a cero falso', () => {
    const report = cloneReport()

    report.providerPresence = [
      { provider: 'openai', resolved: 0, present: 0 },
      { provider: 'anthropic', resolved: 5, present: 0 }
    ]
    report.provenance = { ...report.provenance, providersSampled: ['openai', 'anthropic'] }

    const facts = buildPublicReportViewFacts(report)

    expect(facts.engineCoverage.providers.find(provider => provider.displayId === 'chatgpt')).toMatchObject({
      status: 'no_response',
      resolved: 0,
      present: 0,
      mentionRate: null
    })
    expect(facts.engineCoverage.providers.find(provider => provider.displayId === 'claude')).toMatchObject({
      status: 'measured_without_mentions',
      resolved: 5,
      present: 0,
      mentionRate: 0
    })
  })

  it('degrada a cobertura honesta cuando no hay motores muestreados', () => {
    const report = cloneReport()

    report.providerPresence = []
    report.provenance = { ...report.provenance, providersSampled: [] }

    const facts = buildPublicReportViewFacts(report)

    expect(facts.engineCoverage.providers.every(provider => provider.status === 'not_sampled')).toBe(true)
    expect(facts.engineCoverage.summary.shareOfModel).toBeNull()
    expect(facts.engineCoverage.summary.strongestDisplayId).toBeNull()
    expect(facts.engineCoverage.summary.weakestMeasuredDisplayId).toBeNull()
  })

  it('expone citation totals globales y degrada snapshots viejos a null', () => {
    const current = buildPublicReportViewFacts(SAMPLE_PUBLIC_REPORT)
    const oldSnapshot = cloneReport()

    delete oldSnapshot.citationSourceBreakdown.classificationTotals

    expect(current.citationTotals).toMatchObject({
      totalCitations: 45,
      uniqueDomains: 4,
      ownDomainShare: 32,
      ownDomain: 9,
      competitor: 7,
      thirdParty: 18,
      ugc: 11
    })
    expect(buildPublicReportViewFacts(oldSnapshot).citationTotals).toMatchObject({
      ownDomain: null,
      competitor: null,
      thirdParty: null,
      ugc: null
    })
  })

  it('deriva competitive benchmark, readiness, dimensiones y share facts', () => {
    const facts = buildPublicReportViewFacts(SAMPLE_PUBLIC_REPORT, {
      reportUrl: 'https://think.efeoncepro.com/brand-visibility/r/grt-fixture'
    })

    expect(facts.competitiveBenchmark.brandShare).toBe(22.2)
    expect(facts.competitiveBenchmark.brandRank).toBe(3)
    expect(facts.competitiveBenchmark.leaderName).toBe('Competidor A')
    expect(facts.competitiveBenchmark.leaderGap).toBe(16)
    expect(facts.sentimentFacts).toMatchObject({ evaluated: 100, net: 'neutral' })
    expect(facts.readinessSummary.agenticScore).toBeNull()
    expect(facts.dimensionHighlights.critical).toEqual([
      { key: 'citation_quality', label: 'Citation Quality', score: 32 }
    ])
    expect(facts.dimensionHighlights.unmeasured).toEqual([
      { key: 'message_alignment', label: 'Message Alignment' }
    ])
    expect(facts.shareFacts).toMatchObject({
      reportUrl: 'https://think.efeoncepro.com/brand-visibility/r/grt-fixture',
      graderUrl: 'https://efeoncepro.com/aeo-2/',
      scoreText: '63/100',
      shareOfModelText: '71% Share of Model',
      citabilityText: '32% citas propias',
      providersText: 'ChatGPT · Claude · Gemini · Perplexity'
    })
  })
})
