import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { getAuthIssuerJwksSignal, getAuthSigningKeysLifecycleSignal, getAuthKeyRotationOverdueSignal, getAuthFirstPartyAbuseSignals } from './auth-server-signals'

const keys = (rows: Array<{ kid: string; state: 'active' | 'retiring'; retiring_at?: string | null }>) => async () =>
  rows.map(row => ({ kid: row.kid, state: row.state, retiring_at: row.retiring_at ?? null }))

describe('auth.issuer.jwks_unreachable', () => {
  it('is not_configured while the host is not published', async () => {
    const signal = await getAuthIssuerJwksSignal({ jwksUrl: null })

    expect(signal.severity).toBe('not_configured')
  })

  it('is ok when the JWKS publishes exactly the registry kids', async () => {
    const signal = await getAuthIssuerJwksSignal({
      jwksUrl: 'https://auth.efeonce.org/.well-known/jwks.json',
      fetchJwks: async () => ({ status: 200, body: { keys: [{ kid: 'a' }, { kid: 'b' }] } }),
      loadKeys: keys([{ kid: 'a', state: 'active' }, { kid: 'b', state: 'retiring', retiring_at: new Date().toISOString() }])
    })

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('runtime')
  })

  it('is error on non-200, on kid drift, and on fetch failure', async () => {
    const drift = await getAuthIssuerJwksSignal({
      jwksUrl: 'https://auth.efeonce.org/.well-known/jwks.json',
      fetchJwks: async () => ({ status: 200, body: { keys: [{ kid: 'stale' }] } }),
      loadKeys: keys([{ kid: 'a', state: 'active' }])
    })

    expect(drift.severity).toBe('error')
    expect(drift.summary).toMatch(/faltan 1/u)

    const down = await getAuthIssuerJwksSignal({
      jwksUrl: 'https://auth.efeonce.org/.well-known/jwks.json',
      fetchJwks: async () => ({ status: 404, body: null }),
      loadKeys: keys([{ kid: 'a', state: 'active' }])
    })

    expect(down.severity).toBe('error')

    const thrown = await getAuthIssuerJwksSignal({
      jwksUrl: 'https://auth.efeonce.org/.well-known/jwks.json',
      fetchJwks: async () => {
        throw new Error('timeout')
      },
      loadKeys: keys([{ kid: 'a', state: 'active' }])
    })

    expect(thrown.severity).toBe('error')
  })
})

describe('auth.signing_keys.lifecycle', () => {
  it('is error without an active key and ok with exactly one', async () => {
    expect((await getAuthSigningKeysLifecycleSignal({ loadKeys: keys([]) })).severity).toBe('error')
    expect((await getAuthSigningKeysLifecycleSignal({ loadKeys: keys([{ kid: 'a', state: 'active' }]) })).severity).toBe('ok')
  })

  it('warns when a retiring key is older than 7 days', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString()

    const signal = await getAuthSigningKeysLifecycleSignal({
      loadKeys: keys([{ kid: 'a', state: 'active' }, { kid: 'old', state: 'retiring', retiring_at: eightDaysAgo }])
    })

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toMatch(/rotate-key --retire/u)
  })
})


describe('auth.keys.rotation_overdue', () => {
  const now = () => new Date('2026-10-25T12:00:00Z')
  const ago = (days: number) => new Date(now().getTime() - days * 86400000)

  it('lights up after 80 days and recovers after a new activation', async () => {
    expect((await getAuthKeyRotationOverdueSignal({ now, loadActiveKeys: async () => [{ activated_at: ago(80) }] })).severity).toBe('ok')
    expect((await getAuthKeyRotationOverdueSignal({ now, loadActiveKeys: async () => [{ activated_at: ago(80.01) }] })).severity).toBe('warning')
    expect((await getAuthKeyRotationOverdueSignal({ now, loadActiveKeys: async () => [{ activated_at: ago(0) }] })).severity).toBe('ok')
  })

  it('never reports green for unknown, duplicate, future or malformed activation', async () => {
    for (const rows of [[], [{ activated_at: ago(-1) }], [{ activated_at: 'invalid' }], [{ activated_at: ago(1) }, { activated_at: ago(2) }]]) {
      expect((await getAuthKeyRotationOverdueSignal({ now, loadActiveKeys: async () => rows })).severity).toBe('error')
    }

    expect((await getAuthKeyRotationOverdueSignal({ now, loadActiveKeys: async () => { throw new Error('unavailable') } })).severity).toBe('error')
  })
})

describe('first-party and invitation OTP operational signals', () => {
  it('lights up every category and recovers on an empty observed window without exposing details', async () => {
    const signals = await getAuthFirstPartyAbuseSignals({ loadRows: async () => [
      { signal_key: 'first_party_replay', events: 1, clients: 1 }, { signal_key: 'otp_rate_limited', events: 2, clients: 1 },
      { signal_key: 'otp_delivery_failed', events: 3, clients: 1 }, { signal_key: 'otp_unavailable', events: 4, clients: 1 }
    ] })

    expect(signals.map(signal => signal.severity)).toEqual(['error','warning','error','error'])
    expect(signals.every(signal => signal.evidence.every(item => item.kind === 'metric'))).toBe(true)
    expect((await getAuthFirstPartyAbuseSignals({ loadRows: async () => [] })).map(signal => signal.severity)).toEqual(['ok','ok','ok','ok'])
  })

  it('reports observation failures instead of false zeros', async () => {
    const missing = await getAuthFirstPartyAbuseSignals({ loadRows: async () => { throw new Error('ledger unavailable') } })
    const invalid = await getAuthFirstPartyAbuseSignals({ loadRows: async () => [{ signal_key: 'first_party_replay', events: -1, clients: 1 }] })

    expect(missing.every(signal => signal.severity === 'error')).toBe(true)
    expect(invalid.every(signal => signal.severity === 'error')).toBe(true)
  })
})
