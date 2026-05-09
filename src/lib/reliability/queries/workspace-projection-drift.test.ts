import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const { getWorkspaceProjectionFacetViewDriftSignal, WORKSPACE_PROJECTION_FACET_VIEW_DRIFT_SIGNAL_ID } =
  await import('./workspace-projection-drift')

const { VIEW_REGISTRY } = await import('@/lib/admin/view-access-catalog')
const { FACET_TO_VIEW_CODE } = await import('@/lib/organization-workspace/facet-view-mapping')

describe('TASK-611 — workspace projection facet/view drift signal', () => {
  it('returns severity ok when every mapped viewCode exists in the registry', async () => {
    // Sanity check the actual data: in the canonical state the mapping has zero drift.
    const registryViewCodes = new Set(VIEW_REGISTRY.map(entry => entry.viewCode))

    for (const [, viewCode] of Object.entries(FACET_TO_VIEW_CODE)) {
      expect(registryViewCodes.has(viewCode), `expected ${viewCode} to be in VIEW_REGISTRY`).toBe(true)
    }

    const signal = await getWorkspaceProjectionFacetViewDriftSignal()

    expect(signal.signalId).toBe(WORKSPACE_PROJECTION_FACET_VIEW_DRIFT_SIGNAL_ID)
    expect(signal.moduleKey).toBe('identity')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('alineado')
  })

  it('exposes evidence with drift_count, mapped_facets, and registry_viewcodes metrics', async () => {
    const signal = await getWorkspaceProjectionFacetViewDriftSignal()
    const labels = signal.evidence.map(entry => entry.label)

    expect(labels).toContain('drift_count')
    expect(labels).toContain('mapped_facets')
    expect(labels).toContain('registry_viewcodes')
  })
})
