import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockCreateStructuredContext = vi.fn()
const mockGetLatestStructuredContextByOwner = vi.fn()

vi.mock('./store', () => ({
  createStructuredContext: (...args: unknown[]) => mockCreateStructuredContext(...args),
  getLatestStructuredContextByOwner: (...args: unknown[]) => mockGetLatestStructuredContextByOwner(...args)
}))

describe('structured context reactive helpers', () => {
  beforeEach(() => {
    mockCreateStructuredContext.mockReset()
    mockGetLatestStructuredContextByOwner.mockReset()
  })

  it('writes replay context using the canonical store', async () => {
    mockCreateStructuredContext.mockResolvedValue({ contextId: 'ctx-1' })

    const { createReactiveReplayContext } = await import('./reactive')

    await createReactiveReplayContext({
      runId: 'reactive-1',
      status: 'succeeded',
      result: {
        eventsProcessed: 8,
        eventsFailed: 1,
        projectionsTriggered: 3,
        durationMs: 1200
      }
    })

    expect(mockCreateStructuredContext).toHaveBeenCalledTimes(1)
    expect(mockCreateStructuredContext.mock.calls[0]?.[0]).toMatchObject({
      ownerAggregateType: 'source_sync_run',
      ownerAggregateId: 'reactive-1',
      contextKind: 'event.replay_context'
    })
  })

  it('reads the latest replay context for a run', async () => {
    mockGetLatestStructuredContextByOwner.mockResolvedValue({ contextId: 'ctx-1' })

    const { getReactiveReplayContext } = await import('./reactive')

    const result = await getReactiveReplayContext('reactive-1')

    expect(result).toEqual({ contextId: 'ctx-1' })
    expect(mockGetLatestStructuredContextByOwner).toHaveBeenCalledWith({
      ownerAggregateType: 'source_sync_run',
      ownerAggregateId: 'reactive-1',
      contextKind: 'event.replay_context'
    })
  })
})
