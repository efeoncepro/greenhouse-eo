import { describe, expect, it } from 'vitest'

import { KNOWLEDGE_GOLDEN_QUESTIONS } from './golden-questions'
import { KNOWLEDGE_SEARCH_MODES } from './mode'

// Structural test (corre en CI sin PG): el set de golden questions es válido y
// cubre los casos canónicos. El eval harness real vive en golden-questions.live.test.ts.
describe('knowledge golden questions — structure (TASK-1083)', () => {
  it('has unique ids', () => {
    const ids = KNOWLEDGE_GOLDEN_QUESTIONS.map(q => q.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each case has a query, a valid mode and at least one expectation', () => {
    for (const question of KNOWLEDGE_GOLDEN_QUESTIONS) {
      expect(question.query.trim().length).toBeGreaterThan(0)
      expect(KNOWLEDGE_SEARCH_MODES).toContain(question.mode)

      const hasExpectation =
        Boolean(question.expectAnyTitleIncludes) ||
        Boolean(question.mustNotReturnTitleIncludes) ||
        question.expectNoAnswer === true ||
        typeof question.expectDeniedAtLeast === 'number'

      expect(hasExpectation, `${question.id} has no expectation`).toBe(true)
    }
  })

  it('no-answer cases do not also expect a returned source', () => {
    for (const question of KNOWLEDGE_GOLDEN_QUESTIONS.filter(q => q.expectNoAnswer)) {
      expect(question.expectAnyTitleIncludes, `${question.id} mixes no-answer with expected source`).toBeUndefined()
    }
  })

  it('covers correct-source, wrong-source, no-answer and sensitive-escalation', () => {
    expect(KNOWLEDGE_GOLDEN_QUESTIONS.some(q => q.expectAnyTitleIncludes)).toBe(true)
    expect(KNOWLEDGE_GOLDEN_QUESTIONS.some(q => q.mustNotReturnTitleIncludes)).toBe(true)
    expect(KNOWLEDGE_GOLDEN_QUESTIONS.some(q => q.expectNoAnswer)).toBe(true)
    expect(KNOWLEDGE_GOLDEN_QUESTIONS.some(q => q.mode === 'agentic' && q.expectDeniedAtLeast)).toBe(true)
  })
})
