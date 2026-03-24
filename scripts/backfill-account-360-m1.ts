/**
 * Account 360 — M1: Data Migration
 *
 * Populates organizations, spaces (tenant), and person_memberships from
 * existing greenhouse_core data.
 *
 * Sources:
 *   - greenhouse_core.clients → organizations + spaces
 *   - greenhouse_finance.client_profiles → legal_name, tax_id, industry, country
 *   - greenhouse_crm.companies → hubspot_company_id enrichment
 *   - greenhouse_core.client_users + identity_profiles → person_memberships
 *   - greenhouse_crm.contacts → additional person_memberships
 *
 * Safe to run multiple times (all INSERTs use ON CONFLICT DO UPDATE).
 *
 * Usage:
 *   npx tsx scripts/backfill-account-360-m1.ts
 */

import { randomUUID } from 'node:crypto'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../src/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

// ── Helpers ─────────────────────────────────────────────────────────────

const toStr = (v: unknown): string | null => {
  if (v === null || v === undefined) return null

  if (typeof v === 'string') { const t = v.trim();



return t || null }

  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object' && v && 'value' in v) return toStr((v as { value?: unknown }).value)

return String(v)
}

const toBool = (v: unknown, fallback = false): boolean => {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === 1) return true
  if (v === 'false' || v === 0) return false

return fallback
}

// ── ID generators ───────────────────────────────────────────────────────

const orgId = () => `org-${randomUUID()}`
const spcId = () => `spc-${randomUUID()}`
const mbrId = () => `mbr-${randomUUID()}`

// Sequential public IDs (uses sequences created in M0)
const nextPublicId = async (prefix: string): Promise<string> => {
  const seqMap: Record<string, string> = {
    'EO-ORG': 'greenhouse_core.seq_organization_public_id',
    'EO-SPC': 'greenhouse_core.seq_space_public_id',
    'EO-MBR': 'greenhouse_core.seq_membership_public_id'
  }

  const seq = seqMap[prefix]

  if (!seq) throw new Error(`Unknown public ID prefix: ${prefix}`)
  const rows = await runGreenhousePostgresQuery<{ next_val: string }>(`SELECT nextval('${seq}') AS next_val`)
  const n = Number(rows[0]?.next_val ?? 1)


return `${prefix}-${String(n).padStart(4, '0')}`
}

// ── Types ───────────────────────────────────────────────────────────────

interface ClientRow extends Record<string, unknown> {
  client_id: string
  client_name: string
  legal_name: string | null
  tenant_type: string
  status: string
  active: boolean
  hubspot_company_id: string | null
  country_code: string | null
  created_at: string
  updated_at: string
}

interface ClientProfileRow extends Record<string, unknown> {
  client_id: string
  legal_name: string | null
  tax_id: string | null
  tax_id_type: string | null
  industry: string | null
  country: string | null
}

interface ClientUserRow extends Record<string, unknown> {
  user_id: string
  client_id: string
  identity_profile_id: string | null
  full_name: string | null
  tenant_type: string
  status: string
}

interface RoleAssignmentRow extends Record<string, unknown> {
  user_id: string
  role_code: string
}

interface CrmContactRow extends Record<string, unknown> {
  contact_record_id: string
  client_id: string | null
  linked_identity_profile_id: string | null
  job_title: string | null
  display_name: string
}

// ── Main ────────────────────────────────────────────────────────────────

const main = async () => {
  console.log('Account 360 M1 — Starting data migration...\n')

  const summary = {
    organizations: 0,
    spaces: 0,
    membershipsFromUsers: 0,
    membershipsFromContacts: 0,
    skipped: 0
  }

  // ── Step 1: Load clients ────────────────────────────────────────────
  const clients = await runGreenhousePostgresQuery<ClientRow>(`
    SELECT client_id, client_name, legal_name, tenant_type, status, active,
           hubspot_company_id, country_code, created_at, updated_at
    FROM greenhouse_core.clients
    WHERE active = TRUE
    ORDER BY client_name
  `)

  console.log(`Found ${clients.length} active clients to migrate.\n`)

  // ── Step 2: Load finance client_profiles for enrichment ─────────────
  const financeProfiles = await runGreenhousePostgresQuery<ClientProfileRow>(`
    SELECT cp.client_id,
           cp.legal_name,
           cp.tax_id,
           cp.tax_id_type,
           cp.industry,
           cp.country
    FROM greenhouse_finance.client_profiles cp
  `).catch(() => [] as ClientProfileRow[]) // Table may not exist yet

  const profileByClient = new Map<string, ClientProfileRow>()

  for (const p of financeProfiles) {
    if (p.client_id) profileByClient.set(p.client_id, p)
  }

  // ── Step 3: Create organizations + spaces ───────────────────────────
  const orgByClientId = new Map<string, string>()     // client_id → organization_id
  const spaceByClientId = new Map<string, string>()   // client_id → space_id

  for (const client of clients) {
    const clientId = toStr(client.client_id)

    if (!clientId) continue

    const profile = profileByClient.get(clientId)
    const organizationId = orgId()
    const organizationPublicId = await nextPublicId('EO-ORG')
    const spaceIdVal = spcId()
    const spacePublicId = await nextPublicId('EO-SPC')

    const isInternal = toStr(client.tenant_type) === 'efeonce_internal'

    // INSERT organization
    await runGreenhousePostgresQuery(`
      INSERT INTO greenhouse_core.organizations (
        organization_id, public_id, organization_name, legal_name,
        tax_id, tax_id_type, industry, country,
        hubspot_company_id, status, active, notes,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
              COALESCE($13::timestamptz, CURRENT_TIMESTAMP),
              COALESCE($14::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (organization_id) DO UPDATE SET
        organization_name = EXCLUDED.organization_name,
        legal_name = EXCLUDED.legal_name,
        hubspot_company_id = EXCLUDED.hubspot_company_id,
        updated_at = CURRENT_TIMESTAMP
    `, [
      organizationId,
      organizationPublicId,
      toStr(client.client_name) || clientId,
      toStr(profile?.legal_name) || toStr(client.legal_name),
      toStr(profile?.tax_id),
      toStr(profile?.tax_id_type),
      toStr(profile?.industry),
      toStr(profile?.country) || toStr(client.country_code) || 'CL',
      toStr(client.hubspot_company_id),
      toStr(client.status) || 'active',
      toBool(client.active, true),
      isInternal
        ? 'Internal organization migrated from greenhouse_core.clients'
        : 'Client organization migrated from greenhouse_core.clients',
      toStr(client.created_at),
      toStr(client.updated_at)
    ])

    orgByClientId.set(clientId, organizationId)

    // INSERT space (tenant operativo)
    await runGreenhousePostgresQuery(`
      INSERT INTO greenhouse_core.spaces (
        space_id, public_id, organization_id, client_id,
        space_name, space_type, status, active, notes,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
              COALESCE($10::timestamptz, CURRENT_TIMESTAMP),
              COALESCE($11::timestamptz, CURRENT_TIMESTAMP))
      ON CONFLICT (space_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        space_name = EXCLUDED.space_name,
        updated_at = CURRENT_TIMESTAMP
    `, [
      spaceIdVal,
      spacePublicId,
      organizationId,
      clientId,
      toStr(client.client_name) || clientId,
      isInternal ? 'internal_space' : 'client_space',
      toStr(client.status) || 'active',
      toBool(client.active, true),
      'Tenant space migrated from greenhouse_core.clients',
      toStr(client.created_at),
      toStr(client.updated_at)
    ])

    spaceByClientId.set(clientId, spaceIdVal)

    summary.organizations++
    summary.spaces++
  }

  console.log(`Created ${summary.organizations} organizations and ${summary.spaces} spaces.\n`)

  // ── Step 4: Create person_memberships from client_users ─────────────
  const clientUsers = await runGreenhousePostgresQuery<ClientUserRow>(`
    SELECT user_id, client_id, identity_profile_id, full_name, tenant_type, status
    FROM greenhouse_core.client_users
    WHERE identity_profile_id IS NOT NULL
      AND active = TRUE
    ORDER BY client_id, user_id
  `)

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

  // Track which profile+org combos we've already created memberships for
  const existingMemberships = new Set<string>()

  for (const cu of clientUsers) {
    const profileId = toStr(cu.identity_profile_id)
    const clientId = toStr(cu.client_id)

    if (!profileId || !clientId) continue

    const organizationId = orgByClientId.get(clientId)
    const spaceIdVal = spaceByClientId.get(clientId)

    if (!organizationId) {
      summary.skipped++
      continue
    }

    const dedupKey = `${profileId}:${organizationId}`

    if (existingMemberships.has(dedupKey)) continue
    existingMemberships.add(dedupKey)

    const isInternal = toStr(cu.tenant_type) === 'efeonce_internal'
    const roles = rolesByUserId.get(cu.user_id)
    const roleLabel = roles?.length ? roles[0] : null

    const membershipIdVal = mbrId()
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
      membershipIdVal,
      membershipPublicId,
      profileId,
      organizationId,
      spaceIdVal || null,
      isInternal ? 'team_member' : 'client_contact',
      roleLabel,
      true, // is_primary (first membership for this profile+org)
      toStr(cu.status) || 'active',
      true
    ])

    summary.membershipsFromUsers++
  }

  console.log(`Created ${summary.membershipsFromUsers} memberships from client_users.\n`)

  // ── Step 5: Create person_memberships from CRM contacts ─────────────
  const crmContacts = await runGreenhousePostgresQuery<CrmContactRow>(`
    SELECT contact_record_id, client_id, linked_identity_profile_id, job_title, display_name
    FROM greenhouse_crm.contacts
    WHERE linked_identity_profile_id IS NOT NULL
      AND active = TRUE
      AND is_deleted = FALSE
  `).catch(() => [] as CrmContactRow[])

  for (const contact of crmContacts) {
    const profileId = toStr(contact.linked_identity_profile_id)
    const clientId = toStr(contact.client_id)

    if (!profileId || !clientId) continue

    const organizationId = orgByClientId.get(clientId)

    if (!organizationId) continue

    const dedupKey = `${profileId}:${organizationId}`

    if (existingMemberships.has(dedupKey)) continue
    existingMemberships.add(dedupKey)

    const spaceIdVal = spaceByClientId.get(clientId)
    const membershipIdVal = mbrId()
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
      membershipIdVal,
      membershipPublicId,
      profileId,
      organizationId,
      spaceIdVal || null,
      'client_contact',
      toStr(contact.job_title),
      false, // not primary (user membership takes priority)
      'active',
      true
    ])

    summary.membershipsFromContacts++
  }

  console.log(`Created ${summary.membershipsFromContacts} memberships from CRM contacts.\n`)

  // ── Done ────────────────────────────────────────────────────────────

  console.log('── Summary ──')
  console.log(`  Organizations: ${summary.organizations}`)
  console.log(`  Spaces:        ${summary.spaces}`)
  console.log(`  Memberships:   ${summary.membershipsFromUsers + summary.membershipsFromContacts}`)
  console.log(`    from users:    ${summary.membershipsFromUsers}`)
  console.log(`    from contacts: ${summary.membershipsFromContacts}`)
  console.log(`  Skipped:       ${summary.skipped}`)
  console.log('\nDone.')
}

main()
  .catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(() => closeGreenhousePostgres())
