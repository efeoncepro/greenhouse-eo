import 'server-only'

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

const normalizeString = (value: string | null | undefined) => value?.trim() || null

const setPrimaryMembershipForProfile = async (profileId: string, membershipId: string) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.person_memberships
     SET is_primary = CASE WHEN membership_id = $2 THEN TRUE ELSE FALSE END,
         updated_at = CURRENT_TIMESTAMP
     WHERE profile_id = $1
       AND active = TRUE`,
    [profileId, membershipId]
  )
}

const publishMembershipUpdated = async (params: {
  membershipId: string
  profileId: string
  organizationId: string
}) => {
  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.membership,
    aggregateId: params.membershipId,
    eventType: EVENT_TYPES.membershipUpdated,
    payload: {
      membershipId: params.membershipId,
      profileId: params.profileId,
      organizationId: params.organizationId
    }
  })
}

export const syncOperatingEntityMembershipForMember = async (
  memberId: string
): Promise<OperatingEntityMembershipSyncResult> => {
  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    return { action: 'skipped', membershipId: null }
  }

  const [member] = await runGreenhousePostgresQuery<MemberContextRow>(
    `SELECT identity_profile_id, role_title, active
     FROM greenhouse_core.members
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  )

  const profileId = normalizeString(member?.identity_profile_id)

  if (!profileId) {
    return { action: 'skipped', membershipId: null }
  }

  const [existing] = await runGreenhousePostgresQuery<ExistingMembershipRow>(
    `SELECT membership_id, active, is_primary, role_label
     FROM greenhouse_core.person_memberships
     WHERE profile_id = $1
       AND organization_id = $2
       AND membership_type = $3
     ORDER BY active DESC, is_primary DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, membership_id ASC
     LIMIT 1`,
    [profileId, operatingEntity.organizationId, TEAM_MEMBER_MEMBERSHIP_TYPE]
  )

  if (!member.active) {
    if (!existing?.active) {
      return { action: 'noop', membershipId: null }
    }

    await deactivateMembership(existing.membership_id)

    return { action: 'deactivated', membershipId: existing.membership_id }
  }

  const desiredRoleLabel = normalizeString(member.role_title)

  if (!existing) {
    const created = await createMembership({
      profileId,
      organizationId: operatingEntity.organizationId,
      membershipType: TEAM_MEMBER_MEMBERSHIP_TYPE,
      roleLabel: desiredRoleLabel ?? undefined,
      isPrimary: true
    })

    await setPrimaryMembershipForProfile(profileId, created.membershipId)

    return { action: 'created', membershipId: created.membershipId }
  }

  if (!existing.active) {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.person_memberships
       SET active = TRUE,
           status = 'active',
           role_label = $2,
           is_primary = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE membership_id = $1`,
      [existing.membership_id, desiredRoleLabel]
    )

    await setPrimaryMembershipForProfile(profileId, existing.membership_id)
    await publishMembershipUpdated({
      membershipId: existing.membership_id,
      profileId,
      organizationId: operatingEntity.organizationId
    })

    return { action: 'reactivated', membershipId: existing.membership_id }
  }

  const roleLabelChanged = normalizeString(existing.role_label) !== desiredRoleLabel
  const primaryChanged = existing.is_primary !== true

  if (!roleLabelChanged && !primaryChanged) {
    return { action: 'noop', membershipId: null }
  }

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.person_memberships
     SET role_label = $2,
         is_primary = TRUE,
         updated_at = CURRENT_TIMESTAMP
     WHERE membership_id = $1`,
    [existing.membership_id, desiredRoleLabel]
  )

  await setPrimaryMembershipForProfile(profileId, existing.membership_id)
  await publishMembershipUpdated({
    membershipId: existing.membership_id,
    profileId,
    organizationId: operatingEntity.organizationId
  })

  return { action: 'updated', membershipId: existing.membership_id }
}
