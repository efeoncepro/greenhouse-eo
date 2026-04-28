import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

import { resolveAutoAdoptPolicy } from '@/lib/finance/external-cash-signals'

describe('TASK-708 D3 — auto-adopt policy resolver', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
  })

  it('defaults to review when no row matches', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    const mode = await resolveAutoAdoptPolicy('nubox', 'space-1')

    expect(mode).toBe('review')
  })

  it('honors auto_adopt when policy active for (source, space)', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ mode: 'auto_adopt', space_id: 'space-1' }])

    const mode = await resolveAutoAdoptPolicy('nubox', 'space-1')

    expect(mode).toBe('auto_adopt')
  })

  it('honors review when policy explicit', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ mode: 'review', space_id: null }])

    const mode = await resolveAutoAdoptPolicy('nubox', 'space-1')

    expect(mode).toBe('review')
  })
})
