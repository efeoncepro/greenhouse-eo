import 'server-only'

import { query } from '@/lib/db'
import { uploadGreenhouseMediaAsset } from '@/lib/storage/greenhouse-media'
import { setUserAvatarAssetPath } from '@/lib/admin/media-assets'

import { buildEfeonceEmailAliasCandidates } from '@/lib/tenant/internal-email-aliases'

import type { EntraUserProfile } from './graph-client'
import { fetchEntraUserPhoto } from './graph-client'

// ── Types ──

interface SyncResult {
  processed: number
  usersUpdated: number
  profilesUpdated: number
  profilesCreated: number
  profilesLinked: number
  membersUpdated: number
  avatarsSynced: number
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
    profilesCreated: 0,
    profilesLinked: 0,
    membersUpdated: 0,
    avatarsSynced: 0,
    skipped: 0,
    errors: []
  }

  // Load all active internal Greenhouse users (not just those with OID)
  const ghUsers = await query<GhUser>(
    `SELECT user_id, full_name, email, microsoft_oid, microsoft_email,
            identity_profile_id, member_id, active
     FROM greenhouse_core.client_users
     WHERE active = TRUE AND tenant_type = 'efeonce_internal'`
  )

  console.log(`[entra-profile-sync] GH users loaded: ${ghUsers.length}`)

  // Build OID → GH user map + email → GH user map (OID takes priority)
  const ghByOid = new Map<string, GhUser>()
  const ghByEmail = new Map<string, GhUser>()

  for (const u of ghUsers) {
    if (u.microsoft_oid) ghByOid.set(u.microsoft_oid, u)
    if (u.email) ghByEmail.set(u.email.toLowerCase(), u)
  }

  console.log(`[entra-profile-sync] GH map: ${ghByOid.size} by OID, ${ghByEmail.size} by email`)

  for (const entra of entraUsers) {
    if (!entra.id || !entra.mail) continue

    result.processed++

    // Match by OID first, then by email (direct or alias)
    let gh = ghByOid.get(entra.id) || ghByEmail.get(entra.mail.toLowerCase()) || null

    if (!gh) {
      // Try alias matching (e.g. julio.reyes@efeonce.org → jreyes@efeoncepro.com)
      const aliases = buildEfeonceEmailAliasCandidates({
        email: entra.mail,
        fullName: entra.displayName
      })

      for (const alias of aliases) {
        const match = ghByEmail.get(alias.toLowerCase())

        if (match) { gh = match; break }
      }
    }

    if (!gh) {
      console.log(`[entra-profile-sync] SKIP: ${entra.mail} (${entra.displayName}) — no GH match`)
      result.skipped++
      continue
    }

    try {
      // 0. Backfill microsoft_oid if matched by email (so future syncs match by OID)
      if (!gh.microsoft_oid && entra.id) {
        await query(
          `UPDATE greenhouse_core.client_users
           SET microsoft_oid = $1, microsoft_email = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3 AND microsoft_oid IS NULL`,
          [entra.id, entra.mail, gh.user_id]
        )
        gh.microsoft_oid = entra.id
      }

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

      // 2. Ensure identity_profile link
      if (!gh.identity_profile_id && entra.mail) {
        const linked = await ensureIdentityProfileLink(gh, entra)

        if (linked) {
          gh.identity_profile_id = linked.profileId

          if (linked.created) result.profilesCreated++
          result.profilesLinked++
        }
      }

      // 3. Update identity_profiles (job_title, full_name, canonical_email)
      if (gh.identity_profile_id) {
        const ipSets: string[] = []
        const ipVals: unknown[] = []
        const ipConds: string[] = []
        let ipIdx = 1

        if (entra.jobTitle) {
          ipSets.push(`job_title = $${ipIdx}`)
          ipConds.push(`job_title IS DISTINCT FROM $${ipIdx}`)
          ipVals.push(entra.jobTitle)
          ipIdx++
        }

        const entraName = cleanDisplayName(entra.displayName)

        if (entraName) {
          ipSets.push(`full_name = $${ipIdx}`)
          ipConds.push(`full_name IS DISTINCT FROM $${ipIdx}`)
          ipVals.push(entraName)
          ipIdx++
        }

        if (entra.mail) {
          ipSets.push(`canonical_email = $${ipIdx}`)
          ipConds.push(`canonical_email IS DISTINCT FROM $${ipIdx}`)
          ipVals.push(entra.mail.toLowerCase())
          ipIdx++
        }

        if (ipSets.length > 0) {
          ipVals.push(gh.identity_profile_id)

          const ipResult = await query<{ [key: string]: unknown }>(
            `UPDATE greenhouse_core.identity_profiles
             SET ${ipSets.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE profile_id = $${ipIdx} AND (${ipConds.join(' OR ')})
             RETURNING profile_id`,
            ipVals
          )

          if (ipResult.length > 0) result.profilesUpdated++
        }
      }

      // 4. Update members
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

      // 5. Sync avatar from Microsoft Graph
      try {
        const photo = await fetchEntraUserPhoto(entra.id)

        if (photo) {
          const assetPath = await uploadGreenhouseMediaAsset({
            entityFolder: 'users',
            entityId: gh.user_id,
            kind: 'avatar',
            fileName: `entra-${entra.id}.jpg`,
            contentType: photo.contentType,
            bytes: photo.buffer.buffer.slice(
              photo.buffer.byteOffset,
              photo.buffer.byteOffset + photo.buffer.byteLength
            ) as ArrayBuffer
          })

          // Update PostgreSQL
          await query(
            `UPDATE greenhouse_core.client_users
             SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND (avatar_url IS DISTINCT FROM $1)`,
            [assetPath, gh.user_id]
          )

          // Update BigQuery (fire-and-forget, non-blocking)
          setUserAvatarAssetPath({ userId: gh.user_id, assetPath }).catch(err => {
            console.warn('[entra-profile-sync] BQ avatar update failed:', gh.user_id, err)
          })

          result.avatarsSynced++
        }
      } catch (avatarErr) {
        // Avatar failures are non-fatal — log and continue
        console.warn('[entra-profile-sync] Avatar sync failed for', gh.user_id, avatarErr)
      }
    } catch (error) {
      const msg = `${gh.full_name || gh.email}: ${error instanceof Error ? error.message : 'unknown'}`

      result.errors.push(msg)
      console.error('[entra-profile-sync] Error syncing user:', msg)
    }
  }

  return result
}

// ── Identity Profile Ensure ──

const normalizeToken = (s: string) => s.replace(/[^a-z0-9-]/gi, '-').toLowerCase()

const buildIdentityProfileId = (source: { sourceSystem: string; sourceObjectType: string; sourceObjectId: string }) =>
  `identity-${normalizeToken(source.sourceSystem)}-${normalizeToken(source.sourceObjectType)}-${normalizeToken(source.sourceObjectId)}`

async function ensureIdentityProfileLink(
  gh: GhUser,
  entra: EntraUserProfile
): Promise<{ profileId: string; created: boolean } | null> {
  const email = entra.mail?.toLowerCase().trim()

  if (!email) return null

  // Try to find existing identity_profile by canonical_email
  const existing = await query<{ profile_id: string }>(
    `SELECT profile_id FROM greenhouse_core.identity_profiles
     WHERE LOWER(canonical_email) = $1 AND active = TRUE
     LIMIT 1`,
    [email]
  )

  let profileId: string
  let created = false

  if (existing.length > 0) {
    profileId = existing[0].profile_id
  } else {
    // Create a new identity_profile from Entra data
    profileId = buildIdentityProfileId({
      sourceSystem: 'greenhouse_auth',
      sourceObjectType: 'client_user',
      sourceObjectId: gh.user_id
    })

    const displayName = cleanDisplayName(entra.displayName) || email

    await query(
      `INSERT INTO greenhouse_core.identity_profiles (
        profile_id, profile_type, canonical_email, full_name, job_title,
        status, active, default_auth_mode,
        primary_source_system, primary_source_object_type, primary_source_object_id,
        created_at, updated_at
      )
      VALUES ($1, 'efeonce_internal', $2, $3, $4, 'active', TRUE, 'sso',
              'greenhouse_auth', 'client_user', $5,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (profile_id) DO NOTHING`,
      [profileId, email, displayName, entra.jobTitle, gh.user_id]
    )

    created = true
  }

  // Link client_users → identity_profile
  await query(
    `UPDATE greenhouse_core.client_users
     SET identity_profile_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2 AND identity_profile_id IS NULL`,
    [profileId, gh.user_id]
  )

  return { profileId, created }
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
