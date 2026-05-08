/**
 * TASK-613 Slice 3 — tests para getFinanceClientProfileUnlinkedSignal.
 *
 * 4 paths cubiertos:
 *   1. count = 0 → severity 'ok' (steady state)
 *   2. count > 0 → severity 'warning' + summary explica degradación
 *   3. SQL filtra `active = TRUE` + `organization_id IS NULL`
 *   4. query throws → severity 'unknown' (degraded honestamente)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getFinanceClientProfileUnlinkedSignal } from './finance-client-profile-unlinked'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getFinanceClientProfileUnlinkedSignal — TASK-613', () => {
  it('returns ok severity when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getFinanceClientProfileUnlinkedSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('data_quality')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.client_profile.unlinked_organizations')
    expect(signal.summary).toContain('canónica resuelta')
  })

  it('returns warning severity when count > 0 + summary mentions legacy fallback', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getFinanceClientProfileUnlinkedSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3 client_profiles')
    expect(signal.summary).toContain('legacy detail view')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('3')
  })

  it('SQL filtra organization_id IS NULL y NO usa columna inexistente "active" (anti-regresión)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getFinanceClientProfileUnlinkedSignal()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('greenhouse_finance.client_profiles')
    expect(sql).toContain('organization_id IS NULL')
    // client_profiles no tiene columna `active` — el reader original (TASK-613
    // Slice 3 V1) hacía `WHERE active = TRUE` y throw-eaba en runtime con
    // severity=unknown silencioso. Anti-regresión.
    expect(sql).not.toMatch(/\bactive\s*=\s*TRUE/i)
  })

  it('returns unknown severity when the query throws (degraded honestamente)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getFinanceClientProfileUnlinkedSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible leer el signal')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
  })

  it('uses singular "client_profile" when count = 1', async () => {
    queryMock.mockResolvedValueOnce([{ n: 1 }])

    const signal = await getFinanceClientProfileUnlinkedSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('1 client_profile')
    expect(signal.summary).not.toContain('1 client_profiles')
  })
})
