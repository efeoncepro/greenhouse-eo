import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { query } from '@/lib/db'

import { getOperationalSpaceUngrantedUsersSignal, resolveOperationalSpaceUngrantedSeverity } from './operational-space-ungranted-users'

describe('identity.operational_space.ungranted_user (TASK-2096)', () => {
  it('steady 0 is ok; a few people warn; more than three is an error', () => {
    expect(resolveOperationalSpaceUngrantedSeverity(0)).toBe('ok')
    expect(resolveOperationalSpaceUngrantedSeverity(3)).toBe('warning')
    expect(resolveOperationalSpaceUngrantedSeverity(4)).toBe('error')
  })

  it('is not_configured, without querying grants, while the table does not exist', async () => {
    vi.mocked(query).mockResolvedValueOnce([{ exists: false }] as never)

    const signal = await getOperationalSpaceUngrantedUsersSignal()

    expect(signal.severity).toBe('not_configured')
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('a read failure is unknown, never ok', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('synthetic failure'))

    expect((await getOperationalSpaceUngrantedUsersSignal()).severity).toBe('unknown')
  })
})
