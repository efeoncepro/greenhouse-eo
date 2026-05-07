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

import {
  EMAIL_RENDER_FAILURE_SIGNAL_ID,
  getEmailRenderFailureSignal
} from './email-render-failure'

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

describe('getEmailRenderFailureSignal', () => {
  it('returns ok when no render/template failures were observed', async () => {
    queryMock.mockResolvedValueOnce([
      {
        total_attempts: 42,
        delivery_render_failures: 0,
        reactive_render_failures: 0,
        total_render_failures: 0
      }
    ])

    const signal = await getEmailRenderFailureSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('runtime')
    expect(signal.moduleKey).toBe('sync')
    expect(signal.signalId).toBe(EMAIL_RENDER_FAILURE_SIGNAL_ID)
    expect(signal.summary).toContain('Sin fallas')
    expect(signal.evidence.find(e => e.label === 'delivery_failure_rate_percent')?.value).toBe('0.00')
  })

  it('returns error when delivery or reactive render failures exist', async () => {
    queryMock.mockResolvedValueOnce([
      {
        total_attempts: 50,
        delivery_render_failures: 2,
        reactive_render_failures: 1,
        total_render_failures: 3
      }
    ])

    const signal = await getEmailRenderFailureSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('3')
    expect(signal.summary).toContain('render/template')
    expect(signal.evidence.find(e => e.label === 'total_render_failures')?.value).toBe('3')
    expect(signal.evidence.find(e => e.label === 'delivery_failure_rate_percent')?.value).toBe('4.00')
  })

  it('returns unknown when query throws (degraded honestly)', async () => {
    queryMock.mockRejectedValueOnce(new Error('email audit unavailable'))

    const signal = await getEmailRenderFailureSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
  })
})
