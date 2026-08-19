import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))

import {
  buildPublicAssessmentCredentialBudget,
  claimPublicAssessmentIpCeiling,
  digestPublicAssessmentRequester,
} from './abuse-guard'

describe('public assessment abuse guard', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('persiste sólo un digest estable y bloquea cuando el bucket rechaza', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'test-only-requester-hmac-key')
    mocks.query.mockResolvedValue([{ allowed: false }])

    const request = new Request('https://greenhouse.example/api/public/assessment/access/exchange', {
      headers: { 'x-forwarded-for': '203.0.113.42' },
    })

    await expect(claimPublicAssessmentIpCeiling(request, 'exchange')).resolves.toBe(false)
    expect(mocks.query).toHaveBeenCalledWith(expect.any(String), [
      digestPublicAssessmentRequester('ip', '203.0.113.42'),
      'exchange_ip',
      120,
    ])
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('203.0.113.42')
  })

  it('falla cerrado con IP resoluble si el bucket durable no está disponible', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'test-only-requester-hmac-key')
    mocks.query.mockRejectedValue(new Error('database unavailable'))

    const request = new Request('https://greenhouse.example/api/public/assessment/session', {
      headers: { 'x-real-ip': '198.51.100.7' },
    })

    await expect(claimPublicAssessmentIpCeiling(request, 'session_write')).resolves.toBe(false)
  })

  it('aísla la cuota funcional de dos sesiones bajo la misma IP', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'test-only-requester-hmac-key')
    mocks.query.mockResolvedValue([{ allowed: true }])

    const first = buildPublicAssessmentCredentialBudget('session-A', 'session_credential', 'session_write')
    const second = buildPublicAssessmentCredentialBudget('session-B', 'session_credential', 'session_write')

    expect(first.requesterDigest).not.toBe(second.requesterDigest)
    expect(first).toMatchObject({ surface: 'session_write_credential', limit: 60 })
    expect(second).toMatchObject({ surface: 'session_write_credential', limit: 60 })
    expect(JSON.stringify([first, second])).not.toMatch(/session-A|session-B/)
    expect(digestPublicAssessmentRequester('session_credential', 'CaseSensitive')).not.toBe(
      digestPublicAssessmentRequester('session_credential', 'casesensitive'),
    )
  })

  it('dos requests del mismo credential reclaman el mismo bucket', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'test-only-requester-hmac-key')
    const first = buildPublicAssessmentCredentialBudget('same-session', 'session_credential', 'session_read')
    const second = buildPublicAssessmentCredentialBudget('same-session', 'session_credential', 'session_read')

    expect(first).toEqual(second)
  })

  it('en Vercel falla cerrado sin header canónico e ignora XFF spoofeado', async () => {
    vi.stubEnv('VERCEL_ENV', 'staging')
    vi.stubEnv('NEXTAUTH_SECRET', 'test-only-requester-hmac-key')
    mocks.query.mockResolvedValue([{ allowed: true }])
    const missing = new Request('https://greenhouse.example/api/public/assessment/session')

    const spoofed = new Request('https://greenhouse.example/api/public/assessment/session', {
      headers: { 'x-forwarded-for': '203.0.113.99' },
    })

    await expect(claimPublicAssessmentIpCeiling(missing, 'session_read')).resolves.toBe(false)
    await expect(claimPublicAssessmentIpCeiling(spoofed, 'session_read')).resolves.toBe(false)
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('en Vercel usa sólo x-vercel-forwarded-for para el techo agregado', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXTAUTH_SECRET', 'test-only-requester-hmac-key')
    mocks.query.mockResolvedValue([{ allowed: true }])

    const request = new Request('https://greenhouse.example/api/public/assessment/session', {
      headers: {
        'x-vercel-forwarded-for': '198.51.100.12',
        'x-forwarded-for': '203.0.113.99',
      },
    })

    await expect(claimPublicAssessmentIpCeiling(request, 'session_read')).resolves.toBe(true)
    expect(mocks.query).toHaveBeenCalledWith(expect.any(String), [
      digestPublicAssessmentRequester('ip', '198.51.100.12'),
      'session_read_ip',
      600,
    ])
  })
})
