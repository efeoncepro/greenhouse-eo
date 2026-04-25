import { describe, expect, it } from 'vitest'

import type { ReliabilityModuleSnapshot, ReliabilityOverview } from '@/types/reliability'

import { buildPromptContext, buildPrompts, fingerprintModule, fingerprintOverview } from './build-prompt'

const baseModule = (overrides: Partial<ReliabilityModuleSnapshot> = {}): ReliabilityModuleSnapshot => ({
  moduleKey: 'finance',
  label: 'Finance',
  description: 'desc',
  domain: 'finance',
  status: 'ok',
  confidence: 'high',
  summary: 'all green',
  routes: [],
  apis: [],
  dependencies: [],
  smokeTests: [],
  signals: [],
  signalCounts: { ok: 1, warning: 0, error: 0, unknown: 0, not_configured: 0, awaiting_data: 0 },
  expectedSignalKinds: ['subsystem'],
  missingSignalKinds: [],
  ...overrides
})

const baseOverview = (modules: ReliabilityModuleSnapshot[]): ReliabilityOverview => ({
  generatedAt: '2026-04-25T20:00:00Z',
  modules,
  totals: { totalModules: modules.length, healthy: modules.length, warning: 0, error: 0, unknownOrPending: 0 },
  integrationBoundaries: [],
  notes: []
})

describe('buildPromptContext', () => {
  it('sanitizes PII in summaries and signal labels', () => {
    const overview = baseOverview([
      baseModule({
        summary: 'crash for user@efeonce.com',
        signals: [
          {
            signalId: 'finance.test',
            moduleKey: 'finance',
            kind: 'incident',
            source: 'test',
            label: 'Crash a@b.com',
            severity: 'error',
            summary: 'session 550e8400-e29b-41d4-a716-446655440000 expired',
            observedAt: null,
            evidence: []
          }
        ]
      })
    ])

    const context = buildPromptContext(overview)

    expect(context.modules[0].summary).toBe('crash for <email>')
    expect(context.modules[0].topSignals[0].label).toBe('Crash <email>')
    expect(context.modules[0].topSignals[0].summary).toContain('<uuid>')
  })

  it('caps topSignals to TOP_SIGNALS_PER_MODULE (4)', () => {
    const signals = Array.from({ length: 10 }, (_, i) => ({
      signalId: `s${i}`,
      moduleKey: 'finance' as const,
      kind: 'subsystem' as const,
      source: 'test',
      label: `signal ${i}`,
      severity: 'ok' as const,
      summary: `desc ${i}`,
      observedAt: null,
      evidence: []
    }))

    const overview = baseOverview([baseModule({ signals })])
    const context = buildPromptContext(overview)

    expect(context.modules[0].topSignals).toHaveLength(4)
  })

  it('includes pendingBoundaries count', () => {
    const overview: ReliabilityOverview = {
      ...baseOverview([baseModule()]),
      integrationBoundaries: [
        { taskId: 'TASK-X', moduleKey: 'finance', expectedSignalKind: 'subsystem', expectedSource: 's', status: 'pending', note: 'n' },
        { taskId: 'TASK-Y', moduleKey: 'cloud', expectedSignalKind: 'runtime', expectedSource: 's', status: 'ready', note: 'n' }
      ]
    }

    expect(buildPromptContext(overview).pendingBoundaries).toBe(1)
  })
})

describe('fingerprintModule', () => {
  it('is stable across runs with identical inputs', () => {
    const snapshot = baseModule()

    expect(fingerprintModule(snapshot)).toBe(fingerprintModule(snapshot))
  })

  it('changes when status changes', () => {
    const a = fingerprintModule(baseModule({ status: 'ok' }))
    const b = fingerprintModule(baseModule({ status: 'error' }))

    expect(a).not.toBe(b)
  })

  it('changes when severity counts change', () => {
    const a = fingerprintModule(baseModule({ signalCounts: { ok: 3, warning: 0, error: 0, unknown: 0, not_configured: 0, awaiting_data: 0 } }))
    const b = fingerprintModule(baseModule({ signalCounts: { ok: 0, warning: 0, error: 1, unknown: 0, not_configured: 0, awaiting_data: 0 } }))

    expect(a).not.toBe(b)
  })

  it('changes when missingSignalKinds changes', () => {
    const a = fingerprintModule(baseModule({ missingSignalKinds: [] }))
    const b = fingerprintModule(baseModule({ missingSignalKinds: ['runtime'] }))

    expect(a).not.toBe(b)
  })

  it('is order-insensitive for missingSignalKinds', () => {
    const a = fingerprintModule(baseModule({ missingSignalKinds: ['runtime', 'incident'] }))
    const b = fingerprintModule(baseModule({ missingSignalKinds: ['incident', 'runtime'] }))

    expect(a).toBe(b)
  })
})

describe('fingerprintOverview', () => {
  it('is stable across runs with identical inputs', () => {
    const overview = baseOverview([baseModule()])

    expect(fingerprintOverview(overview)).toBe(fingerprintOverview(overview))
  })

  it('changes when totals change', () => {
    const a = baseOverview([baseModule()])
    const b = { ...a, totals: { ...a.totals, error: 1 } }

    expect(fingerprintOverview(a)).not.toBe(fingerprintOverview(b))
  })
})

describe('buildPrompts', () => {
  it('returns systemPrompt + userPrompt + context', () => {
    const overview = baseOverview([baseModule()])
    const result = buildPrompts(overview)

    expect(result.systemPrompt).toContain('Reliability Control Plane')
    expect(result.userPrompt).toContain('finance')
    expect(result.context.modules).toHaveLength(1)
  })

  it('userPrompt does not contain raw PII when input has it', () => {
    const overview = baseOverview([
      baseModule({ summary: 'fail for user@efeonce.com' })
    ])

    const { userPrompt } = buildPrompts(overview)

    expect(userPrompt).not.toContain('user@efeonce.com')
    expect(userPrompt).toContain('<email>')
  })
})
