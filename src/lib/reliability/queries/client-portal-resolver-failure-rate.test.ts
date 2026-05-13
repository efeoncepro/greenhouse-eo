import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const {
  evaluateResolverFailureRate,
  getClientPortalResolverFailureRateSignal,
  CLIENT_PORTAL_RESOLVER_FAILURE_RATE_SIGNAL_ID
} = await import('./client-portal-resolver-failure-rate')

describe('TASK-827 Slice 8 — evaluateResolverFailureRate stub', () => {
  it('V1.0 retorna severity unknown con state pending_implementation', () => {
    const result = evaluateResolverFailureRate()

    expect(result.severity).toBe('unknown')
    expect(result.state).toBe('pending_implementation')
    expect(result.failureRatePercent).toBeNull()
    expect(result.summary).toMatch(/telemetry adapter pending/i)
    expect(result.summary).toMatch(/task-829/i)
  })

  it('idempotente — multiple calls retornan same shape', () => {
    const r1 = evaluateResolverFailureRate()
    const r2 = evaluateResolverFailureRate()

    expect(r1).toEqual(r2)
  })
})

describe('TASK-827 Slice 8 — getClientPortalResolverFailureRateSignal', () => {
  it('builds canonical ReliabilitySignal shape con moduleKey=identity (D7 temporal)', async () => {
    const signal = await getClientPortalResolverFailureRateSignal()

    expect(signal.signalId).toBe(CLIENT_PORTAL_RESOLVER_FAILURE_RATE_SIGNAL_ID)
    expect(signal.signalId).toBe('client_portal.composition.resolver_failure_rate')
    expect(signal.moduleKey).toBe('identity')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('unknown')
    expect(signal.label).toMatch(/resolver failure rate/i)
  })

  it('evidence incluye state + failure_rate_percent + doc refs', async () => {
    const signal = await getClientPortalResolverFailureRateSignal()

    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'state', value: 'pending_implementation' }),
        expect.objectContaining({ label: 'failure_rate_percent', value: 'unknown' }),
        expect.objectContaining({
          label: 'Spec',
          value: expect.stringContaining('TASK-827')
        }),
        expect.objectContaining({
          label: 'V1.1 follow-up',
          value: expect.stringContaining('TASK-829')
        })
      ])
    )
  })

  it('observedAt es ISO 8601 timestamp válido', async () => {
    const signal = await getClientPortalResolverFailureRateSignal()

    expect(signal.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(signal.observedAt).not.toBeNull()
    expect(Number.isNaN(new Date(signal.observedAt as string).getTime())).toBe(false)
  })
})
