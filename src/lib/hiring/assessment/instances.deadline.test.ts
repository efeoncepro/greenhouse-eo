import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: vi.fn(),
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))

import type { PoolClient } from 'pg'

import { saveResponseWithClient, startAssessmentWithClient } from './instances'

const row = (overrides: Record<string, unknown> = {}) => ({
  assessment_id: 'asmt-1', public_id: 'EO-ASM-1', application_id: 'app-1', template_id: 'tpl-1',
  method: 'candidate_test', evaluator_user_id: null, status: 'in_progress', time_limit_minutes: 45,
  accommodations_json: {}, started_at: '2026-08-19T10:00:00.000Z', submitted_at: null,
  created_by: null, created_at: '2026-08-19T09:00:00.000Z', updated_at: '2026-08-19T10:00:00.000Z',
  database_now: '2026-08-19T10:44:59.000Z', effective_expiry: '2026-08-19T11:15:00.000Z',
  ...overrides,
})

describe('TASK-1746 assessment deadline primitives', () => {
  it('can start one second before start-by and fixes started_at exactly once under lock', async () => {
    const started = row({ status: 'in_progress', started_at: '2026-08-19T10:00:00.000Z' })

    const query = vi.fn(async (sql: string) => {
      if (sql.includes('effective_expiry')) {
        return { rows: [row({ status: 'sent', database_now: '2026-08-19T09:59:59.000Z', effective_expiry: '2026-08-19T10:00:00.000Z' })] }
      }

      if (sql.includes("SET status = 'in_progress'")) return { rows: [started] }

      return { rows: [] }
    })

    const client = { query } as unknown as PoolClient

    await expect(startAssessmentWithClient(client, 'asmt-1')).resolves.toMatchObject({
      outcome: 'ok', value: { status: 'in_progress', startedAt: started.started_at },
    })

    const sql = query.mock.calls.map(call => String(call[0])).join('\n')

    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('started_at = COALESCE(started_at, clock_timestamp())')
  })

  it('serializes repeated starts and preserves the first started_at', async () => {
    const firstStartedAt = '2026-08-19T10:00:00.000Z'
    let status = 'sent'

    const query = vi.fn(async (sql: string) => {
      if (sql.includes('effective_expiry')) {
        return { rows: [row({ status, started_at: status === 'sent' ? null : firstStartedAt })] }
      }

      if (sql.includes("SET status = 'in_progress'")) {
        status = 'in_progress'

        return { rows: [row({ status, started_at: firstStartedAt })] }
      }

      return { rows: [] }
    })

    const client = { query } as unknown as PoolClient
    const first = await startAssessmentWithClient(client, 'asmt-1')
    const second = await startAssessmentWithClient(client, 'asmt-1')

    expect(first).toMatchObject({ outcome: 'ok', value: { startedAt: firstStartedAt } })
    expect(second).toMatchObject({ outcome: 'ok', value: { startedAt: firstStartedAt } })
    expect(query.mock.calls.filter(call => String(call[0]).includes("SET status = 'in_progress'"))).toHaveLength(1)
  })

  it('rejects save in the 30-minute submit grace without writing a response', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('effective_expiry')) return { rows: [row()] }

      if (sql.includes('AS answer_deadline')) {
        return { rows: [{
          status: 'in_progress', answer_deadline: '2026-08-19T10:45:00.000Z',
          close_deadline: '2026-08-19T11:15:00.000Z', database_now: '2026-08-19T10:45:00.000Z',
        }] }
      }

      return { rows: [] }
    })

    const client = { query } as unknown as PoolClient

    await expect(saveResponseWithClient(client, {
      assessmentId: 'asmt-1', competencyId: 'cmp-1', questionId: 'q-1',
      questionType: 'single_choice', answer: { selected: 'a' },
    })).rejects.toMatchObject({ code: 'assessment_not_open' })

    expect(query.mock.calls.some(call => String(call[0]).includes('hiring_assessment_response'))).toBe(false)
  })

  it('allows no-limit saves before the canonical 24-hour close deadline', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('effective_expiry')) return { rows: [row({ time_limit_minutes: null })] }

      if (sql.includes('AS answer_deadline')) {
        return { rows: [{
          status: 'in_progress', answer_deadline: null,
          close_deadline: '2026-08-20T10:00:00.000Z', database_now: '2026-08-20T09:59:59.000Z',
        }] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_question')) return { rows: [{ type: 'single_choice' }] }

      if (sql.includes('INSERT INTO greenhouse_hiring.hiring_assessment_response')) {
        return { rows: [{
          response_id: 'resp-1', assessment_id: 'asmt-1', question_id: 'q-1', competency_id: 'cmp-1',
          answer_json: { selected: 'a' }, auto_score: null, needs_human_rating: false,
          human_score: null, scored_by: null, scored_at: null,
          created_at: '2026-08-20T09:59:59.000Z', updated_at: '2026-08-20T09:59:59.000Z',
        }] }
      }

      return { rows: [] }
    })

    await expect(saveResponseWithClient({ query } as unknown as PoolClient, {
      assessmentId: 'asmt-1', competencyId: 'cmp-1', questionId: 'q-1',
      questionType: 'single_choice', answer: { selected: 'a' },
    })).resolves.toMatchObject({ outcome: 'ok', value: { responseId: 'resp-1' } })
  })
})
