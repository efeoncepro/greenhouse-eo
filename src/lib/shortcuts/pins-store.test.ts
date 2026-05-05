import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

interface MockPgResult {
  rows: Record<string, unknown>[]
}

const transactionState = {
  responses: [] as MockPgResult[],
  calls: [] as { sql: string; values: unknown[] }[]
}

const mockClientQuery = vi.fn(async (sql: string, values: unknown[] = []) => {
  transactionState.calls.push({ sql, values })

  if (transactionState.responses.length === 0) {
    return { rows: [] }
  }

  return transactionState.responses.shift() as MockPgResult
})

const mockWithGreenhousePostgresTransaction = vi.fn(async (callback: (client: { query: typeof mockClientQuery }) => unknown) =>
  callback({ query: mockClientQuery })
)

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: unknown, values: unknown) =>
    mockRunGreenhousePostgresQuery(sql, values),
  withGreenhousePostgresTransaction: (callback: (client: { query: typeof mockClientQuery }) => unknown) =>
    mockWithGreenhousePostgresTransaction(callback)
}))

describe('pins-store', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRunGreenhousePostgresQuery.mockReset()
    mockClientQuery.mockClear()
    transactionState.responses = []
    transactionState.calls = []
  })

  it('listUserShortcutPins returns rows in display order', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        pin_id: '1',
        user_id: 'user-1',
        shortcut_key: 'finance',
        display_order: 0,
        created_at: new Date('2026-05-01T00:00:00Z'),
        updated_at: new Date('2026-05-01T00:00:00Z')
      },
      {
        pin_id: '2',
        user_id: 'user-1',
        shortcut_key: 'people',
        display_order: 1,
        created_at: new Date('2026-05-01T00:01:00Z'),
        updated_at: new Date('2026-05-01T00:01:00Z')
      }
    ])

    const { listUserShortcutPins } = await import('./pins-store')

    const result = await listUserShortcutPins('user-1')

    expect(result).toHaveLength(2)
    expect(result[0]?.shortcutKey).toBe('finance')
    expect(result[1]?.shortcutKey).toBe('people')
  })

  it('pinShortcut is idempotent — returns existing pin when present', async () => {
    transactionState.responses = [
      {
        rows: [
          {
            pin_id: '99',
            user_id: 'user-1',
            shortcut_key: 'finance',
            display_order: 3,
            created_at: new Date('2026-05-01T00:00:00Z'),
            updated_at: new Date('2026-05-01T00:00:00Z')
          }
        ]
      }
    ]

    const { pinShortcut } = await import('./pins-store')

    const result = await pinShortcut('user-1', 'finance')

    expect(result.pinId).toBe('99')
    expect(transactionState.calls.length).toBe(1) // SELECT only, no INSERT
  })

  it('pinShortcut creates a new pin at the next available display_order', async () => {
    transactionState.responses = [
      { rows: [] }, // SELECT existing
      { rows: [{ next_order: 4 }] }, // SELECT MAX
      {
        rows: [
          {
            pin_id: '101',
            user_id: 'user-1',
            shortcut_key: 'people',
            display_order: 4,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      }
    ]

    const { pinShortcut } = await import('./pins-store')

    const result = await pinShortcut('user-1', 'people')

    expect(result.pinId).toBe('101')
    expect(result.displayOrder).toBe(4)
    expect(transactionState.calls.length).toBe(3)
  })

  it('pinShortcut rejects unknown catalog keys', async () => {
    const { pinShortcut, UserShortcutPinError } = await import('./pins-store')

    await expect(pinShortcut('user-1', 'totally-fake-key')).rejects.toBeInstanceOf(UserShortcutPinError)
  })

  it('pinShortcut rejects empty userId', async () => {
    const { pinShortcut, UserShortcutPinError } = await import('./pins-store')

    await expect(pinShortcut('   ', 'finance')).rejects.toBeInstanceOf(UserShortcutPinError)
  })

  it('unpinShortcut returns true when row was deleted', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ pin_id: '1' }])

    const { unpinShortcut } = await import('./pins-store')

    expect(await unpinShortcut('user-1', 'finance')).toBe(true)
  })

  it('unpinShortcut returns false when no row matched', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    const { unpinShortcut } = await import('./pins-store')

    expect(await unpinShortcut('user-1', 'finance')).toBe(false)
  })

  it('reorderUserShortcutPins rejects duplicates', async () => {
    const { reorderUserShortcutPins, UserShortcutPinError } = await import('./pins-store')

    await expect(reorderUserShortcutPins('user-1', ['finance', 'finance'])).rejects.toBeInstanceOf(UserShortcutPinError)
  })

  it('reorderUserShortcutPins rejects unknown keys', async () => {
    const { reorderUserShortcutPins, UserShortcutPinError } = await import('./pins-store')

    await expect(reorderUserShortcutPins('user-1', ['finance', 'unknown-x'])).rejects.toBeInstanceOf(
      UserShortcutPinError
    )
  })

  it('reorderUserShortcutPins rejects keys not pinned by user', async () => {
    transactionState.responses = [
      { rows: [{ shortcut_key: 'finance' }] }, // existing pins (people NOT pinned)
      { rows: [] }
    ]

    const { reorderUserShortcutPins, UserShortcutPinError } = await import('./pins-store')

    await expect(reorderUserShortcutPins('user-1', ['finance', 'people'])).rejects.toBeInstanceOf(
      UserShortcutPinError
    )
  })

  it('reorderUserShortcutPins applies sequential display_order', async () => {
    transactionState.responses = [
      // existing pins
      { rows: [{ shortcut_key: 'finance' }, { shortcut_key: 'people' }, { shortcut_key: 'hr' }] },
      // 3 UPDATEs (responses ignored)
      { rows: [] },
      { rows: [] },
      { rows: [] },
      // refreshed list
      {
        rows: [
          {
            pin_id: '1',
            user_id: 'user-1',
            shortcut_key: 'people',
            display_order: 0,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            pin_id: '2',
            user_id: 'user-1',
            shortcut_key: 'finance',
            display_order: 1,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            pin_id: '3',
            user_id: 'user-1',
            shortcut_key: 'hr',
            display_order: 2,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      }
    ]

    const { reorderUserShortcutPins } = await import('./pins-store')

    const result = await reorderUserShortcutPins('user-1', ['people', 'finance'])

    expect(result.map(row => row.shortcutKey)).toEqual(['people', 'finance', 'hr'])
    // 2 UPDATEs for explicit + 1 UPDATE for tail keep
    const updateCalls = transactionState.calls.filter(call => call.sql.includes('UPDATE'))

    expect(updateCalls).toHaveLength(3)
  })
})
