import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const query = vi.hoisted(() => vi.fn())

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: query }))

import { searchTalentPool } from './readers'

const row = (id: string, updatedAt: string) => ({
  public_id: id,
  lifecycle_status: 'active_process',
  aggregate_version: 1,
  future_consent_expires_at: null,
  availability: null,
  seniority: null,
  country_code: null,
  full_name: `Candidate ${id}`,
  updated_at: updatedAt
})

describe('Talent Pool cursor contract', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', 'a'.repeat(64))
    query.mockReset()
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM greenhouse_hiring.talent_pool_membership m') && sql.includes('LIMIT')) {
        return [row('EO-TLP-2', '2026-08-16T10:00:00.000Z'), row('EO-TLP-1', '2026-08-16T09:00:00.000Z')]
      }

      return []
    })
  })

  it('signs and binds pagination to actor, filters, policy and a fixed snapshot', async () => {
    const first = await searchTalentPool({ query: 'content', cursorBinding: 'user-1:client-1', limit: 1 })

    expect(first.nextCursor).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    await expect(
      searchTalentPool({ query: 'content', cursorBinding: 'user-1:client-1', cursor: first.nextCursor!, limit: 1 })
    ).resolves.toBeDefined()
    await expect(
      searchTalentPool({ query: 'account', cursorBinding: 'user-1:client-1', cursor: first.nextCursor!, limit: 1 })
    ).rejects.toMatchObject({ code: 'talent_pool_invalid_cursor' })
    await expect(
      searchTalentPool({ query: 'content', cursorBinding: 'user-2:client-1', cursor: first.nextCursor!, limit: 1 })
    ).rejects.toMatchObject({ code: 'talent_pool_invalid_cursor' })
  })
})
