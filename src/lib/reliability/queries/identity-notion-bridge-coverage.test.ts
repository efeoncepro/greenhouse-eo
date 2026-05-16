/**
 * Tests for getIdentityNotionBridgeCoverageSignal.
 *
 * Cubre el bug class del incidente 2026-05-16 (TASK-877 bridge regression):
 * coverage cae a <40% cuando el resolver Notion→member queda incompleto.
 *
 * Paths cubiertos:
 *   1. 0 tareas en ventana → severity 'unknown' (sync upstream caído)
 *   2. coverage >= 60% → severity 'ok' (baseline post-recovery)
 *   3. 40% <= coverage < 60% → severity 'warning' (caída significativa)
 *   4. coverage < 40% → severity 'error' (regresión sistémica)
 *   5. Boundary cases (exactly 60%, exactly 40%)
 *   6. SQL throws → severity 'unknown' + captureWithDomain identity
 *   7. Evidence incluye métricas canónicas + thresholds
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import {
  IDENTITY_NOTION_BRIDGE_COVERAGE_SIGNAL_ID,
  getIdentityNotionBridgeCoverageSignal
} from './identity-notion-bridge-coverage'

beforeEach(() => {
  queryMock.mockReset()
  captureMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getIdentityNotionBridgeCoverageSignal', () => {
  it('returns unknown when zero tasks in window (upstream sync down)', async () => {
    queryMock.mockResolvedValueOnce([
      { total_assigned_tasks: 0, resolved_tasks: 0, distinct_assignees: 0, unresolved_distinct_assignees: 0 }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('identity')
    expect(signal.signalId).toBe(IDENTITY_NOTION_BRIDGE_COVERAGE_SIGNAL_ID)
    expect(signal.summary).toContain('sync Notion puede estar caído')
  })

  it('returns ok when coverage >= 60% (baseline healthy)', async () => {
    queryMock.mockResolvedValueOnce([
      {
        total_assigned_tasks: 1000,
        resolved_tasks: 700,
        distinct_assignees: 15,
        unresolved_distinct_assignees: 8
      }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('operativo')
    expect(signal.summary).toContain('70%')
  })

  it('returns warning when 40% <= coverage < 60% (significant drop)', async () => {
    queryMock.mockResolvedValueOnce([
      {
        total_assigned_tasks: 1000,
        resolved_tasks: 500,
        distinct_assignees: 15,
        unresolved_distinct_assignees: 10
      }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('50%')
    expect(signal.summary).toContain('cayó')
    expect(signal.summary).toContain('10 usuarios Notion sin resolver')
  })

  it('returns error when coverage < 40% (systemic regression — the May 2026 incident)', async () => {
    queryMock.mockResolvedValueOnce([
      {
        total_assigned_tasks: 5277,
        resolved_tasks: 193,
        distinct_assignees: 20,
        unresolved_distinct_assignees: 15
      }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('Regresión sistémica')
    expect(signal.summary).toContain('3.7%')
    expect(signal.summary).toContain('loadNotionMemberMapPostgresFirst')
  })

  it('boundary: coverage exactly 60% → ok', async () => {
    queryMock.mockResolvedValueOnce([
      { total_assigned_tasks: 100, resolved_tasks: 60, distinct_assignees: 5, unresolved_distinct_assignees: 2 }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('ok')
  })

  it('boundary: coverage exactly 40% → warning', async () => {
    queryMock.mockResolvedValueOnce([
      { total_assigned_tasks: 100, resolved_tasks: 40, distinct_assignees: 5, unresolved_distinct_assignees: 3 }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('warning')
  })

  it('boundary: coverage 39.9% → error', async () => {
    queryMock.mockResolvedValueOnce([
      { total_assigned_tasks: 1000, resolved_tasks: 399, distinct_assignees: 5, unresolved_distinct_assignees: 3 }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('error')
  })

  it('SQL filters by recent window + counts both resolved + unresolved distinct', async () => {
    queryMock.mockResolvedValueOnce([
      { total_assigned_tasks: 100, resolved_tasks: 70, distinct_assignees: 5, unresolved_distinct_assignees: 1 }
    ])

    await getIdentityNotionBridgeCoverageSignal()

    expect(queryMock).toHaveBeenCalledOnce()
    const sql = queryMock.mock.calls[0][0] as string

    expect(sql).toMatch(/greenhouse_delivery\.tasks/)
    expect(sql).toMatch(/last_edited_time/)
    expect(sql).toMatch(/90 days/)
    expect(sql).toMatch(/COUNT\(DISTINCT assignee_source_id\)/)
  })

  it('degrades to unknown when query throws + captures Sentry with identity domain', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection lost'))

    const signal = await getIdentityNotionBridgeCoverageSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(captureMock).toHaveBeenCalledOnce()
    expect(captureMock.mock.calls[0][1]).toBe('identity')
    expect(captureMock.mock.calls[0][2]).toMatchObject({
      tags: { source: 'reliability_signal_notion_bridge_coverage' }
    })
  })

  it('evidence includes canonical metrics + bridge resolver doc reference', async () => {
    queryMock.mockResolvedValueOnce([
      { total_assigned_tasks: 100, resolved_tasks: 70, distinct_assignees: 5, unresolved_distinct_assignees: 1 }
    ])

    const signal = await getIdentityNotionBridgeCoverageSignal()

    const metricLabels = signal.evidence?.map(e => e.label) ?? []

    expect(metricLabels).toContain('coverage_pct')
    expect(metricLabels).toContain('total_assigned_tasks')
    expect(metricLabels).toContain('resolved_tasks')
    expect(metricLabels).toContain('unresolved_distinct_assignees')
    expect(metricLabels).toContain('window_days')
    expect(metricLabels).toContain('ok_threshold_pct')
    expect(metricLabels).toContain('Bridge resolver')

    const bridgeRefEvidence = signal.evidence?.find(e => e.label === 'Bridge resolver')

    expect(bridgeRefEvidence?.value).toContain('notion-member-map.ts')
  })
})
