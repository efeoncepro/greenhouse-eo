import { describe, expect, it } from 'vitest'

import { derivePerformanceFindings } from './perf-budget'
import type { PerformanceSummary } from './manifest'

const summary = (overrides: Partial<PerformanceSummary> = {}): PerformanceSummary => ({
  domNodes: 500,
  requestCount: 40,
  transferBytes: 800_000,
  fcpMs: 1200,
  ...overrides
})

describe('derivePerformanceFindings', () => {
  it('is a no-op when performance gate is not enabled', () => {
    expect(derivePerformanceFindings(summary(), undefined)).toEqual([])
    expect(derivePerformanceFindings(summary(), { enabled: false, maxDomNodes: 1 })).toEqual([])
  })

  it('emits warning-first findings when budgets are exceeded', () => {
    const findings = derivePerformanceFindings(summary({ domNodes: 5000 }), { enabled: true, maxDomNodes: 1500 })

    expect(findings).toHaveLength(1)
    expect(findings[0].code).toBe('perf_dom_nodes_exceeded')
    expect(findings[0].severity).toBe('warning')
  })

  it('escalates to error when severity=error is declared', () => {
    const findings = derivePerformanceFindings(summary({ requestCount: 300 }), { enabled: true, severity: 'error', maxRequests: 100 })

    expect(findings[0].severity).toBe('error')
    expect(findings[0].code).toBe('perf_requests_exceeded')
  })

  it('does not flag metrics within budget', () => {
    const findings = derivePerformanceFindings(summary(), {
      enabled: true,
      maxDomNodes: 2000,
      maxRequests: 100,
      maxTransferBytes: 2_000_000,
      maxFcpMs: 3000
    })

    expect(findings).toEqual([])
  })

  it('reports a probe-failed warning when the snapshot is missing', () => {
    const findings = derivePerformanceFindings(undefined, { enabled: true })

    expect(findings[0].code).toBe('perf_probe_failed')
  })
})
