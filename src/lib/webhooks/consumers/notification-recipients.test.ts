import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const {
  getMemberRecipient,
  getPayrollPeriodRecipients,
  getHrAdminRecipients
} = await import('./notification-recipients')

describe('notification recipient helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves a member recipient when a linked user exists', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        member_id: 'member-1',
        user_id: 'user-1',
        email: 'member@example.com',
        full_name: 'Member One'
      }
    ])

    await expect(getMemberRecipient('member-1')).resolves.toEqual({
      recipients: [{ userId: 'user-1', email: 'member@example.com', fullName: 'Member One' }],
      unresolvedRecipients: 0
    })
  })

  it('counts unresolved member recipients when the member has no linked user', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        member_id: 'member-2',
        user_id: null,
        email: null,
        full_name: 'Member Two'
      }
    ])

    await expect(getMemberRecipient('member-2')).resolves.toEqual({
      recipients: [],
      unresolvedRecipients: 1
    })
  })

  it('resolves payroll period recipients and tracks unresolved members', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        member_id: 'member-1',
        user_id: 'user-1',
        email: 'user1@example.com',
        full_name: 'User One'
      },
      {
        member_id: 'member-2',
        user_id: null,
        email: null,
        full_name: 'User Two'
      }
    ])

    await expect(getPayrollPeriodRecipients('2026-03')).resolves.toEqual({
      recipients: [{ userId: 'user-1', email: 'user1@example.com', fullName: 'User One' }],
      unresolvedRecipients: 1
    })
  })

  it('resolves HR/admin recipients from session_360', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        user_id: 'user-admin',
        email: 'admin@efeoncepro.com',
        full_name: 'Admin One'
      }
    ])

    await expect(getHrAdminRecipients()).resolves.toEqual({
      recipients: [{ userId: 'user-admin', email: 'admin@efeoncepro.com', fullName: 'Admin One' }],
      unresolvedRecipients: 0
    })
  })
})
