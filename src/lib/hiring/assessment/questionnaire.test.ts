import { describe, expect, it, vi } from 'vitest'
import type { PoolClient } from 'pg'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn() }))

import { buildQuestionnaireSnapshot, captureQuestionnaire, parseQuestionnaireSnapshot, summarizeQuestionnaire } from './questionnaire'
import { buildPublicQuestion } from './store'

const row = {
  module_id: 'module-1', competency_id: 'competency-1', question_id: 'question-1',
  level: 'avanzado', type: 'open_text', prompt: 'Original prompt', options_json: [],
  competency_key: 'seo', competency_name: 'SEO', competency_category: 'skill',
  competency_description: 'Description', target_level: 'avanzado', weight: 100,
  question_rank: 1, module_rank: 1, answer_key_json: { correct: 'private-key' },
  rubric_json: { criteria: ['private-rubric'] },
}

describe('immutable assessment questionnaire', () => {
  it('captures sensitive scoring content but public projection excludes it', () => {
    const snapshot = buildQuestionnaireSnapshot([row])

    expect(snapshot.rows[0].rubric_json).toEqual(row.rubric_json)

    const publicQuestion = buildPublicQuestion({
      questionId: row.question_id, competencyId: row.competency_id, level: 'avanzado',
      type: 'open_text', prompt: row.prompt, options: [], answerKey: row.answer_key_json,
      rubric: row.rubric_json, status: 'active', createdBy: null, createdAt: '', updatedAt: '',
    })

    expect(JSON.stringify(publicQuestion)).not.toMatch(/private-key|private-rubric|rubric|answerKey/)
  })

  it('verifies a JSONB-equivalent reordered snapshot and rejects changed rubric', () => {
    const snapshot = buildQuestionnaireSnapshot([row])
    const reordered = { ...snapshot, rows: [Object.fromEntries(Object.entries(row).reverse())] }

    expect(parseQuestionnaireSnapshot(reordered)?.contentDigest).toBe(snapshot.contentDigest)
    expect(() => parseQuestionnaireSnapshot({ ...snapshot, rows: [{ ...row, rubric_json: {} }] })).toThrow()
  })

  it('only null means legacy; invalid or empty persisted snapshots never fall back', () => {
    expect(parseQuestionnaireSnapshot(null)).toBeNull()

    for (const malformed of [{}, { version: 2, rows: [row] }, { version: 1, rows: [] }]) {
      expect(() => parseQuestionnaireSnapshot(malformed)).toThrow()
    }
  })

  it('rejects empty modules and policy drift before assignment', () => {
    expect(() => buildQuestionnaireSnapshot([])).toThrow()
    expect(() => buildQuestionnaireSnapshot([{ ...row, question_id: null }])).toThrow()
    const digest = summarizeQuestionnaire([row]).digest

    expect(() => buildQuestionnaireSnapshot([{ ...row, prompt: 'Changed' }], digest)).toThrow()
    expect(buildQuestionnaireSnapshot([row], digest).policyDigest).toBe(digest)
  })

  it('locks retained question identities and rejects deletion between resolve and lock', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] })

    await expect(captureQuestionnaire({ query } as unknown as PoolClient, 'template-1')).rejects.toMatchObject({ code: 'assessment_questionnaire_changed' })
  })
})
