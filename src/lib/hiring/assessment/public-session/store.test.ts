import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { PoolClient } from 'pg'

import { PublicAssessmentRequestRateLimitError } from './abuse-guard'
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
const exchangeBudget = { requesterDigest: 'c'.repeat(64), surface: 'exchange_credential' as const, limit: 10 }
const sessionBudget = { requesterDigest: 'd'.repeat(64), surface: 'session_read_credential' as const, limit: 120 }

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
  it('1000 bearers y cookies inválidos no crean buckets funcionales', async () => {
    const client = clientFrom(() => ({ rows: [] }))

    for (let index = 0; index < 1000; index += 1) {
      await exchangePublicAssessmentAccessWithClient(client, {
        accessTokenDigest: index.toString(16).padStart(64, '0'),
        sessionTokenDigest: 'b'.repeat(64),
        requestBudget: exchangeBudget,
      })
      await resolvePublicAssessmentSessionWithClient(client, {
        sessionTokenDigest: index.toString(16).padStart(64, '0'),
        requestBudget: sessionBudget,
      })
    }

    const sql = vi.mocked(client.query).mock.calls.map(call => String(call[0])).join('\n')

    expect(sql).not.toContain('claim_assessment_public_request_budget')
    expect(sql).not.toContain('INSERT INTO greenhouse_hiring.hiring_assessment_public_session')
  })

  it('locks assessment → application → facet and persists only credential digests', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }
      if (sql.includes('WHERE access_token_hash = $1')) return { rows: [assessmentRow()] }
      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }
      if (sql.includes('INSERT INTO greenhouse_hiring.hiring_assessment_public_session')) return { rows: [sessionRow()] }
      if (sql.includes('claim_assessment_public_request_budget')) return { rows: [{ allowed: true }] }

      return { rows: [] }
    })

    const result = await exchangePublicAssessmentAccessWithClient(client, {
      accessTokenDigest: 'a'.repeat(64),
      sessionTokenDigest: 'b'.repeat(64),
      requestBudget: exchangeBudget,
    })

    expect(result).toEqual(expect.objectContaining({
      outcome: 'issued',
      session: expect.objectContaining({ assessmentId: 'asmt-1' }),
    }))
    const calls = vi.mocked(client.query).mock.calls.map(call => String(call[0]))

    expect(calls[0]).toMatch(/hiring_assessment[\s\S]*FOR UPDATE/)
    expect(calls[1]).toMatch(/hiring_application[\s\S]*FOR UPDATE/)
    expect(calls[2]).toMatch(/candidate_facet[\s\S]*FOR UPDATE/)
    expect(calls[3]).toContain('clock_timestamp() AS database_now')
    expect(calls[4]).toContain('claim_assessment_public_request_budget')
    expect(calls[5]).toContain('SAVEPOINT assessment_public_session_issue')
    expect(calls[6]).toContain('hiring_assessment_public_session')
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
      requestBudget: exchangeBudget,
    })).resolves.toEqual({ outcome: 'unavailable' })

    const sql = vi.mocked(client.query).mock.calls.map(call => String(call[0])).join('\n')

    expect(sql).toContain("SET status = 'expired'")
    expect(sql).not.toContain('INSERT INTO greenhouse_hiring.hiring_assessment_public_session')
  })

  it('un bearer válido rate-limited reclama bajo locks pero no inserta sesión', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }
      if (sql.includes('WHERE access_token_hash = $1')) return { rows: [assessmentRow()] }
      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }
      if (sql.includes('claim_assessment_public_request_budget')) return { rows: [{ allowed: false }] }

      return { rows: [] }
    })

    await expect(exchangePublicAssessmentAccessWithClient(client, {
      accessTokenDigest: 'a'.repeat(64),
      sessionTokenDigest: 'b'.repeat(64),
      requestBudget: exchangeBudget,
    })).rejects.toBeInstanceOf(PublicAssessmentRequestRateLimitError)

    expect(vi.mocked(client.query).mock.calls.map(call => String(call[0])).join('\n'))
      .not.toContain('INSERT INTO greenhouse_hiring.hiring_assessment_public_session')
  })

  it('preserva el claim cuando falla la inserción de la sesión', async () => {
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }
      if (sql.includes('WHERE access_token_hash = $1')) return { rows: [assessmentRow()] }
      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }
      if (sql.includes('claim_assessment_public_request_budget')) return { rows: [{ allowed: true }] }

      if (sql.includes('INSERT INTO greenhouse_hiring.hiring_assessment_public_session')) {
        throw new Error('database detail must not escape')
      }

      return { rows: [] }
    })

    await expect(exchangePublicAssessmentAccessWithClient(client, {
      accessTokenDigest: 'a'.repeat(64),
      sessionTokenDigest: 'b'.repeat(64),
      requestBudget: exchangeBudget,
    })).resolves.toEqual({ outcome: 'issuance_failed' })

    const calls = vi.mocked(client.query).mock.calls.map(call => String(call[0]))

    expect(calls).toEqual(expect.arrayContaining([
      expect.stringContaining('claim_assessment_public_request_budget'),
      'SAVEPOINT assessment_public_session_issue',
      'ROLLBACK TO SAVEPOINT assessment_public_session_issue',
      'RELEASE SAVEPOINT assessment_public_session_issue',
    ]))
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

    await expect(resolvePublicAssessmentSessionWithClient(client, {
      sessionTokenDigest: 'b'.repeat(64), requestBudget: sessionBudget,
    })).resolves.toBeNull()
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
      if (sql.includes('claim_assessment_public_request_budget')) return { rows: [{ allowed: true }] }

      return { rows: [] }
    })

    const result = await resolvePublicAssessmentSessionWithClient(client, {
      sessionTokenDigest: 'b'.repeat(64), requestBudget: sessionBudget,
    })

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
      if (sql.includes('claim_assessment_public_request_budget')) return { rows: [{ allowed: true }] }

      return { rows: [] }
    })

    await expect(resolvePublicAssessmentSessionWithClient(client, {
      sessionTokenDigest: 'b'.repeat(64), requestBudget: sessionBudget,
    }))
      .resolves.toEqual(expect.objectContaining({ publicSessionId: 'haps-1' }))

    const calls = vi.mocked(client.query).mock.calls.map(call => String(call[0]))
    const sessionLock = calls.findIndex(sql => sql.includes('session_token_hash = $1 AND assessment_id = $2'))
    const clockRead = calls.findIndex(sql => sql.includes('clock_timestamp() AS database_now'))

    expect(clockRead).toBeGreaterThan(sessionLock)
  })
  it('no expira la sesión sellada con el start-by cuando el candidato ya está rindiendo', async () => {
    // Regresión del corte a mitad de test: al canjear un assessment aún no iniciado, la sesión se
    // sella con `token_expires_at` (la fecha límite para EMPEZAR). Si el candidato abre el enlace
    // poco antes de ese límite y arranca, el deadline real pasa a `close_deadline`, pero la sesión
    // conserva el techo viejo y ya no se re-extiende. Resolver contra ese techo le mataba la sesión
    // con el test en curso. La vigencia la decide `close_deadline`, no el sello del canje.
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }

      if (sql.includes('WHERE session_token_hash = $1 AND assessment_id = $2')) {
        return { rows: [sessionRow({ expires_at: '2026-08-19T09:30:00.000Z' })] }
      }

      if (sql.includes('SELECT public_session_id, assessment_id')) {
        return { rows: [{ public_session_id: 'haps-1', assessment_id: 'asmt-1' }] }
      }

      if (sql.includes('WHERE assessment_id = $1') && sql.includes('FROM greenhouse_hiring.hiring_assessment')) {
        return { rows: [assessmentRow({
          status: 'in_progress',
          token_expires_at: '2026-08-19T09:30:00.000Z',
          close_deadline: EXPIRES,
        })] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }
      if (sql.includes('claim_assessment_public_request_budget')) return { rows: [{ allowed: true }] }

      return { rows: [] }
    })

    await expect(resolvePublicAssessmentSessionWithClient(client, {
      sessionTokenDigest: 'b'.repeat(64), requestBudget: sessionBudget,
    }))
      .resolves.toEqual(expect.objectContaining({ publicSessionId: 'haps-1' }))

    const closed = vi.mocked(client.query).mock.calls
      .map(call => String(call[0]))
      .some(sql => sql.includes('UPDATE greenhouse_hiring.hiring_assessment_public_session'))

    expect(closed).toBe(false)
  })

  it('expira la sesión cuando el deadline vivo del assessment ya pasó', async () => {
    // Contraparte del test anterior: quitar el techo sellado no puede volver inmortal a la sesión.
    const client = clientFrom(sql => {
      if (sql.includes('clock_timestamp() AS database_now')) return { rows: [{ database_now: NOW }] }

      if (sql.includes('WHERE session_token_hash = $1 AND assessment_id = $2')) {
        return { rows: [sessionRow({ expires_at: '2026-08-21T10:00:00.000Z' })] }
      }

      if (sql.includes('SELECT public_session_id, assessment_id')) {
        return { rows: [{ public_session_id: 'haps-1', assessment_id: 'asmt-1' }] }
      }

      if (sql.includes('WHERE assessment_id = $1') && sql.includes('FROM greenhouse_hiring.hiring_assessment')) {
        return { rows: [assessmentRow({
          status: 'in_progress',
          token_expires_at: '2026-08-19T08:00:00.000Z',
          close_deadline: '2026-08-19T09:00:00.000Z',
        })] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_application')) return { rows: [applicationRow] }
      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) return { rows: [facetRow] }
      if (sql.includes('claim_assessment_public_request_budget')) return { rows: [{ allowed: true }] }

      return { rows: [] }
    })

    await expect(resolvePublicAssessmentSessionWithClient(client, {
      sessionTokenDigest: 'b'.repeat(64), requestBudget: sessionBudget,
    })).resolves.toBeNull()
  })
})
