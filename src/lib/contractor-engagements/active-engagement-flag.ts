import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-796 — Cheap EXISTS check used by the NextAuth JWT callback to drive the
 * dynamic `/my/contractor` menu visibility (mirror of supervisorAccess). Kept in
 * its OWN tiny module (not the projection) so the auth bundle doesn't pull the
 * full self-service projection graph (payment-profile reader, etc.).
 *
 * Fail-safe: any error → false (the menu item simply doesn't show; auth must
 * NEVER break on this resolution).
 */
export const hasActiveContractorEngagementForProfile = async (
  identityProfileId: string | null
): Promise<boolean> => {
  if (!identityProfileId) return false

  try {
    const rows = await query<{ has_active: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM greenhouse_hr.contractor_engagements
         WHERE profile_id = $1 AND status NOT IN ('ended', 'cancelled')
       ) AS has_active`,
      [identityProfileId]
    )

    return rows[0]?.has_active === true
  } catch {
    return false
  }
}
