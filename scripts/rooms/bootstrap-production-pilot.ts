/** TASK-2069 canonical authority helper. READ ONLY; production bootstrap lives in Rooms. */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PoolClient } from 'pg'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { getGreenhousePostgresPool, closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { resolveFirstPartyCorporateIdentity } from '../../src/lib/auth-server/first-party/identity'
import { ELIGIBLE_IDENTITY_FROM } from '../../src/lib/identity/internal-access/store'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const RECEIPT_PATH = 'docs/audits/identity/2026-10-25-rooms-pilot-authority-receipt.json'
const RECEIPT_HASH = '6cee855f31056407cbe18c92a52b89383eb701e4e4dbe6dd31ba83b217f1fc10'
const INSTANCE = 'efeonce-group:us-east4:greenhouse-pg-dev'
const ISSUER = 'https://auth.efeonce.org'

type AuthorityReceipt = {
  schemaVersion: number
  purpose: string
  status: string
  observedAt: string
  person: {
    profileId: string
    active: boolean
    status: string
    profileActive: boolean
    profileStatus: string
    profileType: string
    mergedIntoProfileId: null | string
  }
  organization: {
    organizationId: string
    publicId: string
    active: boolean
    status: string
    isOperatingEntity: boolean
  }
  identities: {
    enrollmentId: string
    environmentId: string
    profileId: string
    nativeLinkId: string
    upstreamLinkId: string
    issuer: string
    subject: string
    status: string
    revokedAt: null | string
    canonicalFirstPartyReaderResolved: boolean
    canonicalIdsMatch: boolean
  }[]
  memberships: { membershipId: string; profileId: string; organizationId: string; effectiveAtObservation: boolean }[]
  legalRelationships: {
    relationshipId: string
    profileId: string
    organizationId: string
    effectiveAtObservation: boolean
  }[]
}

const fail = (code: string): never => {
  throw new Error(code)
}

let phase = 'arguments'

export async function loadPilotReceipt(): Promise<AuthorityReceipt> {
  const bytes = await readFile(resolve(ROOT, RECEIPT_PATH))

  if (createHash('sha256').update(bytes).digest('hex') !== RECEIPT_HASH) fail('authority_receipt_drift')
  // Byte-pinned peer artifact; any refresh requires review of this pin, not a permissive JSON merge.
  const receipt = JSON.parse(bytes.toString('utf8')) as AuthorityReceipt
  const identity = receipt.identities[0]

  if (
    receipt.schemaVersion !== 1 ||
    receipt.status !== 'verified_snapshot' ||
    receipt.purpose !== 'rooms_authorized_synthetic_room_canary_identity_bootstrap' ||
    receipt.identities.length !== 1 ||
    !identity ||
    identity.issuer !== ISSUER ||
    identity.profileId !== receipt.person.profileId ||
    !identity.canonicalFirstPartyReaderResolved ||
    !identity.canonicalIdsMatch ||
    identity.status !== 'active' ||
    identity.revokedAt !== null ||
    receipt.organization.publicId !== 'EO-ORG-0007' ||
    !receipt.organization.active ||
    receipt.organization.status !== 'active' ||
    !receipt.organization.isOperatingEntity ||
    !receipt.person.active ||
    !receipt.person.profileActive ||
    receipt.person.status !== 'active' ||
    receipt.person.profileStatus !== 'active' ||
    receipt.person.profileType !== 'efeonce_internal' ||
    receipt.person.mergedIntoProfileId !== null
  )
    fail('authority_receipt_invalid')

  return receipt
}

/** Recheck existing IDs through the canonical reader and current corporate membership, never email. */
export async function revalidateCanonical(receipt: AuthorityReceipt, client: PoolClient) {
  const identity = receipt.identities[0]!

  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')

  try {
    await client.query("SET LOCAL statement_timeout='5000ms'")

    const enrollment = await client.query(
      `SELECT e.tenant_id::text,e.object_id::text FROM greenhouse_core.internal_native_enrollments e
      JOIN greenhouse_core.external_identity_environments env ON env.environment_id=e.environment_id AND env.status='active' AND env.issuer_url=$6
      WHERE e.enrollment_id=$1 AND e.environment_id=$2 AND e.profile_id=$3 AND e.native_link_id=$4 AND e.upstream_link_id=$5 AND e.status='active' AND e.revoked_at IS NULL`,
      [
        identity.enrollmentId,
        identity.environmentId,
        receipt.person.profileId,
        identity.nativeLinkId,
        identity.upstreamLinkId,
        ISSUER
      ]
    )

    if (enrollment.rows.length !== 1) fail('canonical_enrollment_changed')
    const upstream = enrollment.rows[0]

    const resolved = await resolveFirstPartyCorporateIdentity(
      {
        environmentId: identity.environmentId,
        tenantId: upstream.tenant_id,
        objectId: upstream.object_id,
        issuer: `https://login.microsoftonline.com/${upstream.tenant_id}/v2.0`
      },
      async <T>(text: string, parameters?: unknown[]) => (await client.query(text, parameters)).rows as T[]
    )

    if (
      !resolved ||
      resolved.subject !== identity.subject ||
      resolved.profileId !== receipt.person.profileId ||
      resolved.nativeLinkId !== identity.nativeLinkId ||
      resolved.upstreamLinkId !== identity.upstreamLinkId ||
      resolved.environmentId !== identity.environmentId
    )
      fail('canonical_identity_changed')

    const eligible = await client.query(
      `SELECT p.profile_id,o.organization_id ${ELIGIBLE_IDENTITY_FROM} AND p.profile_id=$1 AND o.organization_id=$2 AND upstream.link_id=$3`,
      [receipt.person.profileId, receipt.organization.organizationId, identity.upstreamLinkId]
    )

    if (eligible.rows.length !== 1) fail('canonical_organization_changed')

    const membership = await client.query(
      `SELECT membership_id,end_date FROM greenhouse_core.person_memberships WHERE profile_id=$1 AND organization_id=$2 AND membership_type='team_member' AND active=TRUE AND status='active' AND (start_date IS NULL OR start_date<=CURRENT_DATE) AND (end_date IS NULL OR end_date>=CURRENT_DATE)`,
      [receipt.person.profileId, receipt.organization.organizationId]
    )

    const relationship = await client.query(
      `SELECT relationship_id,effective_to FROM greenhouse_core.person_legal_entity_relationships WHERE profile_id=$1 AND legal_entity_organization_id=$2 AND relationship_type IN ('employee','contractor','executive') AND status='active' AND effective_from<=CURRENT_DATE AND (effective_to IS NULL OR effective_to>=CURRENT_DATE)`,
      [receipt.person.profileId, receipt.organization.organizationId]
    )

    const pinnedMembership = membership.rows.find(row =>
      receipt.memberships.some(entry => entry.membershipId === row.membership_id && entry.effectiveAtObservation)
    )

    const pinnedRelationship = relationship.rows.find(row =>
      receipt.legalRelationships.some(
        entry => entry.relationshipId === row.relationship_id && entry.effectiveAtObservation
      )
    )

    if (!pinnedMembership || !pinnedRelationship) fail('canonical_membership_changed')

    const expiry = await client.query(
      `SELECT clock_timestamp() AS observed_at,LEAST(clock_timestamp()+interval '2 hours',
      COALESCE(($1::date+1)::timestamp AT TIME ZONE 'UTC','infinity'::timestamptz),COALESCE(($2::date+1)::timestamp AT TIME ZONE 'UTC','infinity'::timestamptz)) AS authority_until`,
      [pinnedMembership.end_date, pinnedRelationship.effective_to]
    )

    await client.query('COMMIT')

    return {
      observedAt: (expiry.rows[0].observed_at as Date).toISOString(),
      authorityUntil: (expiry.rows[0].authority_until as Date).toISOString(),
      membershipId: pinnedMembership.membership_id as string,
      relationshipId: pinnedRelationship.relationship_id as string
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => !['--help', '--snapshot', '--revalidate'].includes(arg)))
    fail('invalid_arguments')

  if (args[0] === '--help') {
    console.log(
      'Read-only authority helper: --snapshot emits pinned source JSON over a private subprocess pipe; --revalidate adds live canonical read-only evidence. Bootstrap --apply belongs to efeonce-rooms/scripts/bootstrap-production-pilot.ts.'
    )

    return
  }

  const receipt = await loadPilotReceipt()
  const sourceReceipt = await readFile(resolve(ROOT, RECEIPT_PATH), 'utf8')

  if (createHash('sha256').update(sourceReceipt).digest('hex') !== RECEIPT_HASH)
    fail('authority_receipt_changed_during_read')

  if (!args.length) {
    console.log(
      JSON.stringify({
        mode: 'offline-authority-plan',
        receiptHash: RECEIPT_HASH,
        sourceVerified: true,
        liveAuthorityRevalidated: false,
        databaseWrites: false,
        bootstrapOwner: 'efeonce-rooms/scripts/bootstrap-production-pilot.ts'
      })
    )

    return
  }

  if (args[0] === '--snapshot') {
    console.log(JSON.stringify({ schemaVersion: 1, receiptHash: RECEIPT_HASH, sourceReceipt, observation: null }))

    return
  }

  phase = 'canonical-profile'
  loadGreenhouseToolEnv()
  const profile = applyGreenhousePostgresProfile('ops')

  if (profile.instanceConnectionName !== INSTANCE || profile.database !== 'greenhouse_app')
    fail('canonical_target_mismatch')

  try {
    const pool = await getGreenhousePostgresPool()
    const client = await pool.connect()

    try {
      phase = 'canonical-revalidation'
      const observation = await revalidateCanonical(receipt, client)

      console.log(JSON.stringify({ schemaVersion: 1, receiptHash: RECEIPT_HASH, sourceReceipt, observation }))
    } finally {
      client.release()
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error(JSON.stringify({ status: 'failed_sanitized', phase, databaseWrites: false }))
    process.exitCode = 1
  })
}
