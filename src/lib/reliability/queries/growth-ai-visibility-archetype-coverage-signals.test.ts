import { describe, expect, it } from 'vitest'

import {
  GROWTH_AI_VISIBILITY_ARCHETYPE_COVERAGE_GAP_SIGNAL_ID,
  getGrowthAiVisibilityArchetypeCoverageSignals
} from './growth-ai-visibility-archetype-coverage-signals'

/**
 * TASK-1292 — el drift signal de cobertura por arquetipo es determinista (PURO,
 * sin PG/LLM): en steady (matriz cubierta) reporta `ok`. Corre en CI.
 */
describe('growth.ai_visibility.archetype_coverage_gap signal', () => {
  it('en steady (cobertura completa) reporta severidad ok y gaps=0', async () => {
    const signals = await getGrowthAiVisibilityArchetypeCoverageSignals()

    expect(signals).toHaveLength(1)

    const signal = signals[0]

    expect(signal?.signalId).toBe(GROWTH_AI_VISIBILITY_ARCHETYPE_COVERAGE_GAP_SIGNAL_ID)
    expect(signal?.kind).toBe('test_lane')
    expect(signal?.moduleKey).toBe('growth')
    expect(signal?.severity).toBe('ok')

    const gaps = signal?.evidence?.find(item => item.label === 'gaps')

    expect(gaps?.value).toBe('0')
  })
})
