import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { computeObjectiveScore, submitAssessmentWithClient } from './scoring'

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

describe('TASK-1746 submit close deadline', () => {
  it('allows submit during the timed 30-minute grace window', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('AS close_deadline')) {
        return { rows: [{
          status: 'in_progress', method: 'candidate_test',
          database_now: '2026-08-19T10:45:00.000Z', close_deadline: '2026-08-19T11:15:00.000Z',
        }] }
      }

      if (sql.includes('hiring_assessment_response r')) return { rows: [] }

      return { rows: [], rowCount: 1 }
    })

    await expect(submitAssessmentWithClient(
      { query } as unknown as PoolClient, 'asmt-1', null,
    )).resolves.toEqual({ outcome: 'ok', value: undefined })

    expect(query.mock.calls.some(call => String(call[0]).includes("status = 'submitted'"))).toBe(true)
  })

  it('expires atomically after close without scoring or submission writes', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('AS close_deadline')) {
        return { rows: [{
          status: 'in_progress', method: 'candidate_test',
          database_now: '2026-08-19T11:15:00.000Z', close_deadline: '2026-08-19T11:15:00.000Z',
        }] }
      }

      return { rows: [], rowCount: 1 }
    })

    await expect(submitAssessmentWithClient(
      { query } as unknown as PoolClient, 'asmt-1', null,
    )).resolves.toEqual({ outcome: 'expired' })

    const sql = query.mock.calls.map(call => String(call[0])).join('\n')

    expect(sql).toContain("status = 'expired'")
    expect(sql).not.toContain("status = 'submitted'")
    expect(sql).not.toContain('hiring_assessment_response r')
  })
})
