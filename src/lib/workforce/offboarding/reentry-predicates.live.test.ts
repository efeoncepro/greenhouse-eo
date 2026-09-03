/**
 * PostgreSQL predicate regression tests: synthetic VALUES only, in a READ ONLY
 * transaction. No fixtures are inserted and no real workforce rows are read.
 * Both lifecycle execution and the drift signal consume these predicates.
 */
import { describe, expect, it } from 'vitest'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { reentryEngagementPredicate, reentryRelationshipPredicate } from './reentry-predicates'

const hasPgConfig = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

// test:live provides only canonical database access; it never enables writeback.
describe.skipIf(!hasPgConfig)('current workforce reentry predicates (read-only PostgreSQL)', () => {
  it('accepts current workforce and inclusive finite end dates, excludes ownership, future and ended episodes', async () => {
    const ids = await withGreenhousePostgresTransaction(async client => {
      await client.query('SET TRANSACTION READ ONLY')

      const result = await client.query<{ id: string }>(`
        WITH r(id, profile_id, relationship_type, status, effective_from, effective_to) AS (
          VALUES
            ('employee', 'profile', 'employee', 'active', DATE '2026-08-20', NULL::date),
            ('contractor', 'profile', 'contractor', 'active', DATE '2026-08-20', NULL::date),
            ('executive', 'profile', 'executive', 'active', DATE '2026-08-20', NULL::date),
            ('last-day', 'profile', 'contractor', 'active', DATE '2026-08-20', DATE '2026-09-03'),
            ('finite', 'profile', 'contractor', 'active', DATE '2026-08-20', DATE '2026-09-30'),
            ('shareholder', 'profile', 'shareholder', 'active', DATE '2026-08-20', NULL::date),
            ('future', 'profile', 'contractor', 'active', DATE '2026-09-04', NULL::date),
            ('ended', 'profile', 'contractor', 'ended', DATE '2026-08-20', DATE '2026-09-02'),
            ('past-end', 'profile', 'contractor', 'active', DATE '2026-08-20', DATE '2026-09-02'),
            ('old-episode', 'profile', 'employee', 'active', DATE '2026-05-01', NULL::date),
            ('other-person', 'other', 'contractor', 'active', DATE '2026-08-20', NULL::date)
        )
        SELECT id FROM r WHERE ${reentryRelationshipPredicate({
          profileIdSql: '$1', lastWorkingDaySql: '$2::date', asOfSql: '$3::date'
        })} ORDER BY id
      `, ['profile', '2026-05-30', '2026-09-03'])

      return result.rows.map(row => row.id)
    })

    expect(ids).toEqual(['contractor', 'employee', 'executive', 'finite', 'last-day'])
  })

  it('preserves profile-only engagements and excludes future, draft, pending and expired engagements', async () => {
    const ids = await withGreenhousePostgresTransaction(async client => {
      await client.query('SET TRANSACTION READ ONLY')

      const result = await client.query<{ id: string }>(`
        WITH e(id, profile_id, member_id, status, start_date, end_date) AS (
          VALUES
            ('profile-only', 'profile', NULL::text, 'active', DATE '2026-08-20', NULL::date),
            ('member-linked', NULL::text, 'member', 'active', DATE '2026-08-20', NULL::date),
            ('paused', 'profile', NULL::text, 'paused', DATE '2026-08-20', NULL::date),
            ('ending-today', 'profile', NULL::text, 'ending', DATE '2026-08-20', DATE '2026-09-03'),
            ('future', 'profile', NULL::text, 'active', DATE '2026-09-04', NULL::date),
            ('draft', 'profile', NULL::text, 'draft', DATE '2026-08-20', NULL::date),
            ('pending', 'profile', NULL::text, 'pending_review', DATE '2026-08-20', NULL::date),
            ('expired', 'profile', NULL::text, 'ending', DATE '2026-08-20', DATE '2026-09-02'),
            ('old-episode', 'profile', NULL::text, 'active', DATE '2026-05-01', NULL::date),
            ('other-person', 'other', 'other-member', 'active', DATE '2026-08-20', NULL::date)
        )
        SELECT id FROM e WHERE ${reentryEngagementPredicate({
          profileIdSql: '$1', memberIdSql: '$2', lastWorkingDaySql: '$3::date', asOfSql: '$4::date'
        })} ORDER BY id
      `, ['profile', 'member', '2026-05-30', '2026-09-03'])

      return result.rows.map(row => row.id)
    })

    expect(ids).toEqual(['ending-today', 'member-linked', 'paused', 'profile-only'])
  })
})
