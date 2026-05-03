/**
 * TASK-773 Slice 4 — tests para los 2 readers de salud del outbox publisher.
 *
 * Cada reader cubre 3 paths:
 *   1. count = 0 → severity 'ok'
 *   2. count > 0 → severity 'error'
 *   3. query throws → severity 'unknown' (degraded honestly)
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
  getOutboxUnpublishedLagSignal,
  OUTBOX_UNPUBLISHED_LAG_SIGNAL_ID
} from './outbox-unpublished-lag'

import {
  getOutboxDeadLetterSignal,
  OUTBOX_DEAD_LETTER_SIGNAL_ID
} from './outbox-dead-letter'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getOutboxUnpublishedLagSignal', () => {
  it('returns ok when count = 0 (publisher al día)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getOutboxUnpublishedLagSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('lag')
    expect(signal.moduleKey).toBe('sync')
    expect(signal.signalId).toBe(OUTBOX_UNPUBLISHED_LAG_SIGNAL_ID)
    expect(signal.summary).toContain('al día')
  })

  it('returns error when count > 0 (publisher caído o falla persistente)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 17 }])

    const signal = await getOutboxUnpublishedLagSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('17')
    expect(signal.summary).toContain('Publisher caído')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('17')
  })

  it('returns unknown when query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getOutboxUnpublishedLagSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})

describe('getOutboxDeadLetterSignal', () => {
  it('returns ok when count = 0 (publisher saludable)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getOutboxDeadLetterSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('dead_letter')
    expect(signal.moduleKey).toBe('sync')
    expect(signal.signalId).toBe(OUTBOX_DEAD_LETTER_SIGNAL_ID)
    expect(signal.summary).toContain('Sin events en dead-letter')
  })

  it('returns error when count > 0 (replay manual o investigación)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 3 }])

    const signal = await getOutboxDeadLetterSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('3')
    expect(signal.summary).toContain('Replay manual')
  })

  it('returns unknown when query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getOutboxDeadLetterSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})
