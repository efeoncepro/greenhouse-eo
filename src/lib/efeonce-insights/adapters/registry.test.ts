import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ModuleReportAdapterV1 } from './contract'
import { hasInsightAdapter, listRegisteredInsightModules, registerInsightAdapter, resolveInsightAdapter, unregisterInsightAdapter } from './registry'

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const fixtureAdapter: ModuleReportAdapterV1 = {
  describe: () => ({ module: 'seo', version: 'fixture_v1', granularities: ['period'], dimensions: [], suggestedSections: ['fixture'] }),
  collect: async input => ({
    facts: [
      {
        factVersion: 'evidence_fact_v1',
        factId: `fixture.metric.${input.window.start}_${input.window.endExclusive}`,
        module: 'seo',
        metricId: 'metric',
        label: 'Fixture',
        value: 42,
        unit: 'count',
        numerator: null,
        denominator: null,
        population: 'fixture',
        source: 'fixture',
        method: { name: 'fixture', version: '1' },
        coverage: { kind: 'complete', ratio: 1, populationSize: 1 },
        freshness: { asOf: input.window.endInclusive },
        observation: 'observed',
        window: { start: input.window.start, endExclusive: input.window.endExclusive, granularity: 'period', partial: false },
        evidenceRef: 'fixture:1',
        comparisonFactId: null
      }
    ],
    sources: [],
    rejections: []
  })
}

describe('TASK-1845 — registry de adapters', () => {
  afterEach(() => unregisterInsightAdapter('fixture'))

  it('registra los tres módulos canónicos de forma lazy', () => {
    expect(listRegisteredInsightModules()).toEqual(['aeo', 'ico', 'seo'])
  })

  it('un cuarto adapter (fixture) se integra sin tocar el orquestador y el orquestador lo consume', async () => {
    registerInsightAdapter('fixture', async () => fixtureAdapter)

    expect(hasInsightAdapter('fixture')).toBe(true)
    expect((await resolveInsightAdapter('fixture')).describe().version).toBe('fixture_v1')

    const { collectInsightEvidence } = await import('./collect-evidence')
    const { resolveInsightWindows } = await import('../window')
    const windows = resolveInsightWindows({ start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'UTC' }, { kind: 'none' }, new Date('2026-09-15T00:00:00Z'))

    const content = await collectInsightEvidence({ organizationId: 'org-x', audience: 'client', modules: ['fixture' as never], windows, projectIds: [] })

    expect(content.facts).toHaveLength(1)
    expect(content.facts[0]!.factId).toBe('fixture.metric.2026-08-01_2026-09-01')
  })

  it('un módulo sin adapter produce un rechazo del módulo, no una caída de la edición', async () => {
    const { collectInsightEvidence } = await import('./collect-evidence')
    const { resolveInsightWindows } = await import('../window')
    const windows = resolveInsightWindows({ start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'UTC' }, { kind: 'none' }, new Date('2026-09-15T00:00:00Z'))

    const content = await collectInsightEvidence({ organizationId: 'org-x', audience: 'client', modules: ['nope' as never], windows, projectIds: [] })

    expect(content.facts).toEqual([])
    expect(content.rejections).toEqual([expect.objectContaining({ module: 'nope', reason: 'no_data' })])
  })
})
