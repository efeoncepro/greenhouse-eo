import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import type * as QuestionnaireModule from './questionnaire'

vi.mock('server-only', () => ({}))

// This suite isolates assignment/credential behavior. Real capture and DB immutability
// are exercised in questionnaire.test.ts and questionnaire.live.test.ts.
vi.mock('./questionnaire', async importOriginal => {
  const actual = await importOriginal<typeof QuestionnaireModule>()

  return { ...actual, captureQuestionnaire: vi.fn(async () => actual.buildQuestionnaireSnapshot([{
    module_id: 'module-fixture', competency_id: 'competency-fixture', question_id: 'question-fixture',
    level: 'avanzado', type: 'open_text', prompt: 'Fixture', options_json: [], rubric_json: {}, answer_key_json: {},
  }])) }
})
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: vi.fn(),
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))

import {
  insertCandidateTest,
  reissueCandidateTestTokenForEmailWithClient,
  rotateCandidateTestTokenForAccessRecoveryWithClient,
} from './instances'

const assessmentRow = {
  assessment_id: 'asmt-1',
  public_id: 'EO-ASM-0001',
  application_id: 'happ-1',
  template_id: 'atpl-1',
  method: 'candidate_test',
  evaluator_user_id: null,
  status: 'assigned',
  time_limit_minutes: 45,
  accommodations_json: {},
  started_at: null,
  submitted_at: null,
  created_by: 'user-1',
  created_at: '2026-08-19T10:00:00.000Z',
  updated_at: '2026-08-19T10:00:00.000Z',
}

const clientWithRows = (rows: unknown[]) => ({
  query: vi.fn(async () => ({ rows })),
}) as unknown as PoolClient

describe('assessment credential versions', () => {
  it('writes a fresh UUID beside every initial candidate credential', async () => {
    const client = clientWithRows([assessmentRow])

    vi.mocked(client.query).mockResolvedValueOnce({ rows: [] } as never)

    await insertCandidateTest(client, { applicationId: 'happ-1', templateId: 'atpl-1' }, 'user-1')

    const [sql, values] = vi.mocked(client.query).mock.calls.find(call => String(call[0]).includes('INSERT INTO')) as unknown as [string, unknown[]]

    expect(sql).toContain('access_token_version_id')
    expect(values[3]).toMatch(/^[a-f0-9-]{36}$/)
  })

  it('writes a new UUID on assignment-email reissue', async () => {
    const client = clientWithRows([{ assessment_id: 'asmt-1', time_limit_minutes: 45 }])

    await reissueCandidateTestTokenForEmailWithClient(client, 'asmt-1')
    const [sql, values] = vi.mocked(client.query).mock.calls[0] as unknown as [string, unknown[]]

    expect(sql).toContain('access_token_version_id = $3::uuid')
    expect(values[2]).toMatch(/^[a-f0-9-]{36}$/)
  })

  it('uses the recovery receipt version exactly instead of generating another identity', async () => {
    const client = clientWithRows([{ assessment_id: 'asmt-1', time_limit_minutes: 45 }])
    const tokenVersionId = '11111111-1111-4111-8111-111111111111'

    await rotateCandidateTestTokenForAccessRecoveryWithClient(client, {
      assessmentId: 'asmt-1',
      expectedStatus: 'sent',
      resultingStatus: 'sent',
      expiresAt: new Date('2026-08-20T10:00:00.000Z'),
      tokenVersionId,
    })
    const [sql, values] = vi.mocked(client.query).mock.calls[0] as unknown as [string, unknown[]]

    expect(sql).toContain('access_token_version_id = $3::uuid')
    expect(values[2]).toBe(tokenVersionId)
  })
})
