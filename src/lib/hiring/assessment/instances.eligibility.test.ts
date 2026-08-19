import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: vi.fn(),
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))

import type { PoolClient } from 'pg'

import { resolveAssessmentByTokenWithClient } from './instances'

const assessmentRow = {
  assessment_id: 'asmt-1', public_id: 'EO-ASM-1', application_id: 'app-1', template_id: 'tpl-1',
  method: 'candidate_test', evaluator_user_id: null, status: 'sent', time_limit_minutes: 45,
  accommodations_json: {}, started_at: null, submitted_at: null, created_by: null,
  created_at: '2026-08-19T09:00:00.000Z', updated_at: '2026-08-19T09:00:00.000Z',
  effective_expiry: '2026-08-20T10:00:00.000Z',
}

const clientFor = (input: { stage?: string; decision?: string | null; consent?: string }) => {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('access_token_hash = $1')) return { rows: [assessmentRow] }

    if (sql.includes('hiring_application')) {
      return { rows: [{
        candidate_facet_id: 'hcf-1', stage: input.stage ?? 'screening', decision: input.decision ?? null,
      }] }
    }

    if (sql.includes('candidate_facet')) return { rows: [{ consent_status: input.consent ?? 'granted' }] }

    if (sql.includes('clock_timestamp() AS database_now')) {
      return { rows: [{ database_now: '2026-08-19T10:00:00.000Z' }] }
    }

    return { rows: [] }
  })

  return { client: { query } as unknown as PoolClient, query }
}

describe('TASK-1746 legacy raw-token eligibility', () => {
  it.each([
    { label: 'terminal stage', input: { stage: 'rejected' } },
    { label: 'decision', input: { decision: 'rejected' } },
    { label: 'withdrawn consent', input: { consent: 'withdrawn' } },
  ])('denies $label after locking canonical lineage', async ({ input }) => {
    const { client, query } = clientFor(input)

    await expect(resolveAssessmentByTokenWithClient(client, 'raw-token')).resolves.toBeNull()

    const sql = query.mock.calls.map(call => String(call[0]))

    expect(sql[0]).toMatch(/hiring_assessment[\s\S]*FOR UPDATE/)
    expect(sql[1]).toMatch(/hiring_application[\s\S]*FOR UPDATE/)
    expect(sql[2]).toMatch(/candidate_facet[\s\S]*FOR UPDATE/)
  })

  it('samples DB time only after assessment, application and facet locks', async () => {
    const { client, query } = clientFor({})

    await expect(resolveAssessmentByTokenWithClient(client, 'raw-token')).resolves.toMatchObject({ assessmentId: 'asmt-1' })

    expect(query.mock.calls.map(call => String(call[0]))[3]).toContain('clock_timestamp() AS database_now')
  })
})
