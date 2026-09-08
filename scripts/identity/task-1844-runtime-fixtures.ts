import { resolve } from 'node:path'
import { readFileSync, writeFileSync, existsSync, renameSync, chmodSync } from 'node:fs'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { query, withTransaction, closeGreenhousePostgres } from '../../src/lib/db'
import { upsertCanonicalOrganization } from '../../src/lib/account-360/organization-identity'
import { nextPublicId } from '../../src/lib/account-360/id-generation'
import { allocateSpaceNumericCode } from '../../src/lib/services/allocate-space-numeric-code'
import { saveUserEntitlementOverrides } from '../../src/lib/admin/entitlements-governance'
import { withInternalAuthoritySnapshot } from '../../src/lib/identity/internal-access/snapshot'
import { readInternalTargetAuthority } from '../../src/lib/identity/internal-access/target-authority'

// Dedicated TASK-1844 operator fixture. No external grants, business modules, contacts, jobs or OAuth clients.
const runId = 'task-1844-runtime-20260908-a'
const profileId = 'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes'
const userId = 'user-efeonce-admin-julio-reyes'
const expiresAt = '2026-09-09T00:00:00Z'
const manifestPath = resolve(process.cwd(), '.auth/task1844-runtime-fixtures.json')
const labels = ['A', 'B', 'C'] as const

type Label = (typeof labels)[number]
type Target = { label: Label; organizationId: string; clientId: string; spaceId: string; note: string }
type Manifest = {
  runId: string
  owner: string
  profileId: string
  expiresAt: string
  targets: Target[]
  retired?: boolean
}

const note = (label: Label) =>
  JSON.stringify({
    runId,
    label,
    owner: userId,
    expiresAt,
    purpose: 'synthetic MCP authority certification; no business modules'
  })

const planned = (label: Label) => ({
  label,
  clientId: `${runId}-${label.toLowerCase()}`,
  spaceId: `spc-${runId}-${label.toLowerCase()}`,
  note: note(label)
})

const save = (manifest: Manifest) => {
  const temporary = `${manifestPath}.tmp`

  writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 })
  chmodSync(temporary, 0o600)
  renameSync(temporary, manifestPath)
}

const read = (): Manifest => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest

  if (
    manifest.runId !== runId ||
    manifest.owner !== userId ||
    manifest.profileId !== profileId ||
    manifest.expiresAt !== expiresAt
  )
    throw new Error('fixture_manifest_invalid')
  if (
    !Array.isArray(manifest.targets) ||
    manifest.targets.length > 3 ||
    new Set(manifest.targets.map(t => t.label)).size !== manifest.targets.length ||
    manifest.targets.some(t => !labels.includes(t.label))
  )
    throw new Error('fixture_manifest_targets_invalid')

  return manifest
}

async function verifyOwner(target: Target) {
  const p = planned(target.label)

  if (target.clientId !== p.clientId || target.spaceId !== p.spaceId || target.note !== p.note)
    throw new Error('fixture_target_invalid')

  const rows = await query(
    `SELECT s.space_id FROM greenhouse_core.spaces s
    JOIN greenhouse_core.clients c ON c.client_id=s.client_id
    JOIN greenhouse_core.organizations o ON o.organization_id=s.organization_id
    WHERE s.space_id=$1 AND c.client_id=$2 AND o.organization_id=$3 AND s.notes=$4 AND c.notes=$4 AND o.notes=$4
      AND o.organization_type='other' AND o.hubspot_company_id IS NULL AND o.tax_id IS NULL AND c.hubspot_company_id IS NULL`,
    [target.spaceId, target.clientId, target.organizationId, target.note]
  )

  if (rows.length !== 1) throw new Error('fixture_ownership_lost')

  const modules = await query(
    `SELECT 1 FROM greenhouse_client_portal.module_assignments WHERE organization_id=$1 LIMIT 1`,
    [target.organizationId]
  )

  if (modules.length) throw new Error('fixture_acquired_business_module')

  const extraSpaces = await query(
    `SELECT 1 FROM greenhouse_core.spaces WHERE (organization_id=$1 OR client_id=$2) AND space_id<>$3 LIMIT 1`,
    [target.organizationId, target.clientId, target.spaceId]
  )

  if (extraSpaces.length) throw new Error('fixture_acquired_foreign_space')
  const users = await query(`SELECT 1 FROM greenhouse_core.client_users WHERE client_id=$1 LIMIT 1`, [target.clientId])

  if (users.length) throw new Error('fixture_acquired_user')

  const foreignOverrides = await query(
    `SELECT 1 FROM greenhouse_core.user_entitlement_overrides WHERE space_id=$1 AND (user_id<>$2 OR reason IS DISTINCT FROM $3) LIMIT 1`,
    [target.spaceId, userId, target.note]
  )

  if (foreignOverrides.length) throw new Error('fixture_acquired_foreign_override')
}

async function override(target: Target, deny: boolean) {
  await verifyOwner(target)

  const current = await query<{ reason: string }>(
    `SELECT reason FROM greenhouse_core.user_entitlement_overrides WHERE space_id=$1 AND user_id=$2`,
    [target.spaceId, userId]
  )

  if (current.some(row => row.reason !== target.note)) throw new Error('fixture_foreign_override')
  await saveUserEntitlementOverrides({
    actorUserId: userId,
    userId,
    spaceId: target.spaceId,
    overrides: deny
      ? [
          {
            capability: 'growth.seo.observation.read',
            action: 'read',
            scope: 'tenant',
            effect: 'revoke',
            reason: target.note,
            expiresAt
          }
        ]
      : []
  })
}

async function report(manifest: Manifest, mutation?: { action: string; startedAt: string; committedBefore: string }) {
  const targets = []

  for (const target of manifest.targets) {
    await verifyOwner(target)

    const result = await withInternalAuthoritySnapshot(({ readQuery, now }) =>
      readInternalTargetAuthority(
        profileId,
        { intent: 'target', organizationId: target.organizationId, capability: 'growth.seo.observation.read' },
        { readQuery, now }
      )
    )

    targets.push({
      label: target.label,
      organizationId: target.organizationId,
      clientId: target.clientId,
      spaceId: target.spaceId,
      outcome: result.outcome
    })
  }

  console.log(
    JSON.stringify(
      {
        evidence: 'local canonical reader against shared PG; not served JWT or MCP proof',
        observedAt: new Date().toISOString(),
        runId,
        expiresAt,
        ...(mutation ? { mutation } : {}),
        retired: manifest.retired ?? false,
        targets
      },
      null,
      2
    )
  )
}

async function main() {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')
  const action = process.argv[2] ?? 'plan'

  if (action === 'plan') {
    console.log(
      JSON.stringify(
        {
          runId,
          owner: userId,
          profileId,
          expiresAt,
          targets: labels.map(planned),
          create:
            'Canonical organization writer and ID allocators; dedicated client/space rows, no modules. C receives one space-scoped deny.',
          selectiveRevocation:
            'Canonical entitlement command denies B only; restore removes only the run-owned override.',
          cleanup:
            'Remove run-owned overrides; deactivate only owned organizations/spaces/clients; retain audit and history.',
          globalRevocation:
            'Separate OAuth client/context family command, restricted to fresh v2 families of the certification.'
        },
        null,
        2
      )
    )

    return
  }

  if (!['create', 'status', 'revoke-b', 'restore-b', 'retire'].includes(action))
    throw new Error('fixture_action_invalid')
  if (!['status', 'retire'].includes(action) && Date.now() >= Date.parse(expiresAt))
    throw new Error('fixture_window_expired')

  const actor = await query(
    `SELECT 1 FROM greenhouse_core.client_users WHERE user_id=$1 AND identity_profile_id=$2 AND active=TRUE AND status='active' AND tenant_type='efeonce_internal'`,
    [userId, profileId]
  )

  if (actor.length !== 1) throw new Error('fixture_actor_invalid')

  if (action === 'create') {
    const manifest: Manifest = existsSync(manifestPath)
      ? read()
      : { runId, owner: userId, profileId, expiresAt, targets: [] }

    if (manifest.retired) throw new Error('fixture_retired')
    save(manifest)

    for (const label of labels) {
      const recorded = manifest.targets.find(target => target.label === label)

      if (recorded) {
        await verifyOwner(recorded)
        continue
      }

      // Recover only the exact owned transaction when commit succeeded but the local manifest write did not.
      const p = planned(label)

      const recovered = await query<{ organization_id: string }>(
        `SELECT organization_id FROM greenhouse_core.spaces WHERE space_id=$1 AND client_id=$2 AND notes=$3`,
        [p.spaceId, p.clientId, p.note]
      )

      if (recovered.length === 1) {
        const target = { ...p, organizationId: recovered[0].organization_id }

        await verifyOwner(target)
        manifest.targets.push(target)
        save(manifest)
        continue
      }

      const target = await withTransaction(async client => {
        await client.query("SET LOCAL lock_timeout='3s'")
        // The canonical allocator currently uses the shared pool. This short table lock also serializes
        // concurrent space INSERTs while that allocator reads the committed maximum.
        await client.query('LOCK TABLE greenhouse_core.spaces IN SHARE ROW EXCLUSIVE MODE')
        const p = planned(label)

        const occupied = await client.query(
          'SELECT 1 FROM greenhouse_core.clients WHERE client_id=$1 UNION ALL SELECT 1 FROM greenhouse_core.spaces WHERE space_id=$2',
          [p.clientId, p.spaceId]
        )

        if (occupied.rows.length) throw new Error('fixture_identifier_occupied')

        const org = await upsertCanonicalOrganization(
          { organizationName: `TASK-1844 Synthetic ${label}`, currentType: 'other', origin: 'manual' },
          client
        )

        await client.query('UPDATE greenhouse_core.organizations SET notes=$2 WHERE organization_id=$1', [
          org.organizationId,
          p.note
        ])
        await client.query(
          `INSERT INTO greenhouse_core.clients (client_id,client_name,status,active,notes) VALUES ($1,$2,'active',TRUE,$3)`,
          [p.clientId, `TASK-1844 Synthetic ${label}`, p.note]
        )
        const numericCode = await allocateSpaceNumericCode()
        const publicId = await nextPublicId('EO-SPC')

        await client.query(
          `INSERT INTO greenhouse_core.spaces (space_id,public_id,organization_id,client_id,space_name,space_type,status,active,notes,numeric_code)
          VALUES ($1,$2,$3,$4,$5,'internal_space','active',TRUE,$6,$7)`,
          [p.spaceId, publicId, org.organizationId, p.clientId, `TASK-1844 Synthetic ${label}`, p.note, numericCode]
        )

        return { ...p, organizationId: org.organizationId }
      })

      manifest.targets.push(target)
      save(manifest)
    }

    await override(manifest.targets.find(target => target.label === 'C')!, true)
    await report(manifest)

    return
  }

  const manifest = read()
  let mutation: { action: string; startedAt: string; committedBefore: string } | undefined

  if (action !== 'retire' && manifest.targets.length !== 3)
    throw new Error('fixture_incomplete_resume_create_or_retire')

  if (action === 'revoke-b' || action === 'restore-b') {
    if (manifest.retired) throw new Error('fixture_retired')
    const b = manifest.targets.find(target => target.label === 'B')

    if (!b) throw new Error('fixture_b_missing')
    const startedAt = new Date().toISOString()

    await override(b, action === 'revoke-b')
    mutation = { action, startedAt, committedBefore: new Date().toISOString() }
  }

  if (action === 'retire') {
    for (const target of manifest.targets) {
      await override(target, false)
      await withTransaction(async client => {
        for (const [table, key, id] of [
          ['spaces', 'space_id', target.spaceId],
          ['clients', 'client_id', target.clientId],
          ['organizations', 'organization_id', target.organizationId]
        ]) {
          const result = await client.query(
            `UPDATE greenhouse_core.${table} SET active=FALSE,status='inactive',updated_at=NOW() WHERE ${key}=$1 AND notes=$2 RETURNING ${key}`,
            [id, target.note]
          )

          if (result.rowCount !== 1) throw new Error('fixture_retirement_mismatch')
        }
      })
    }

    manifest.retired = true
    save(manifest)
  }

  await report(manifest, mutation)
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error && error.message.startsWith('fixture_') ? error.message : 'fixture_operation_failed'
    )
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
