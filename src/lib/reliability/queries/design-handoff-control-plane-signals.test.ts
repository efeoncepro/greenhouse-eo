import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const { getDesignHandoffMissingEvidenceSignal, DESIGN_HANDOFF_MISSING_EVIDENCE_SIGNAL_ID } = await import(
  './design-handoff-missing-evidence'
)

const { getDesignHandoffNodeDriftSignal, DESIGN_HANDOFF_NODE_DRIFT_SIGNAL_ID } = await import(
  './design-handoff-node-drift'
)

const { getDesignHandoffOrphanSurfacesSignal, DESIGN_HANDOFF_ORPHAN_SURFACES_SIGNAL_ID } = await import(
  './design-handoff-orphan-surfaces'
)

const {
  getDesignHandoffPrimitiveGovernanceSignals,
  DESIGN_HANDOFF_PRIMITIVE_DECISION_MISSING_SIGNAL_ID,
  DESIGN_HANDOFF_PRIMITIVE_LAB_MISSING_SIGNAL_ID,
  DESIGN_HANDOFF_RUNTIME_WITHOUT_GVC_SIGNAL_ID,
  DESIGN_HANDOFF_ROUTE_ONLY_REUSE_SUSPECT_SIGNAL_ID
} = await import('./design-handoff-primitive-governance')

describe('TASK-1175 design handoff reliability signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns missing_evidence ok when every implemented handoff has runtime evidence', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { implemented_count: 3, missing_count: 0, oldest_implemented_at: null }
    ])

    const signal = await getDesignHandoffMissingEvidenceSignal()

    expect(signal.signalId).toBe(DESIGN_HANDOFF_MISSING_EVIDENCE_SIGNAL_ID)
    expect(signal.moduleKey).toBe('platform')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
    expect(signal.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'steady_state', value: '0' })]))
  })

  it('returns missing_evidence warning when implemented handoffs lack evidence', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { implemented_count: 4, missing_count: 2, oldest_implemented_at: '2026-06-01T00:00:00.000Z' }
    ])

    const signal = await getDesignHandoffMissingEvidenceSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2 de 4')
    expect(signal.evidence.map(entry => entry.label)).toContain('oldest_missing_evidence_at')
  })

  it('degrades missing_evidence honestly when V2 evidence table is unavailable', async () => {
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('relation does not exist'))

    const signal = await getDesignHandoffMissingEvidenceSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).not.toContain('relation does not exist')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'platform',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'reliability_signal_design_handoff_missing_evidence' })
      })
    )
  })

  it('returns node_drift warning when active handoffs have stale or non-reachable snapshots', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        active_count: 7,
        drift_count: 3,
        missing_snapshot_count: 1,
        non_reachable_count: 1,
        stale_snapshot_count: 1
      }
    ])

    const signal = await getDesignHandoffNodeDriftSignal()

    expect(signal.signalId).toBe(DESIGN_HANDOFF_NODE_DRIFT_SIGNAL_ID)
    expect(signal.severity).toBe('warning')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'missing_snapshot_count', value: '1' }),
        expect.objectContaining({ label: 'non_reachable_count', value: '1' }),
        expect.objectContaining({ label: 'stale_snapshot_count', value: '1' })
      ])
    )
  })

  it('degrades node_drift without exposing raw DB errors', async () => {
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('column node_status missing'))

    const signal = await getDesignHandoffNodeDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).not.toContain('node_status')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'platform',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'reliability_signal_design_handoff_node_drift' })
      })
    )
  })

  it('returns orphan_surfaces ok for unique implemented surfaces', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        implemented_count: 2,
        orphan_count: 0,
        blank_surface_count: 0,
        duplicate_surface_count: 0,
        duplicate_entry_count: 0
      }
    ])

    const signal = await getDesignHandoffOrphanSurfacesSignal()

    expect(signal.signalId).toBe(DESIGN_HANDOFF_ORPHAN_SURFACES_SIGNAL_ID)
    expect(signal.severity).toBe('ok')
    expect(signal.evidence.map(entry => entry.label)).toContain('Conservative definition')
  })

  it('returns orphan_surfaces warning for blank or duplicated implemented surfaces', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        implemented_count: 8,
        orphan_count: 2,
        blank_surface_count: 1,
        duplicate_surface_count: 1,
        duplicate_entry_count: 1
      }
    ])

    const signal = await getDesignHandoffOrphanSurfacesSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('surface vacia o duplicada')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'blank_surface_count', value: '1' }),
        expect.objectContaining({ label: 'duplicate_surface_count', value: '1' })
      ])
    )
  })

  it('degrades orphan_surfaces without exposing raw DB errors', async () => {
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getDesignHandoffOrphanSurfacesSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).not.toContain('connection refused')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'platform',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'reliability_signal_design_handoff_orphan_surfaces' })
      })
    )
  })

  it('returns primitive governance warning signals when handoffs miss DS decisions and evidence', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        active_count: 9,
        primitive_decision_missing_count: 2,
        primitive_lab_missing_count: 1,
        runtime_without_gvc_count: 3,
        route_only_reuse_suspect_count: 1
      }
    ])

    const signals = await getDesignHandoffPrimitiveGovernanceSignals()

    expect(signals).toHaveLength(4)
    expect(signals.map(signal => signal.signalId)).toEqual([
      DESIGN_HANDOFF_PRIMITIVE_DECISION_MISSING_SIGNAL_ID,
      DESIGN_HANDOFF_PRIMITIVE_LAB_MISSING_SIGNAL_ID,
      DESIGN_HANDOFF_RUNTIME_WITHOUT_GVC_SIGNAL_ID,
      DESIGN_HANDOFF_ROUTE_ONLY_REUSE_SUSPECT_SIGNAL_ID
    ])
    expect(signals.map(signal => signal.severity)).toEqual(['warning', 'warning', 'warning', 'warning'])
    expect(signals[0]?.summary).toContain('2 de 9')
    expect(signals[2]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'count', value: '3' }),
        expect.objectContaining({ label: 'active_count', value: '9' })
      ])
    )
  })

  it('degrades primitive governance signals without exposing raw DB errors', async () => {
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('column implementation_strategy missing'))

    const signals = await getDesignHandoffPrimitiveGovernanceSignals()

    expect(signals).toHaveLength(4)
    expect(signals.every(signal => signal.severity === 'unknown')).toBe(true)
    expect(signals.map(signal => signal.summary).join(' ')).not.toContain('implementation_strategy')
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'platform',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'reliability_signal_design_handoff_primitive_governance' })
      })
    )
  })
})
