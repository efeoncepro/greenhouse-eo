import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as criticalTablesActual from '@/lib/db-health/critical-tables-check'

vi.mock('server-only', () => ({}))

const verifyMock = vi.fn()

vi.mock('@/lib/db-health/critical-tables-check', async () => {
  const actual = await vi.importActual<typeof criticalTablesActual>(
    '@/lib/db-health/critical-tables-check'
  )

  return {
    ...actual,
    verifyCriticalTablesExist: () => verifyMock()
  }
})

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

const { getCriticalTablesMissingSignal, CRITICAL_TABLES_MISSING_SIGNAL_ID } = await import(
  './critical-tables-missing'
)

describe('TASK-838 Fase 3 — critical tables missing signal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns severity ok when no tables are missing', async () => {
    verifyMock.mockResolvedValueOnce({
      missing: [],
      total: 16,
      observedAt: '2026-05-08T00:00:00.000Z'
    })

    const signal = await getCriticalTablesMissingSignal()

    expect(signal.signalId).toBe(CRITICAL_TABLES_MISSING_SIGNAL_ID)
    expect(signal.moduleKey).toBe('cloud')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('16 tablas')
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('returns severity error + captures when 1+ tables are missing', async () => {
    verifyMock.mockResolvedValueOnce({
      missing: [
        { schema: 'greenhouse_core', table: 'role_entitlement_defaults', rationale: 'TASK-404/838' },
        { schema: 'greenhouse_core', table: 'user_entitlement_overrides', rationale: 'TASK-404/838' }
      ],
      total: 16,
      observedAt: '2026-05-08T00:00:00.000Z'
    })

    const signal = await getCriticalTablesMissingSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2 de 16')
    expect(signal.summary).toContain('greenhouse_core.role_entitlement_defaults')
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'cloud',
      expect.objectContaining({
        tags: { source: 'reliability_signal_critical_tables_missing' }
      })
    )
  })

  it('returns severity unknown when verifyCriticalTablesExist throws', async () => {
    verifyMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getCriticalTablesMissingSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible verificar')
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'cloud',
      expect.objectContaining({
        tags: { source: 'reliability_signal_critical_tables_missing' }
      })
    )
  })

  it('exposes evidence with missing_count, total_critical, and per-table entries', async () => {
    verifyMock.mockResolvedValueOnce({
      missing: [
        { schema: 'greenhouse_core', table: 'capabilities_registry', rationale: 'registry' }
      ],
      total: 16,
      observedAt: '2026-05-08T00:00:00.000Z'
    })

    const signal = await getCriticalTablesMissingSignal()

    const labels = signal.evidence.map(entry => entry.label)

    expect(labels).toContain('missing_count')
    expect(labels).toContain('total_critical')
    expect(labels).toContain('missing_table')
  })
})
