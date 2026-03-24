import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('migrator')

// ── Helpers ─────────────────────────────────────────────────────────────

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null

  if (typeof v === 'string') { const t = v.trim();



return t || null }

  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object' && v && 'value' in v) return toStr((v as { value?: unknown }).value)

return String(v)
}

// ── Types ───────────────────────────────────────────────────────────────

interface UnlinkedUserRow extends Record<string, unknown> {
  user_id: string
  email: string
  full_name: string | null
  client_id: string
  tenant_type: string | null
  status: string | null
}

interface IdentityProfileRow extends Record<string, unknown> {
  profile_id: string
  canonical_email: string | null
}

interface SpaceRow extends Record<string, unknown> {
  client_id: string
  space_id: string
  organization_id: string
}

interface RoleAssignmentRow extends Record<string, unknown> {
  user_id: string
  role_code: string
}

// ── Main ────────────────────────────────────────────────────────────────

// ── Inline ID generators (avoid 'server-only' imports) ──────────────────

const normalizeToken = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const buildIdentityProfileId = (input: { sourceSystem: string; sourceObjectType: string; sourceObjectId: string }) =>
  `identity-${normalizeToken(input.sourceSystem)}-${normalizeToken(input.sourceObjectType)}-${normalizeToken(input.sourceObjectId)}`

const generateMembershipId = () => `mbr-${crypto.randomUUID()}`

const SEQUENCE_MAP: Record<string, string> = {
  'EO-MBR': 'greenhouse_core.seq_membership_public_id'
}

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  const nextPublicId = async (prefix: string): Promise<string> => {
    const seq = SEQUENCE_MAP[prefix]

    if (!seq) throw new Error(`No sequence for prefix ${prefix}`)
    const rows = await runGreenhousePostgresQuery<{ next_val: string }>(`SELECT nextval('${seq}') AS next_val`)


return `${prefix}-${String(Number(rows[0]?.next_val ?? 1)).padStart(4, '0')}`
  }

  try {
    console.log('Account 360 — Identity Profile Reconciliation\n')

    const summary = {
      matched: 0,
      created: 0,
      membershipsCreated: 0,
      skipped: 0
    }

    // ── Step 1: Find client_users without identity_profile_id ────────
    const unlinkedUsers = await runGreenhousePostgresQuery<UnlinkedUserRow>(`
      SELECT user_id, email, full_name, client_id, tenant_type, status
      FROM greenhouse_core.client_users
      WHERE identity_profile_id IS NULL
        AND active = TRUE
        AND email IS NOT NULL
      ORDER BY client_id, user_id
    `)

    console.log(`Found ${unlinkedUsers.length} client_users without identity_profile_id.\n`)

    if (unlinkedUsers.length === 0) {
      console.log('Nothing to reconcile. Done.')

return
    }

    // ── Step 2: Load all identity_profiles for email matching ────────
    const profiles = await runGreenhousePostgresQuery<IdentityProfileRow>(`
      SELECT profile_id, LOWER(TRIM(canonical_email)) AS canonical_email
      FROM greenhouse_core.identity_profiles
      WHERE canonical_email IS NOT NULL
    `)

    const profileByEmail = new Map<string, string>()

    for (const p of profiles) {
      if (p.canonical_email) profileByEmail.set(p.canonical_email, p.profile_id)
    }

    console.log(`Loaded ${profiles.length} identity_profiles for email matching.\n`)

    // ── Step 3: Reconcile each unlinked user ─────────────────────────
    const reconciledUsers: Array<{
      userId: string
      profileId: string
      clientId: string
      tenantType: string | null
      status: string | null
    }> = []

    for (const cu of unlinkedUsers) {
      const email = toStr(cu.email)?.toLowerCase()

      if (!email) { summary.skipped++; continue }

      let profileId = profileByEmail.get(email)

      if (profileId) {
        // Match found — link existing profile
        await runGreenhousePostgresQuery(`
          UPDATE greenhouse_core.client_users
          SET identity_profile_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [profileId, cu.user_id])

        summary.matched++
      } else {
        // No match — create new identity_profile
        const isInternal = toStr(cu.tenant_type) === 'efeonce_internal'

        profileId = buildIdentityProfileId({
          sourceSystem: 'greenhouse_auth',
          sourceObjectType: 'client_user',
          sourceObjectId: cu.user_id
        })

        // INSERT identity_profile (trigger auto-assigns serial_number + public_id)
        await runGreenhousePostgresQuery(`
          INSERT INTO greenhouse_core.identity_profiles (
            profile_id, profile_type, canonical_email, full_name,
            status, active, default_auth_mode,
            primary_source_system, primary_source_object_type, primary_source_object_id,
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, TRUE, 'credentials',
                  'greenhouse_auth', 'client_user', $6,
                  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (profile_id) DO NOTHING
        `, [
          profileId,
          isInternal ? 'efeonce_internal' : 'client_contact',
          email,
          toStr(cu.full_name) || email,
          toStr(cu.status) || 'active',
          cu.user_id
        ])

        // Link user to profile
        await runGreenhousePostgresQuery(`
          UPDATE greenhouse_core.client_users
          SET identity_profile_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [profileId, cu.user_id])

        // Track for email dedup
        profileByEmail.set(email, profileId)
        summary.created++
      }

      reconciledUsers.push({
        userId: cu.user_id,
        profileId,
        clientId: cu.client_id,
        tenantType: toStr(cu.tenant_type),
        status: toStr(cu.status)
      })
    }

    console.log(`Reconciled: ${summary.matched} matched, ${summary.created} created, ${summary.skipped} skipped.\n`)

    // ── Step 4: Create person_memberships for reconciled users ────────
    const spaces = await runGreenhousePostgresQuery<SpaceRow>(`
      SELECT client_id, space_id, organization_id
      FROM greenhouse_core.spaces
      WHERE active = TRUE AND client_id IS NOT NULL
    `)

    const spaceByClientId = new Map<string, { spaceId: string; organizationId: string }>()

    for (const s of spaces) {
      if (s.client_id) spaceByClientId.set(s.client_id, { spaceId: s.space_id, organizationId: s.organization_id })
    }

    // Load role assignments for role_label
    const roleAssignments = await runGreenhousePostgresQuery<RoleAssignmentRow>(`
      SELECT user_id, role_code
      FROM greenhouse_core.user_role_assignments
      WHERE active = TRUE
    `)

    const rolesByUserId = new Map<string, string[]>()

    for (const ra of roleAssignments) {
      const existing = rolesByUserId.get(ra.user_id) || []

      existing.push(ra.role_code)
      rolesByUserId.set(ra.user_id, existing)
    }

    // Load existing memberships to dedup
    const existingMbr = await runGreenhousePostgresQuery<{ profile_id: string; organization_id: string }>(`
      SELECT profile_id, organization_id
      FROM greenhouse_core.person_memberships
      WHERE active = TRUE
    `)

    const existingKeys = new Set<string>()

    for (const m of existingMbr) {
      existingKeys.add(`${m.profile_id}:${m.organization_id}`)
    }

    for (const cu of reconciledUsers) {
      const space = spaceByClientId.get(cu.clientId)

      if (!space) { continue }

      const dedupKey = `${cu.profileId}:${space.organizationId}`

      if (existingKeys.has(dedupKey)) continue
      existingKeys.add(dedupKey)

      const isInternal = cu.tenantType === 'efeonce_internal'
      const roles = rolesByUserId.get(cu.userId)
      const roleLabel = roles?.length ? roles[0] : null

      const membershipId = generateMembershipId()
      const membershipPublicId = await nextPublicId('EO-MBR')

      await runGreenhousePostgresQuery(`
        INSERT INTO greenhouse_core.person_memberships (
          membership_id, public_id, profile_id, organization_id, space_id,
          membership_type, role_label, is_primary, status, active,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (membership_id) DO NOTHING
      `, [
        membershipId,
        membershipPublicId,
        cu.profileId,
        space.organizationId,
        space.spaceId,
        isInternal ? 'team_member' : 'client_contact',
        roleLabel,
        true,
        cu.status || 'active',
        true
      ])

      summary.membershipsCreated++
    }

    console.log(`Created ${summary.membershipsCreated} memberships from reconciled users.\n`)

    console.log('── Summary ──')
    console.log(`  Matched to existing profile: ${summary.matched}`)
    console.log(`  Created new profile:         ${summary.created}`)
    console.log(`  Memberships created:         ${summary.membershipsCreated}`)
    console.log(`  Skipped (no email):          ${summary.skipped}`)
    console.log('\nDone.')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('Reconciliation failed:', error)
  process.exitCode = 1
})
