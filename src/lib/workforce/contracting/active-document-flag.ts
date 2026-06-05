import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-1022 — Cheap EXISTS check used by the NextAuth JWT callback to drive the
 * dynamic `/my/offers` + `/my/contracts` menu visibility (mirror of TASK-796
 * hasActiveContractorEngagement). Kept in its OWN tiny module so the auth bundle
 * doesn't pull the contracting readers/commands graph.
 *
 * Excludes the brand-new internal-only statuses (draft / intake_pending) — there is
 * nothing for the collaborator to see until the case has moved past setup.
 *
 * Fail-safe: any error → false (the menu items simply don't show; auth must NEVER
 * break on this resolution).
 */
export const hasWorkforceContractingDocumentForProfile = async (
  identityProfileId: string | null
): Promise<boolean> => {
  if (!identityProfileId) return false

  try {
    const rows = await query<{ has_document: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM greenhouse_hr.workforce_contracting_cases
         WHERE subject_identity_profile_id = $1
           AND status NOT IN ('draft', 'intake_pending')
       ) AS has_document`,
      [identityProfileId]
    )

    return rows[0]?.has_document === true
  } catch {
    return false
  }
}
