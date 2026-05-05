import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-784 — Resolve identity_profile_id from member_id (Person 360 root).
 *
 * Members puede no tener `identity_profile_id` poblado en algunos legacy
 * rows; en ese caso devolvemos null y el caller decide (typically: error
 * 409 "Member identity not linked").
 */
export const resolveProfileIdForMember = async (memberId: string): Promise<string | null> => {
  const rows = await query<{ identity_profile_id: string | null; [key: string]: unknown }>(
    `SELECT identity_profile_id FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
    [memberId]
  )

  return rows[0]?.identity_profile_id ?? null
}
