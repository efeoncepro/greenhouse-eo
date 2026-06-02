import 'server-only'

import { query } from '@/lib/db'

/**
 * Canonical resolver: identity profile → display name, by `profile_id`.
 *
 * SSOT for "name of a person given their canonical profile id". Centralizes the
 * column contract (`greenhouse_core.identity_profiles.profile_id` is the PK —
 * verified against PG + the canonical JOIN `ip.profile_id = m.identity_profile_id`
 * in `canonical-person.ts`) so consumers never hand-write the column name. This
 * closes the SQL-column-drift bug class (ISSUE-071 / TASK-893): a single
 * live-verified query instead of N bespoke ones across readers.
 *
 * Bulk by design (`= ANY`) so single-subject (self-service) and multi-subject
 * (HR workbench) callers share one path without N+1.
 */
export const resolveProfileDisplayNames = async (
  profileIds: readonly string[]
): Promise<Map<string, string>> => {
  const map = new Map<string, string>()

  const unique = [...new Set(profileIds.filter(Boolean))]

  if (unique.length === 0) return map

  const rows = await query<{ profile_id: string; full_name: string | null }>(
    `SELECT profile_id, full_name
     FROM greenhouse_core.identity_profiles
     WHERE profile_id = ANY($1::text[])`,
    [unique]
  )

  for (const row of rows) {
    const name = row.full_name?.trim()

    if (name) map.set(row.profile_id, name)
  }

  return map
}

/** Single-profile convenience over {@link resolveProfileDisplayNames}. */
export const resolveProfileDisplayName = async (profileId: string): Promise<string | null> => {
  const map = await resolveProfileDisplayNames([profileId])

  return map.get(profileId) ?? null
}
