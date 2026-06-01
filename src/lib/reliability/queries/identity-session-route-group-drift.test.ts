/**
 * TASK-987 — tests para getIdentitySessionRouteGroupDriftSignal.
 *
 * 5 paths cubiertos:
 *   1. count = 0 → severity 'ok' (steady state post-fix)
 *   2. count > 0 → severity 'error' (over-exposure por roles revocados)
 *   3. moduleKey 'identity' + kind 'drift'
 *   4. SQL usa `<@` (containment) contra derivación de roles ACTIVOS + el
 *      predicado de lifecycle (active + effective window) — el invariante del fix
 *   5. query throws → severity 'unknown' (degradado honestamente)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getIdentitySessionRouteGroupDriftSignal,
  IDENTITY_SESSION_ROUTE_GROUP_DRIFT_SIGNAL_ID
} from './identity-session-route-group-drift'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getIdentitySessionRouteGroupDriftSignal — TASK-987', () => {
  it('returns ok severity when count = 0 (steady state post-fix)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getIdentitySessionRouteGroupDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.signalId).toBe(IDENTITY_SESSION_ROUTE_GROUP_DRIFT_SIGNAL_ID)
    expect(signal.moduleKey).toBe('identity')
    expect(signal.kind).toBe('drift')
  })

  it('returns error severity when count > 0 (over-exposure)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getIdentitySessionRouteGroupDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('3 usuarios')
  })

  it('SQL compares route_groups against ACTIVE-only role derivation with lifecycle predicate', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getIdentitySessionRouteGroupDriftSignal()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('session_360')
    // containment check: route_groups must be a subset of active-derived groups
    expect(sql).toContain('s.route_groups <@')
    // the lifecycle predicate that the fix enforces (mirrors role_codes)
    expect(sql).toContain('ura.active')
    expect(sql).toContain('ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP')
  })

  it('returns unknown severity when query throws (honest degradation)', async () => {
    queryMock.mockRejectedValueOnce(new Error('pg down'))

    const signal = await getIdentitySessionRouteGroupDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.moduleKey).toBe('identity')
  })
})
