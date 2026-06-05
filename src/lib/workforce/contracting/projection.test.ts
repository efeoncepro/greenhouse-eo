import { describe, expect, it } from 'vitest'

import { buildCaseProjection, deriveNextActionCode, deriveRiskLevel, deriveSignatureReadiness } from './projection'

describe('contracting projection', () => {
  it('derives next action per kind + status', () => {
    expect(deriveNextActionCode('offer_letter', 'draft')).toBe('create_draft')
    expect(deriveNextActionCode('offer_letter', 'pending_internal_review')).toBe('approve_offer')
    expect(deriveNextActionCode('employment_contract', 'validation_blocked')).toBe('resolve_blockers')
    expect(deriveNextActionCode('employment_contract', 'ready_for_signature')).toBe('send_to_signature')
    expect(deriveNextActionCode('employment_contract', 'active')).toBe('none')
  })

  it('derives risk level (blockers + legal review gate)', () => {
    expect(deriveRiskLevel({ status: 'validation_blocked', blockerCount: 0, requiresLegalReview: false, hasLegalReviewReference: false })).toBe('high')
    expect(deriveRiskLevel({ status: 'pending_review', blockerCount: 2, requiresLegalReview: false, hasLegalReviewReference: false })).toBe('high')
    expect(deriveRiskLevel({ status: 'pending_review', blockerCount: 0, requiresLegalReview: true, hasLegalReviewReference: false })).toBe('high')
    expect(deriveRiskLevel({ status: 'legal_review', blockerCount: 0, requiresLegalReview: true, hasLegalReviewReference: true })).toBe('medium')
    expect(deriveRiskLevel({ status: 'ai_drafted', blockerCount: 0, requiresLegalReview: false, hasLegalReviewReference: false })).toBe('low')
  })

  it('derives signature readiness (offer = not applicable)', () => {
    expect(deriveSignatureReadiness('offer_letter', 'approved')).toBe('not_applicable')
    expect(deriveSignatureReadiness('employment_contract', 'ready_for_signature')).toBe('ready_for_signature')
    expect(deriveSignatureReadiness('employment_contract', 'fully_signed')).toBe('signed')
    expect(deriveSignatureReadiness('employment_contract', 'ai_drafted')).toBe('not_ready')
  })

  it('builds the full projection', () => {
    const p = buildCaseProjection({
      caseKind: 'employment_contract',
      status: 'legal_review',
      authoritativeLanguage: 'es-CL',
      blockerCount: 0,
      languageParityStatus: 'pass',
      requiresLegalReview: true,
      hasLegalReviewReference: true
    })

    expect(p.nextActionCode).toBe('approve_contract')
    expect(p.riskLevel).toBe('medium')
    expect(p.signatureReadinessStatus).toBe('not_ready')
    expect(p.languageParityStatus).toBe('pass')
  })
})
