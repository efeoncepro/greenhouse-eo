import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import {
  AUTH_PERSON_MAGIC_LINK_RATE_LIMITED_SIGNAL_ID,
  AUTH_PERSON_PASSKEY_COUNTER_REGRESSION_SIGNAL_ID,
  AUTH_PERSON_SESSION_WITHOUT_LINK_SIGNAL_ID,
  getAuthPersonSignals
} from './auth-server-signals'

describe('auth.person.* — señales de autenticación de personas (TASK-1830)', () => {
  it('steady = ok en las tres cuando no hay nada que reportar', async () => {
    const signals = await getAuthPersonSignals({
      loadAttempts: async () => [],
      loadOrphanSessions: async () => [{ sessions: 0 }]
    })

    expect(signals.map(signal => signal.signalId)).toEqual([
      AUTH_PERSON_MAGIC_LINK_RATE_LIMITED_SIGNAL_ID,
      AUTH_PERSON_PASSKEY_COUNTER_REGRESSION_SIGNAL_ID,
      AUTH_PERSON_SESSION_WITHOUT_LINK_SIGNAL_ID
    ])
    expect(signals.every(signal => signal.severity === 'ok' && signal.moduleKey === 'identity')).toBe(true)
  })

  it('el límite de magic link es warning: un cliente torpe también lo dispara', async () => {
    const [rateLimited] = await getAuthPersonSignals({
      loadAttempts: async () => [{ method: 'magic_link', outcome: 'rate_limited', reason_code: 'window_exceeded', events: 7 }],
      loadOrphanSessions: async () => [{ sessions: 0 }]
    })

    expect(rateLimited.severity).toBe('warning')
    expect(rateLimited.summary).toContain('7')
  })

  it('un contador retrocedido es error: significa dos autenticadores con la misma clave', async () => {
    const signals = await getAuthPersonSignals({
      loadAttempts: async () => [{ method: 'passkey', outcome: 'rejected', reason_code: 'counter_regression', events: 1 }],
      loadOrphanSessions: async () => [{ sessions: 0 }]
    })

    const regression = signals.find(signal => signal.signalId === AUTH_PERSON_PASSKEY_COUNTER_REGRESSION_SIGNAL_ID)

    expect(regression?.severity).toBe('error')
  })

  it('una sesión sobreviviendo a la revocación de su link es error', async () => {
    const signals = await getAuthPersonSignals({
      loadAttempts: async () => [],
      loadOrphanSessions: async () => [{ sessions: 3 }]
    })

    const orphan = signals.find(signal => signal.signalId === AUTH_PERSON_SESSION_WITHOUT_LINK_SIGNAL_ID)

    expect(orphan?.severity).toBe('error')
    expect(orphan?.kind).toBe('data_quality')
    expect(orphan?.summary).toContain('3')
  })

  it('si la consulta falla, las tres reportan error: nunca un ok silencioso', async () => {
    const signals = await getAuthPersonSignals({
      loadAttempts: async () => {
        throw new Error('pg down')
      },
      loadOrphanSessions: async () => [{ sessions: 0 }]
    })

    expect(signals).toHaveLength(3)
    expect(signals.every(signal => signal.severity === 'error')).toBe(true)
  })
})
