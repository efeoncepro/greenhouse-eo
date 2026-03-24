/**
 * backfill-orphan-member-profiles.ts
 *
 * Creates identity_profiles for members that have no identity_profile_id.
 * For each orphan member:
 *   1. Try to match by email to an existing identity_profile
 *   2. If matched → link member to existing profile
 *   3. If no match → create new identity_profile and link
 *
 * The identity_profiles trigger auto-assigns serial_number + public_id (EO-ID).
 *
 * Usage: pnpm exec tsx scripts/backfill-orphan-member-profiles.ts
 *   --dry-run    Print what would be done without making changes
 */

import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('migrator')

const normalizeToken = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const buildProfileId = (memberId: string) =>
  `identity-${normalizeToken('greenhouse_team')}-${normalizeToken('member')}-${normalizeToken(memberId)}`

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    console.log(`Backfill Orphan Member Profiles${dryRun ? ' (DRY RUN)' : ''}\n`)

    // Step 1: Find orphan members
    const orphans = await runGreenhousePostgresQuery<{
      member_id: string
      display_name: string
      primary_email: string | null
      role_title: string | null
      active: boolean
    }>(`
      SELECT member_id, display_name, primary_email, role_title, active
      FROM greenhouse_core.members
      WHERE identity_profile_id IS NULL
      ORDER BY active DESC, display_name
    `)

    console.log(`Found ${orphans.length} members without identity_profile_id.\n`)

    if (orphans.length === 0) {
      console.log('Nothing to backfill. Done.')

return
    }

    // Step 2: Load existing profiles for email matching
    const existingProfiles = await runGreenhousePostgresQuery<{
      profile_id: string
      canonical_email: string | null
    }>(`
      SELECT profile_id, LOWER(TRIM(canonical_email)) AS canonical_email
      FROM greenhouse_core.identity_profiles
      WHERE canonical_email IS NOT NULL
    `)

    const profileByEmail = new Map<string, string>()

    for (const p of existingProfiles) {
      if (p.canonical_email) profileByEmail.set(p.canonical_email, p.profile_id)
    }

    console.log(`Loaded ${existingProfiles.length} profiles for email matching.\n`)

    // Step 3: Reconcile each orphan
    const summary = { matched: 0, created: 0, skipped: 0 }

    for (const m of orphans) {
      const email = m.primary_email?.trim().toLowerCase() || null
      const existingProfileId = email ? profileByEmail.get(email) : null

      if (existingProfileId) {
        // Match found — link member to existing profile
        console.log(`  MATCH  ${m.display_name} <${email}> → ${existingProfileId}`)

        if (!dryRun) {
          await runGreenhousePostgresQuery(`
            UPDATE greenhouse_core.members
            SET identity_profile_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE member_id = $2
          `, [existingProfileId, m.member_id])
        }

        summary.matched++
      } else if (email) {
        // No match — create new profile
        const profileId = buildProfileId(m.member_id)

        console.log(`  CREATE ${m.display_name} <${email}> → ${profileId}`)

        if (!dryRun) {
          // INSERT identity_profile (trigger auto-assigns serial_number + public_id)
          await runGreenhousePostgresQuery(`
            INSERT INTO greenhouse_core.identity_profiles (
              profile_id, profile_type, canonical_email, full_name,
              job_title, status, active,
              primary_source_system, primary_source_object_type, primary_source_object_id,
              created_at, updated_at
            )
            VALUES ($1, 'internal', $2, $3, $4, 'active', TRUE,
                    'greenhouse_team', 'member', $5,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (profile_id) DO NOTHING
          `, [profileId, email, m.display_name, m.role_title, m.member_id])

          // Link member to new profile
          await runGreenhousePostgresQuery(`
            UPDATE greenhouse_core.members
            SET identity_profile_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE member_id = $2
          `, [profileId, m.member_id])

          // Also create source link
          const linkId = `link-${normalizeToken('greenhouse_team')}-member-${normalizeToken(m.member_id)}`

          await runGreenhousePostgresQuery(`
            INSERT INTO greenhouse_core.identity_profile_source_links (
              link_id, profile_id, source_system, source_object_type, source_object_id,
              source_email, source_display_name, is_primary, is_login_identity, active,
              created_at, updated_at
            )
            VALUES ($1, $2, 'greenhouse_team', 'member', $3, $4, $5, TRUE, FALSE, TRUE,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (profile_id, source_system, source_object_type, source_object_id) DO NOTHING
          `, [linkId, profileId, m.member_id, email, m.display_name])

          // Track for dedup within this run
          profileByEmail.set(email, profileId)
        }

        summary.created++
      } else {
        // No email — cannot reconcile
        console.log(`  SKIP   ${m.display_name} (no email)`)
        summary.skipped++
      }
    }

    console.log(`\n--- Summary ---`)
    console.log(`  Matched to existing profile: ${summary.matched}`)
    console.log(`  New profiles created:        ${summary.created}`)
    console.log(`  Skipped (no email):          ${summary.skipped}`)

    if (dryRun) {
      console.log(`\n  (DRY RUN — no changes were made)`)
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('Backfill failed:', error)
  process.exitCode = 1
})
