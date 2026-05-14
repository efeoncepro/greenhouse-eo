import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { createMembership, deactivateMembership } from './organization-store'
import { TEAM_MEMBER_MEMBERSHIP_TYPE } from './membership-types'
import { getOperatingEntityIdentity } from './organization-identity'

type MemberContextRow = {
  identity_profile_id: string | null
  role_title: string | null
  active: boolean
}

type ExistingMembershipRow = {
  membership_id: string
  active: boolean
  is_primary: boolean
  role_label: string | null
}

export type OperatingEntityMembershipSyncResult =
  | { action: 'created' | 'reactivated' | 'updated' | 'deactivated'; membershipId: string }
  | { action: 'noop' | 'skipped'; membershipId: null }

/**
 * TASK-872 — Dual-mode query helper. When `client` provided, runs inside the
 * caller's PG transaction. Else falls back to the global pool runner.
 */
const runQueryWithClient = async <T extends Record<string, unknown>>(
  text: string,
  params: unknown[],
  client?: PoolClient
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(text, params)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, params)
}

const normalizeString = (value: string | null | undefined) => value?.trim() || null

const setPrimaryMembershipForProfile = async (profileId: string, membershipId: string, client?: PoolClient) => {
  await runQueryWithClient(
    `UPDATE greenhouse_core.person_memberships
     SET is_primary = CASE WHEN membership_id = $2 THEN TRUE ELSE FALSE END,
         updated_at = CURRENT_TIMESTAMP
     WHERE profile_id = $1
       AND active = TRUE`,
    [profileId, membershipId],
    client
  )
}

const publishMembershipUpdated = async (
  params: {
    membershipId: string
    profileId: string
    organizationId: string
  },
  client?: PoolClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.membership,
      aggregateId: params.membershipId,
      eventType: EVENT_TYPES.membershipUpdated,
      payload: {
        membershipId: params.membershipId,
        profileId: params.profileId,
        organizationId: params.organizationId
      }
    },
    client
  )
}

export const syncOperatingEntityMembershipForMember = async (
  memberId: string,
  options: { client?: PoolClient } = {}
): Promise<OperatingEntityMembershipSyncResult> => {
  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    return { action: 'skipped', membershipId: null }
  }

  const client = options.client

  const [member] = await runQueryWithClient<MemberContextRow>(
    `SELECT identity_profile_id, role_title, active
     FROM greenhouse_core.members
     WHERE member_id = $1
     LIMIT 1`,
    [memberId],
    client
  )

  const profileId = normalizeString(member?.identity_profile_id)

  if (!profileId) {
    return { action: 'skipped', membershipId: null }
  }

  const [existing] = await runQueryWithClient<ExistingMembershipRow>(
    `SELECT membership_id, active, is_primary, role_label
     FROM greenhouse_core.person_memberships
     WHERE profile_id = $1
       AND organization_id = $2
       AND membership_type = $3
     ORDER BY active DESC, is_primary DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, membership_id ASC
     LIMIT 1`,
    [profileId, operatingEntity.organizationId, TEAM_MEMBER_MEMBERSHIP_TYPE],
    client
  )

  if (!member.active) {
    if (!existing?.active) {
      return { action: 'noop', membershipId: null }
    }

    await deactivateMembership(existing.membership_id, { client })

    return { action: 'deactivated', membershipId: existing.membership_id }
  }

  const desiredRoleLabel = normalizeString(member.role_title)

  if (!existing) {
    const created = await createMembership(
      {
        profileId,
        organizationId: operatingEntity.organizationId,
        membershipType: TEAM_MEMBER_MEMBERSHIP_TYPE,
        roleLabel: desiredRoleLabel ?? undefined,
        isPrimary: true
      },
      { client }
    )

    await setPrimaryMembershipForProfile(profileId, created.membershipId, client)

    return { action: 'created', membershipId: created.membershipId }
  }

  if (!existing.active) {
    await runQueryWithClient(
      `UPDATE greenhouse_core.person_memberships
       SET active = TRUE,
           status = 'active',
           role_label = $2,
           is_primary = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE membership_id = $1`,
      [existing.membership_id, desiredRoleLabel],
      client
    )

    await setPrimaryMembershipForProfile(profileId, existing.membership_id, client)
    await publishMembershipUpdated(
      {
        membershipId: existing.membership_id,
        profileId,
        organizationId: operatingEntity.organizationId
      },
      client
    )

    return { action: 'reactivated', membershipId: existing.membership_id }
  }

  const roleLabelChanged = normalizeString(existing.role_label) !== desiredRoleLabel
  const primaryChanged = existing.is_primary !== true

  if (!roleLabelChanged && !primaryChanged) {
    return { action: 'noop', membershipId: null }
  }

  await runQueryWithClient(
    `UPDATE greenhouse_core.person_memberships
     SET role_label = $2,
         is_primary = TRUE,
         updated_at = CURRENT_TIMESTAMP
     WHERE membership_id = $1`,
    [existing.membership_id, desiredRoleLabel],
    client
  )

  await setPrimaryMembershipForProfile(profileId, existing.membership_id, client)
  await publishMembershipUpdated(
    {
      membershipId: existing.membership_id,
      profileId,
      organizationId: operatingEntity.organizationId
    },
    client
  )

  return { action: 'updated', membershipId: existing.membership_id }
}
