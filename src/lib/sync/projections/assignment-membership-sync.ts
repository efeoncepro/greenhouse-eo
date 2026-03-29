import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { generateMembershipId, nextPublicId } from '@/lib/account-360/id-generation'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import type { ProjectionDefinition } from '../projection-registry'

// ── Types ──

type SpaceContext = {
  space_id: string
  organization_id: string
}

type ExistingMembership = {
  membership_id: string
  active: boolean
}

// ── Core logic ──

/**
 * Ensure that a team member assigned to a client via client_team_assignments
 * has a corresponding person_membership in the client's organization.
 *
 * Bridge chain:
 *   assignment.client_id → spaces.client_id → spaces.organization_id
 *   member.identity_profile_id → person_memberships.profile_id
 */
const syncAssignmentToMembership = async (memberId: string, clientId: string): Promise<string | null> => {
  // 1. Resolve the member's profile_id and role
  const [member] = await runGreenhousePostgresQuery<{
    identity_profile_id: string | null
    role_title: string | null
  }>(
    `SELECT identity_profile_id, role_title
     FROM greenhouse_core.members
     WHERE member_id = $1 AND active = TRUE`,
    [memberId]
  )

  if (!member?.identity_profile_id) {
    return null // No profile linked — cannot create membership
  }

  // 2. Resolve organization via spaces bridge
  const [space] = await runGreenhousePostgresQuery<SpaceContext>(
    `SELECT space_id, organization_id
     FROM greenhouse_core.spaces
     WHERE client_id = $1 AND active = TRUE
     LIMIT 1`,
    [clientId]
  )

  if (!space?.organization_id) {
    return null // No space/org bridge for this client
  }

  // 3. Check if membership already exists
  const [existing] = await runGreenhousePostgresQuery<ExistingMembership>(
    `SELECT membership_id, active
     FROM greenhouse_core.person_memberships
     WHERE profile_id = $1
       AND organization_id = $2
       AND membership_type = 'team_member'
     LIMIT 1`,
    [member.identity_profile_id, space.organization_id]
  )

  if (existing?.active) {
    return existing.membership_id // Already exists and active
  }

  if (existing && !existing.active) {
    // Reactivate
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.person_memberships
       SET active = TRUE, status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE membership_id = $1`,
      [existing.membership_id]
    )

    return existing.membership_id
  }

  // 4. Create new membership
  const membershipId = generateMembershipId()
  const publicId = await nextPublicId('EO-MBR')

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.person_memberships (
       membership_id, public_id, profile_id, organization_id, space_id,
       membership_type, role_label, department, is_primary,
       status, active, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, 'team_member', $6, NULL, FALSE,
             'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (membership_id) DO NOTHING`,
    [
      membershipId,
      publicId,
      member.identity_profile_id,
      space.organization_id,
      space.space_id,
      member.role_title
    ]
  )

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.membership,
    aggregateId: membershipId,
    eventType: EVENT_TYPES.membershipCreated,
    payload: {
      membershipId,
      profileId: member.identity_profile_id,
      organizationId: space.organization_id,
      spaceId: space.space_id,
      source: 'assignment_sync'
    }
  })

  return membershipId
}

/**
 * When an assignment is removed, deactivate the team_member membership
 * ONLY if the member has no other active assignments to clients in the same org.
 */
const handleAssignmentRemoved = async (memberId: string, clientId: string): Promise<string | null> => {
  const [member] = await runGreenhousePostgresQuery<{ identity_profile_id: string | null }>(
    `SELECT identity_profile_id FROM greenhouse_core.members WHERE member_id = $1`,
    [memberId]
  )

  if (!member?.identity_profile_id) return null

  const [space] = await runGreenhousePostgresQuery<SpaceContext>(
    `SELECT space_id, organization_id
     FROM greenhouse_core.spaces
     WHERE client_id = $1 AND active = TRUE
     LIMIT 1`,
    [clientId]
  )

  if (!space?.organization_id) return null

  // Check if member still has OTHER active assignments to the same org
  const [otherAssignment] = await runGreenhousePostgresQuery<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt
     FROM greenhouse_core.client_team_assignments a
     JOIN greenhouse_core.spaces s ON s.client_id = a.client_id
     WHERE a.member_id = $1
       AND a.active = TRUE
       AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
       AND s.organization_id = $2
       AND a.client_id != $3`,
    [memberId, space.organization_id, clientId]
  )

  if (otherAssignment && otherAssignment.cnt > 0) {
    return null // Still assigned to same org via another client — keep membership
  }

  // Deactivate
  const [existing] = await runGreenhousePostgresQuery<{ membership_id: string }>(
    `UPDATE greenhouse_core.person_memberships
     SET active = FALSE, status = 'inactive', updated_at = CURRENT_TIMESTAMP
     WHERE profile_id = $1
       AND organization_id = $2
       AND membership_type = 'team_member'
       AND active = TRUE
     RETURNING membership_id`,
    [member.identity_profile_id, space.organization_id]
  )

  return existing?.membership_id ?? null
}

// ── Projection definition ──

export const assignmentMembershipSyncProjection: ProjectionDefinition = {
  name: 'assignment_membership_sync',
  description: 'Sync client_team_assignments to person_memberships via spaces bridge',
  domain: 'people',

  triggerEvents: [
    'assignment.created',
    'assignment.updated',
    'assignment.removed'
  ],

  extractScope: (payload) => {
    const memberId = payload.memberId as string | undefined

    if (!memberId) return null

    return { entityType: 'member', entityId: memberId }
  },

  refresh: async (_scope, payload) => {
    const memberId = payload.memberId as string | undefined
    const clientId = payload.clientId as string | undefined
    const eventType = payload.eventType as string | undefined

    if (!memberId || !clientId) return null

    if (eventType === 'assignment.removed') {
      const result = await handleAssignmentRemoved(memberId, clientId)

      return result
        ? `deactivated membership ${result} for ${memberId}`
        : `no membership change for ${memberId}`
    }

    const result = await syncAssignmentToMembership(memberId, clientId)

    return result
      ? `synced membership ${result} for ${memberId} → ${clientId}`
      : `no org bridge for ${clientId}`
  },

  maxRetries: 2
}

// ── Exported for backfill script ──

export { syncAssignmentToMembership }
