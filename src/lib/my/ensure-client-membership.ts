import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Ensures a client user has a person_membership linking them to their organization.
 * Called lazily on login — non-blocking (errors are silent).
 */
export const ensureClientMembership = async (params: {
  userId: string
  identityProfileId: string | null | undefined
  clientId: string
}): Promise<void> => {
  if (!params.identityProfileId || !params.clientId) return

  try {
    // Check if membership already exists
    const existing = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_core.person_memberships pm
       JOIN greenhouse_core.spaces s ON s.organization_id = pm.organization_id
       WHERE pm.profile_id = $1
         AND s.client_id = $2
         AND pm.active = TRUE
         AND s.active = TRUE`,
      [params.identityProfileId, params.clientId]
    )

    if (Number(existing[0]?.count ?? 0) > 0) return

    // Resolve organization via space
    const spaces = await runGreenhousePostgresQuery<{ organization_id: string; space_id: string } & Record<string, unknown>>(
      `SELECT organization_id, space_id
       FROM greenhouse_core.spaces
       WHERE client_id = $1 AND active = TRUE AND organization_id IS NOT NULL
       LIMIT 1`,
      [params.clientId]
    )

    if (spaces.length === 0) return

    const { organization_id, space_id } = spaces[0]

    // Create membership
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.person_memberships (
        membership_id, profile_id, organization_id, space_id,
        membership_type, role_label, is_primary,
        status, active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        'client_user', NULL, FALSE,
        'active', TRUE, NOW(), NOW()
      ) ON CONFLICT (membership_id) DO NOTHING`,
      [`pm-cu-${params.userId}`, params.identityProfileId, organization_id, space_id]
    )
  } catch {
    // Non-blocking — membership will be created next login
  }
}
