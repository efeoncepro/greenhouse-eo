import { describe, expect, it } from 'vitest'

import {
  computeClassificationRisk,
  deriveFactorRiskLevel,
  isClassificationRiskBlocking,
  shouldAutoActivateOnOnboard
} from './classification-risk'

describe('contractor classification risk gate', () => {
  it('never auto-clears an unreviewed engagement with no factors', () => {
    expect(computeClassificationRisk({ factors: {}, reviewed: false })).toBe('needs_review')
  })

  it('clears only when reviewed AND zero factors', () => {
    expect(computeClassificationRisk({ factors: {}, reviewed: true })).toBe('clear')
  })

  it('escalates to legal_review_required on material subordination (schedule + supervision)', () => {
    const risk = computeClassificationRisk({
      factors: { imposedFixedSchedule: true, directSupervision: true },
      reviewed: true
    })

    expect(risk).toBe('legal_review_required')
  })

  it('escalates on exclusivity + economic dependency', () => {
    expect(
      deriveFactorRiskLevel({ exclusivity: true, economicDependency: true })
    ).toBe('legal_review_required')
  })

  it('escalates on internal role indistinguishable alone', () => {
    expect(deriveFactorRiskLevel({ internalRoleIndistinguishable: true })).toBe(
      'legal_review_required'
    )
  })

  it('does not escalate to legal_review on a single soft subordination signal', () => {
    expect(deriveFactorRiskLevel({ imposedFixedSchedule: true })).toBe('clear')
    expect(deriveFactorRiskLevel({ directSupervision: true })).toBe('clear')
    expect(deriveFactorRiskLevel({ exclusivity: true })).toBe('clear')
  })

  it('flags needs_review for soft signals (continuity / recurring without deliverables)', () => {
    expect(deriveFactorRiskLevel({ immediateEmployeeContinuity: true })).toBe('needs_review')
    expect(deriveFactorRiskLevel({ recurringPaymentsWithoutDeliverables: true })).toBe(
      'needs_review'
    )
  })

  it('legal_review_required is sticky even when reviewed (factors still present)', () => {
    const risk = computeClassificationRisk({
      factors: { internalRoleIndistinguishable: true },
      reviewed: true
    })

    expect(risk).toBe('legal_review_required')
  })

  it('block override beats everything', () => {
    expect(
      computeClassificationRisk({ factors: {}, reviewed: true, block: true })
    ).toBe('blocked')
  })

  it('isClassificationRiskBlocking is true only for legal_review_required and blocked', () => {
    expect(isClassificationRiskBlocking('clear')).toBe(false)
    expect(isClassificationRiskBlocking('needs_review')).toBe(false)
    expect(isClassificationRiskBlocking('legal_review_required')).toBe(true)
    expect(isClassificationRiskBlocking('blocked')).toBe(true)
  })

  it('shouldAutoActivateOnOnboard activates clear/needs_review, retains blocking (TASK-985)', () => {
    // clear + needs_review NO son bloqueantes → auto-activar al onboardear.
    expect(shouldAutoActivateOnOnboard('clear')).toBe(true)
    expect(shouldAutoActivateOnOnboard('needs_review')).toBe(true)
    // legal_review_required + blocked → retener en draft para revisión legal.
    expect(shouldAutoActivateOnOnboard('legal_review_required')).toBe(false)
    expect(shouldAutoActivateOnOnboard('blocked')).toBe(false)
  })
})
