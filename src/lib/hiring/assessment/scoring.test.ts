import { describe, expect, it } from 'vitest'

import { computeObjectiveScore } from './scoring'

// Pure unit test (no PG) — CI-safe regression guard for the objective auto-scoring logic.
describe('computeObjectiveScore — objective auto-scoring (0-100)', () => {
  it('single_choice: 100 if the selected option matches the key, else 0', () => {
    expect(computeObjectiveScore('single_choice', { correct: 'b' }, { selected: 'b' })).toBe(100)
    expect(computeObjectiveScore('single_choice', { correct: 'b' }, { selected: 'a' })).toBe(0)
    expect(computeObjectiveScore('single_choice', { correct: 'b' }, {})).toBe(0)
  })

  it('multi_choice: rewards hits, penalizes false positives, normalized by correct count', () => {
    expect(computeObjectiveScore('multi_choice', { correct: ['a', 'b'] }, { selected: ['a', 'b'] })).toBe(100)
    expect(computeObjectiveScore('multi_choice', { correct: ['a', 'b'] }, { selected: ['a'] })).toBe(50)
    // one hit + one false positive → (1 - 1) / 2 = 0
    expect(computeObjectiveScore('multi_choice', { correct: ['a', 'b'] }, { selected: ['a', 'x'] })).toBe(0)
    // all wrong → clamped at 0
    expect(computeObjectiveScore('multi_choice', { correct: ['a', 'b'] }, { selected: ['x', 'y'] })).toBe(0)
  })

  it('likert: value/max * 100 (default max 5)', () => {
    expect(computeObjectiveScore('likert', {}, { value: 5 })).toBe(100)
    expect(computeObjectiveScore('likert', {}, { value: 4 })).toBe(80)
    expect(computeObjectiveScore('likert', { max: 10 }, { value: 5 })).toBe(50)
    expect(computeObjectiveScore('likert', {}, { value: 0 })).toBe(0)
  })

  it('open_text / situational are NOT objective → null (human-rated)', () => {
    expect(computeObjectiveScore('open_text', {}, { text: 'anything' })).toBeNull()
    expect(computeObjectiveScore('situational', {}, { choice: 'a' })).toBeNull()
  })
})
