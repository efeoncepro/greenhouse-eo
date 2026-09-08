import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ client: { query: vi.fn() } }))

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: async (callback: (client: typeof state.client) => Promise<unknown>) => callback(state.client) }))
import { withInternalAuthoritySnapshot } from './snapshot'

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })
describe('TASK-1844 request-local snapshot', () => {
  const setup = () => {
    vi.useFakeTimers()
    const now = new Date('2026-09-08T18:00:00Z')

    vi.setSystemTime(now)
    state.client.query.mockImplementation(async (query: string | { text: string }) => ({ rows:
      typeof query === 'string' && query.includes('CURRENT_TIMESTAMP') ? [{ now }]
        : typeof query === 'object' ? [{ expires_at: new Date(now.getTime() + 1000) }] : [] }))

    return now
  }

  it('shares facts only within a request and rejects a deadline or permission expiry crossed in flight', async () => {
    const now = setup()

    const read = () => withInternalAuthoritySnapshot(async ({ readQuery }) => {
      const [a,b] = await Promise.all([readQuery('SELECT facts', ['A']), readQuery('SELECT facts', ['A'])])

      expect(a).toEqual(b)

      return a
    })

    await read()
    expect(state.client.query.mock.calls.filter(([sql]) => typeof sql === 'object')).toHaveLength(1)
    await read()
    expect(state.client.query.mock.calls.filter(([sql]) => typeof sql === 'object')).toHaveLength(2)
    await expect(withInternalAuthoritySnapshot(async ({ readQuery }) => {
      await readQuery('SELECT facts', ['A'])
      vi.setSystemTime(now.getTime() + 1000)

      return true
    })).rejects.toThrow('internal_reader_temporal_boundary')
  })
})
