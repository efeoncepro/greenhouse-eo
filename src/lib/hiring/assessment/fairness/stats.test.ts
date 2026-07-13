import { describe, expect, it } from 'vitest'

import { buildSelectionFairnessReport } from './stats'

const base = {
  stage: 'selected' as const,
  templateId: null,
  windowMonths: 1,
  currentFrom: '2026-07-01',
  currentTo: '2026-08-01',
  previousFrom: '2026-06-01',
  previousTo: '2026-07-01',
  computedAt: '2026-07-13T00:00:00.000Z',
}

describe('selection fairness stats (TASK-1365)', () => {
  it('aplica la regla 4/5 y calcula drift contra la ventana anterior', () => {
    const report = buildSelectionFairnessReport({
      ...base,
      current: [
        { dimensionKey: 'dimension_a', categoryKey: 'group_a', eligibleCount: 20, advancedCount: 10 },
        { dimensionKey: 'dimension_a', categoryKey: 'group_b', eligibleCount: 20, advancedCount: 5 },
      ],
      previous: [
        { dimensionKey: 'dimension_a', categoryKey: 'group_a', eligibleCount: 20, advancedCount: 10 },
        { dimensionKey: 'dimension_a', categoryKey: 'group_b', eligibleCount: 20, advancedCount: 9 },
      ],
    })

    expect(report.verdict).toBe('adverse_impact')
    expect(report.signal?.signalId).toBe('assessment.fairness.adverse_impact_detected')
    expect(report.dimensions[0]?.groups).toEqual([
      expect.objectContaining({ categoryKey: 'group_a', selectionRate: 0.5, impactRatio: 1, adverseImpact: false }),
      expect.objectContaining({
        categoryKey: 'group_b',
        selectionRate: 0.25,
        impactRatio: 0.5,
        previousSelectionRate: 0.45,
        rateDrift: -0.2,
        impactRatioDrift: -0.4,
        adverseImpact: true,
      }),
    ])
  })

  it('suprime una dimensión completa si menos de dos grupos alcanzan k=10', () => {
    const report = buildSelectionFairnessReport({
      ...base,
      current: [
        { dimensionKey: 'dimension_a', categoryKey: 'reportable', eligibleCount: 10, advancedCount: 5 },
        { dimensionKey: 'dimension_a', categoryKey: 'small_group', eligibleCount: 9, advancedCount: 1 },
      ],
      previous: [],
    })

    expect(report.verdict).toBe('insufficient_sample')
    expect(report.dimensions).toEqual([])
    expect(JSON.stringify(report)).not.toContain('small_group')
  })

  it('no inventa adverse impact cuando ningún grupo tuvo selecciones', () => {
    const report = buildSelectionFairnessReport({
      ...base,
      current: [
        { dimensionKey: 'dimension_a', categoryKey: 'group_a', eligibleCount: 10, advancedCount: 0 },
        { dimensionKey: 'dimension_a', categoryKey: 'group_b', eligibleCount: 10, advancedCount: 0 },
      ],
      previous: [],
    })

    expect(report.verdict).toBe('monitoring')
    expect(report.signal).toBeNull()
    expect(report.dimensions[0]?.groups.every((group) => group.impactRatio === null)).toBe(true)
  })
})
