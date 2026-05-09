import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/commercial/sample-sprints/runtime-projection', () => ({
  getRecentProjectionDegradationCount: vi.fn(() => 0)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getRecentProjectionDegradationCount } from '@/lib/commercial/sample-sprints/runtime-projection'

import { getSampleSprintProjectionDegradedSignal } from './sample-sprint-projection-degraded'

const mockedCount = getRecentProjectionDegradationCount as unknown as ReturnType<typeof vi.fn>

describe('getSampleSprintProjectionDegradedSignal (TASK-835 Slice 6)', () => {
  beforeEach(() => {
    mockedCount.mockReset()
  })

  it('retorna severity=ok cuando count=0 (steady state)', async () => {
    mockedCount.mockReturnValue(0)

    const signal = await getSampleSprintProjectionDegradedSignal()

    expect(signal.signalId).toBe('commercial.sample_sprint.projection_degraded')
    expect(signal.moduleKey).toBe('commercial')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('sin degradaciones')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('0')
  })

  it('retorna severity=warning cuando count > 0', async () => {
    mockedCount.mockReturnValue(3)

    const signal = await getSampleSprintProjectionDegradedSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('3 degradaciones detectadas')
    expect(signal.summary).toContain('5 minutos')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('3')
  })

  it('singulariza el summary cuando count=1', async () => {
    mockedCount.mockReturnValue(1)

    const signal = await getSampleSprintProjectionDegradedSignal()

    expect(signal.summary).toContain('1 degradación detectada')
  })

  it('retorna severity=unknown cuando el reader lanza', async () => {
    mockedCount.mockImplementation(() => {
      throw new Error('counter cant be read')
    })

    const signal = await getSampleSprintProjectionDegradedSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })

  it('expone window_minutes en evidence (steady=5min)', async () => {
    mockedCount.mockReturnValue(0)

    const signal = await getSampleSprintProjectionDegradedSignal()

    expect(signal.evidence.find(e => e.label === 'window_minutes')?.value).toBe('5')
  })
})
