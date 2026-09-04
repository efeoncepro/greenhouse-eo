import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import {
  AUTH_OAUTH_CIMD_REJECTED_SIGNAL_ID,
  AUTH_OAUTH_CODE_REUSE_SIGNAL_ID,
  AUTH_OAUTH_REFRESH_REUSE_SIGNAL_ID,
  getAuthOAuthAbuseSignals
} from './auth-server-signals'

describe('auth.oauth.* abuse signals (TASK-1829)', () => {
  it('steady state is ok for the three signals when the audit has no abuse rows', async () => {
    const signals = await getAuthOAuthAbuseSignals({ loadRows: async () => [] })

    expect(signals.map(s => s.signalId)).toEqual([AUTH_OAUTH_CODE_REUSE_SIGNAL_ID, AUTH_OAUTH_REFRESH_REUSE_SIGNAL_ID, AUTH_OAUTH_CIMD_REJECTED_SIGNAL_ID])
    expect(signals.every(s => s.severity === 'ok' && s.kind === 'incident' && s.moduleKey === 'identity')).toBe(true)
  })

  it('code/refresh reuse are error; cimd rejections are warning; counts land in evidence', async () => {
    const signals = await getAuthOAuthAbuseSignals({
      loadRows: async () => [
        { event_type: 'code_reuse', events: 2, clients: 1 },
        { event_type: 'cimd_fetch', events: 5, clients: 3 }
      ]
    })

    const [code, refresh, cimd] = signals

    expect(code.severity).toBe('error')
    expect(code.evidence.find(e => e.label === 'events_24h')?.value).toBe('2')
    expect(refresh.severity).toBe('ok')
    expect(cimd.severity).toBe('warning')
    expect(cimd.summary).toContain('5')
  })

  it('degrades honestly to error when the audit table cannot be read', async () => {
    const signals = await getAuthOAuthAbuseSignals({ loadRows: async () => { throw new Error('boom') } })

    expect(signals).toHaveLength(3)
    expect(signals.every(s => s.severity === 'error')).toBe(true)
  })
})
