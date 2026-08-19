import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { PoolClient } from 'pg'

import {
  exchangePublicAssessmentAccessWithClient,
  resolvePublicAssessmentSessionWithClient,
} from './store'

const VERSION = '11111111-1111-4111-8111-111111111111'
const NOW = '2026-08-19T10:00:00.000Z'
const EXPIRES = '2026-08-20T10:00:00.000Z'

const assessmentRow = (overrides: Record<string, unknown> = {}) => ({
  assessment_id: 'asmt-1',
  application_id: 'happ-1',
  method: 'candidate_test',
  status: 'sent',
  access_token_hash: 'a'.repeat(64),
  access_token_version_id: VERSION,
  token_expires_at: EXPIRES,
  answer_deadline: null,
  close_deadline: null,
  ...overrides,
})

const applicationRow = { candidate_facet_id: 'hcf-1', stage: 'screening', decision: null }
const facetRow = { consent_status: 'granted' }

const sessionRow = (overrides: Record<string, unknown> = {}) => ({
  public_session_id: 'haps-1',
  assessment_id: 'asmt-1',
  access_token_version_id: VERSION,
  status: 'active',
  expires_at: EXPIRES,
  ...overrides,
})

const clientFrom = (resolver: (sql: string, values: unknown[]) => { rows: unknown[]; rowCount?: number }) => ({
  query: vi.fn(async (sql: string, values: unknown[] = []) => resolver(sql, values)),
}) as unknown as PoolClient

describe('public assessment session store', () => {
  it('locks assessment → application → facet and persists only credential digests', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }
      if (sql.includes('WHERE access_token_hash = $1')) return { rows: [assessmentRow()] }
      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }
      if (sql.includes('INSERT INTO greenhouse_hiring.hiring_assessment_public_session')) return { rows: [sessionRow()] }

      return { rows: [] }
    })

    const result = await exchangePublicAssessmentAccessWithClient(client, {
      accessTokenDigest: 'a'.repeat(64),
      sessionTokenDigest: 'b'.repeat(64),
    })

    expect(result?.assessmentId).toBe('asmt-1')
    const calls = vi.mocked(client.query).mock.calls.map(call => String(call[0]))

    expect(calls[0]).toMatch(/hiring_assessment[\s\S]*FOR UPDATE/)
    expect(calls[1]).toMatch(/hiring_application[\s\S]*FOR UPDATE/)
    expect(calls[2]).toMatch(/candidate_facet[\s\S]*FOR UPDATE/)
    expect(calls[3]).toContain('clock_timestamp() AS database_now')
    expect(calls[4]).toContain('hiring_assessment_public_session')
    expect(JSON.stringify(vi.mocked(client.query).mock.calls)).not.toContain('raw-secret')
  })

  it('expires an overdue assessment instead of creating a session', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }

      if (sql.includes('WHERE access_token_hash = $1')) {
        return { rows: [assessmentRow({ token_expires_at: '2026-08-19T09:00:00.000Z' })] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }

      return { rows: [] }
    })

    await expect(exchangePublicAssessmentAccessWithClient(client, {
      accessTokenDigest: 'a'.repeat(64),
      sessionTokenDigest: 'b'.repeat(64),
    })).resolves.toBeNull()

    const sql = vi.mocked(client.query).mock.calls.map(call => String(call[0])).join('\n')

    expect(sql).toContain("SET status = 'expired'")
    expect(sql).not.toContain('INSERT INTO greenhouse_hiring.hiring_assessment_public_session')
  })

  it('revokes a session when credential rotation changed its version', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }
      if (sql.includes('WHERE session_token_hash = $1 AND assessment_id = $2')) return { rows: [sessionRow()] }

      if (sql.includes('SELECT public_session_id, assessment_id')) {
        return { rows: [{ public_session_id: 'haps-1', assessment_id: 'asmt-1' }] }
      }

      if (sql.includes('WHERE assessment_id = $1') && sql.includes('FROM greenhouse_hiring.hiring_assessment')) {
        return { rows: [assessmentRow({ access_token_version_id: '22222222-2222-4222-8222-222222222222' })] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }

      return { rows: [], rowCount: 1 }
    })

    await expect(resolvePublicAssessmentSessionWithClient(client, 'b'.repeat(64))).resolves.toBeNull()
    expect(vi.mocked(client.query).mock.calls.some(call =>
      String(call[0]).includes("SET status = $2")
        && Array.isArray(call[1])
        && (call[1] as unknown[]).includes('revoked'))).toBe(true)
  })

  it('returns an active session only after current lineage, consent and deadline validation', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }
      if (sql.includes('WHERE session_token_hash = $1 AND assessment_id = $2')) return { rows: [sessionRow()] }

      if (sql.includes('SELECT public_session_id, assessment_id')) {
        return { rows: [{ public_session_id: 'haps-1', assessment_id: 'asmt-1' }] }
      }

      if (sql.includes('WHERE assessment_id = $1') && sql.includes('FROM greenhouse_hiring.hiring_assessment')) {
        return { rows: [assessmentRow()] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }

      return { rows: [] }
    })

    const result = await resolvePublicAssessmentSessionWithClient(client, 'b'.repeat(64))

    expect(result).toEqual(expect.objectContaining({ publicSessionId: 'haps-1', assessmentId: 'asmt-1' }))
    expect(vi.mocked(client.query).mock.calls.map(call => String(call[0])).join('\n'))
      .toContain('assessment_candidate_test_deadline')
  })

  it('samples the database clock after locking the session and ignores start-by TTL in progress', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }
      if (sql.includes('WHERE session_token_hash = $1 AND assessment_id = $2')) return { rows: [sessionRow()] }

      if (sql.includes('SELECT public_session_id, assessment_id')) {
        return { rows: [{ public_session_id: 'haps-1', assessment_id: 'asmt-1' }] }
      }

      if (sql.includes('WHERE assessment_id = $1') && sql.includes('FROM greenhouse_hiring.hiring_assessment')) {
        return { rows: [assessmentRow({
          status: 'in_progress',
          token_expires_at: '2026-08-19T09:00:00.000Z',
          close_deadline: EXPIRES,
        })] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }

      return { rows: [] }
    })

    await expect(resolvePublicAssessmentSessionWithClient(client, 'b'.repeat(64)))
      .resolves.toEqual(expect.objectContaining({ publicSessionId: 'haps-1' }))

    const calls = vi.mocked(client.query).mock.calls.map(call => String(call[0]))
    const sessionLock = calls.findIndex(sql => sql.includes('session_token_hash = $1 AND assessment_id = $2'))
    const clockRead = calls.findIndex(sql => sql.includes('clock_timestamp() AS database_now'))

    expect(clockRead).toBeGreaterThan(sessionLock)
  })
})
