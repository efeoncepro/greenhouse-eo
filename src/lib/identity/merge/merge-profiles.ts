import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

// ── Types ────────────────────────────────────────────────────────────

export interface MergeProfilesInput {
  sourceProfileId: string
  targetProfileId: string
  mergedBy: string
  mergeReason?: string
}

export interface MergeProfilesResult {
  mergeId: string
  sourceProfileId: string
  targetProfileId: string
  sourceLinksMovedCount: number
  clientUsersMovedCount: number
  membersMovedCount: number
  membershipsMovedCount: number
  membershipsDeduped: number
  contactsMovedCount: number
  shareholderAccountsMovedCount: number
}

// ── Helpers ──────────────────────────────────────────────────────────

const rowCount = (result: { rowCount?: number | null }): number =>
  result.rowCount ?? 0

async function validateProfiles(
  client: PoolClient,
  sourceProfileId: string,
  targetProfileId: string
): Promise<void> {
  if (sourceProfileId === targetProfileId) {
    throw new Error('Cannot merge a profile into itself')
  }

  const { rows } = await client.query<{
    profile_id: string
    status: string
    active: boolean
    merged_into_profile_id: string | null
  }>(
    `SELECT profile_id, status, active, merged_into_profile_id
     FROM greenhouse_core.identity_profiles
     WHERE profile_id = ANY($1)`,
    [[sourceProfileId, targetProfileId]]
  )

  const source = rows.find(r => r.profile_id === sourceProfileId)
  const target = rows.find(r => r.profile_id === targetProfileId)

  if (!source) throw new Error(`Source profile not found: ${sourceProfileId}`)
  if (!target) throw new Error(`Target profile not found: ${targetProfileId}`)

  if (source.status === 'merged') {
    throw new Error(
      `Source profile is already merged into ${source.merged_into_profile_id}`
    )
  }

  if (target.status === 'merged') {
    throw new Error(
      `Target profile is itself merged — resolve the chain first (merged into ${target.merged_into_profile_id})`
    )
  }
}

async function snapshotProfile(
  client: PoolClient,
  profileId: string
): Promise<Record<string, unknown>> {
  const { rows } = await client.query(
    `SELECT * FROM greenhouse_core.identity_profiles WHERE profile_id = $1`,
    [profileId]
  )

  return (rows[0] as Record<string, unknown>) ?? {}
}

// ── Core merge ───────────────────────────────────────────────────────

/**
 * Merge one identity profile into another within a single Postgres transaction.
 *
 * All child records (source_links, client_users, members, person_memberships,
 * CRM contacts, shareholder_accounts) are reparented from `source` to `target`.
 * The source profile is marked `status='merged'` with an audit trail.
 */
export async function mergeIdentityProfiles(
  input: MergeProfilesInput
): Promise<MergeProfilesResult> {
  const { sourceProfileId, targetProfileId, mergedBy, mergeReason } = input
  const mergeId = `merge-${randomUUID()}`

  return withGreenhousePostgresTransaction(async (client) => {
    // ── Validate ──────────────────────────────────────────────
    await validateProfiles(client, sourceProfileId, targetProfileId)

    // ── Snapshot source for audit ─────────────────────────────
    const snapshot = await snapshotProfile(client, sourceProfileId)

    // ── 1. Reparent identity_profile_source_links ─────────────
    // Deactivate source links that would conflict with existing target links
    await client.query(
      `UPDATE greenhouse_core.identity_profile_source_links
       SET active = FALSE, updated_at = NOW()
       WHERE profile_id = $1
         AND (source_system, source_object_type, source_object_id) IN (
           SELECT source_system, source_object_type, source_object_id
           FROM greenhouse_core.identity_profile_source_links
           WHERE profile_id = $2
         )`,
      [sourceProfileId, targetProfileId]
    )

    // Move remaining active links
    const linksResult = await client.query(
      `UPDATE greenhouse_core.identity_profile_source_links
       SET profile_id = $2, updated_at = NOW()
       WHERE profile_id = $1 AND active = TRUE`,
      [sourceProfileId, targetProfileId]
    )

    const sourceLinksMovedCount = rowCount(linksResult)

    // ── 2. Reparent client_users ──────────────────────────────
    const usersResult = await client.query(
      `UPDATE greenhouse_core.client_users
       SET identity_profile_id = $2, updated_at = NOW()
       WHERE identity_profile_id = $1`,
      [sourceProfileId, targetProfileId]
    )

    const clientUsersMovedCount = rowCount(usersResult)

    // ── 3. Reparent members ───────────────────────────────────
    const membersResult = await client.query(
      `UPDATE greenhouse_core.members
       SET identity_profile_id = $2, updated_at = NOW()
       WHERE identity_profile_id = $1`,
      [sourceProfileId, targetProfileId]
    )

    const membersMovedCount = rowCount(membersResult)

    // ── 4. Reparent person_memberships ────────────────────────
    const membershipsResult = await client.query(
      `UPDATE greenhouse_core.person_memberships
       SET profile_id = $2, updated_at = NOW()
       WHERE profile_id = $1`,
      [sourceProfileId, targetProfileId]
    )

    const membershipsMovedCount = rowCount(membershipsResult)

    // Deduplicate memberships to same org
    const dedupResult = await client.query(
      `WITH ranked AS (
         SELECT membership_id,
                ROW_NUMBER() OVER (
                  PARTITION BY profile_id, organization_id
                  ORDER BY is_primary DESC, start_date ASC NULLS LAST, created_at ASC
                ) AS rn
         FROM greenhouse_core.person_memberships
         WHERE profile_id = $1
           AND active = TRUE
           AND organization_id IS NOT NULL
       )
       UPDATE greenhouse_core.person_memberships
       SET active = FALSE, status = 'deduped_merge', updated_at = NOW()
       WHERE membership_id IN (SELECT membership_id FROM ranked WHERE rn > 1)`,
      [targetProfileId]
    )

    const membershipsDeduped = rowCount(dedupResult)

    // ── 5. Reparent CRM contacts ──────────────────────────────
    const contactsResult = await client.query(
      `UPDATE greenhouse_crm.contacts
       SET linked_identity_profile_id = $2, updated_at = NOW()
       WHERE linked_identity_profile_id = $1`,
      [sourceProfileId, targetProfileId]
    )

    const contactsMovedCount = rowCount(contactsResult)

    // ── 6. Reparent shareholder accounts ──────────────────────
    const shareholderResult = await client.query(
      `UPDATE greenhouse_finance.shareholder_accounts
       SET profile_id = $2, updated_at = NOW()
       WHERE profile_id = $1`,
      [sourceProfileId, targetProfileId]
    )

    const shareholderAccountsMovedCount = rowCount(shareholderResult)

    // ── 7. Mark source profile as merged ──────────────────────
    await client.query(
      `UPDATE greenhouse_core.identity_profiles
       SET status = 'merged',
           active = FALSE,
           merged_into_profile_id = $2,
           updated_at = NOW()
       WHERE profile_id = $1`,
      [sourceProfileId, targetProfileId]
    )

    // ── 8. Audit log ──────────────────────────────────────────
    await client.query(
      `INSERT INTO greenhouse_sync.identity_profile_merge_log (
         merge_id, source_profile_id, target_profile_id,
         merged_by, merge_reason,
         source_links_moved, client_users_moved, members_moved,
         memberships_moved, memberships_deduped, contacts_moved,
         source_profile_snapshot
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
      [
        mergeId,
        sourceProfileId,
        targetProfileId,
        mergedBy,
        mergeReason ?? null,
        sourceLinksMovedCount,
        clientUsersMovedCount,
        membersMovedCount,
        membershipsMovedCount,
        membershipsDeduped,
        contactsMovedCount,
        JSON.stringify(snapshot)
      ]
    )

    // ── 9. Outbox event (transactional) ───────────────────────
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.identityProfile,
        aggregateId: targetProfileId,
        eventType: EVENT_TYPES.profileMerged,
        payload: {
          mergeId,
          sourceProfileId,
          targetProfileId,
          mergedBy,
          sourceLinksMovedCount,
          clientUsersMovedCount,
          membersMovedCount,
          membershipsMovedCount,
          contactsMovedCount
        }
      },
      client
    )

    return {
      mergeId,
      sourceProfileId,
      targetProfileId,
      sourceLinksMovedCount,
      clientUsersMovedCount,
      membersMovedCount,
      membershipsMovedCount,
      membershipsDeduped,
      contactsMovedCount,
      shareholderAccountsMovedCount
    }
  })
}

// ── Queries ──────────────────────────────────────────────────────────

/**
 * List all merge operations recorded in the audit log.
 */
export async function listMergeLog(limit = 50) {
  return runGreenhousePostgresQuery(
    `SELECT ml.*,
            tp.full_name AS target_full_name,
            tp.canonical_email AS target_email
     FROM greenhouse_sync.identity_profile_merge_log ml
     LEFT JOIN greenhouse_core.identity_profiles tp
       ON tp.profile_id = ml.target_profile_id
     ORDER BY ml.created_at DESC
     LIMIT $1`,
    [limit]
  )
}
