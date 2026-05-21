import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL = process.env.CT_SLO_PCT_METRIC_ENABLED

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CT_SLO_PCT_METRIC_ENABLED
  else process.env.CT_SLO_PCT_METRIC_ENABLED = ORIGINAL
  vi.resetModules()
})

describe('TASK-912 Slice 5 — cycle_time_slo_pct metric (flag-gated)', () => {
  it('OFF (default): NO está en ICO_METRIC_REGISTRY (inerte)', async () => {
    delete process.env.CT_SLO_PCT_METRIC_ENABLED
    vi.resetModules()
    const m = await import('./metric-registry')

    expect(m.ICO_METRIC_REGISTRY.some(x => x.code === 'cycle_time_slo_pct')).toBe(false)
    // El constant sí se exporta (declarado), solo no se incluye en el registry
    expect(m.CYCLE_TIME_SLO_PCT_METRIC.code).toBe('cycle_time_slo_pct')
  })

  it('ON: presente en el registry con formula percentage vs threshold 14.2', async () => {
    process.env.CT_SLO_PCT_METRIC_ENABLED = 'true'
    vi.resetModules()
    const m = await import('./metric-registry')
    const metric = m.ICO_METRIC_REGISTRY.find(x => x.code === 'cycle_time_slo_pct')

    expect(metric).toBeDefined()
    expect(metric!.formula.kind).toBe('percentage')
    expect(metric!.formula.numeratorCondition).toContain('cycle_time_days <= 14.2')
    expect(metric!.formula.denominatorCondition).toContain('task_status IN')
    expect(metric!.higherIsBetter).toBe(true)
  })

  it('ON: el registry crece exactamente en 1 metric vs OFF', async () => {
    delete process.env.CT_SLO_PCT_METRIC_ENABLED
    vi.resetModules()
    const off = (await import('./metric-registry')).ICO_METRIC_REGISTRY.length

    process.env.CT_SLO_PCT_METRIC_ENABLED = 'true'
    vi.resetModules()
    const on = (await import('./metric-registry')).ICO_METRIC_REGISTRY.length

    expect(on).toBe(off + 1)
  })
})
