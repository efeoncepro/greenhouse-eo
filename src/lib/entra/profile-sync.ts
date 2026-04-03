import 'server-only'

import { query } from '@/lib/db'

import type { EntraUserProfile } from './graph-client'

// ── Types ──

interface SyncResult {
  processed: number
  usersUpdated: number
  profilesUpdated: number
  membersUpdated: number
  skipped: number
  errors: string[]
}

interface GhUser {
  [key: string]: unknown
  user_id: string
  full_name: string | null
  email: string | null
  microsoft_oid: string | null
  microsoft_email: string | null
  identity_profile_id: string | null
  member_id: string | null
  active: boolean
}

// ── Sync Engine ──

export const syncEntraProfiles = async (
  entraUsers: EntraUserProfile[]
): Promise<SyncResult> => {
  const result: SyncResult = {
    processed: 0,
    usersUpdated: 0,
    profilesUpdated: 0,
    membersUpdated: 0,
    skipped: 0,
    errors: []
  }

  // Load all Greenhouse users with OID
  const ghUsers = await query<GhUser>(
    `SELECT user_id, full_name, email, microsoft_oid, microsoft_email,
            identity_profile_id, member_id, active
     FROM greenhouse_core.client_users
     WHERE microsoft_oid IS NOT NULL`
  )

  // Build OID → GH user map
  const ghByOid = new Map<string, GhUser>()

  for (const u of ghUsers) {
    if (u.microsoft_oid) ghByOid.set(u.microsoft_oid, u)
  }

  for (const entra of entraUsers) {
    if (!entra.id || !entra.mail) continue

    result.processed++
    const gh = ghByOid.get(entra.id)

    if (!gh) {
      result.skipped++
      continue
    }

    try {
      // 1. Update client_users
      const userChanges = buildUserChanges(gh, entra)

      if (userChanges.sets.length > 0) {
        userChanges.values.push(gh.user_id)

        await query(
          `UPDATE greenhouse_core.client_users
           SET ${userChanges.sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $${userChanges.values.length}`,
          userChanges.values
        )
        result.usersUpdated++
      }

      // 2. Update identity_profiles.job_title
      if (gh.identity_profile_id && entra.jobTitle) {
        const ipResult = await query<{ [key: string]: unknown }>(
          `UPDATE greenhouse_core.identity_profiles
           SET job_title = $1, updated_at = CURRENT_TIMESTAMP
           WHERE profile_id = $2 AND (job_title IS DISTINCT FROM $1)
           RETURNING profile_id`,
          [entra.jobTitle, gh.identity_profile_id]
        )

        if (ipResult.length > 0) result.profilesUpdated++
      }

      // 3. Update members
      if (gh.member_id) {
        const memberChanges = buildMemberChanges(entra)

        if (memberChanges.sets.length > 0) {
          memberChanges.values.push(gh.member_id)

          const mResult = await query<{ [key: string]: unknown }>(
            `UPDATE greenhouse_core.members
             SET ${memberChanges.sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE member_id = $${memberChanges.values.length}
               AND (${memberChanges.conditions.join(' OR ')})
             RETURNING member_id`,
            memberChanges.values
          )

          if (mResult.length > 0) result.membersUpdated++
        }
      }
    } catch (error) {
      const msg = `${gh.full_name || gh.email}: ${error instanceof Error ? error.message : 'unknown'}`

      result.errors.push(msg)
      console.error('[entra-profile-sync] Error syncing user:', msg)
    }
  }

  return result
}

// ── Change Builders ──

function buildUserChanges(gh: GhUser, entra: EntraUserProfile) {
  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  // Sync active status
  if (entra.accountEnabled === false && gh.active === true) {
    sets.push(`active = $${idx}`, `status = $${idx + 1}`, `deactivated_at = CURRENT_TIMESTAMP`)
    values.push(false, 'deactivated')
    idx += 2
  } else if (entra.accountEnabled === true && gh.active === false) {
    sets.push(`active = $${idx}`, `status = $${idx + 1}`)
    values.push(true, 'active')
    idx += 2
  }

  // Sync display name
  const entraName = cleanDisplayName(entra.displayName)

  if (entraName && entraName !== gh.full_name) {
    sets.push(`full_name = $${idx}`)
    values.push(entraName)
    idx++
  }

  return { sets, values }
}

function buildMemberChanges(entra: EntraUserProfile) {
  const sets: string[] = []
  const values: unknown[] = []
  const conditions: string[] = []
  let idx = 1

  if (entra.jobTitle) {
    sets.push(`role_title = $${idx}`)
    conditions.push(`role_title IS DISTINCT FROM $${idx}`)
    values.push(entra.jobTitle)
    idx++
  }

  if (entra.country) {
    sets.push(`location_country = $${idx}`)
    conditions.push(`location_country IS DISTINCT FROM $${idx}`)
    values.push(entra.country)
    idx++
  }

  const city = entra.city || entra.state || null

  if (city) {
    sets.push(`location_city = $${idx}`)
    conditions.push(`location_city IS DISTINCT FROM $${idx}`)
    values.push(city)
    idx++
  }

  const phone = entra.mobilePhone || entra.businessPhones?.[0] || null

  if (phone) {
    sets.push(`phone = $${idx}`)
    conditions.push(`phone IS DISTINCT FROM $${idx}`)
    values.push(phone)
    idx++
  }

  return { sets, values, conditions }
}

function cleanDisplayName(name: string | null): string | null {
  if (!name) return null

  // Remove " | Efeonce" suffix from Entra display names
  return name.replace(/\s*\|\s*Efeonce$/i, '').trim() || null
}
