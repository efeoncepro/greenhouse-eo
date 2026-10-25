/** TASK-2069: one authorized synthetic room. Default is an offline, non-mutating plan.
 * Apply is administrative tooling only: no runtime flag, email, session or provider registration.
 * The temporary organization grant never commits active. Canonical command policy remains intact.
 */
import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { Pool, type PoolClient } from 'pg'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { getGreenhousePostgresPool, closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { createGoogleAuth } from '../../src/lib/google-credentials'
import { resolveFirstPartyCorporateIdentity } from '../../src/lib/auth-server/first-party/identity'
import { ELIGIBLE_IDENTITY_FROM } from '../../src/lib/identity/internal-access/store'
import { createCommandExecutor } from '../../../efeonce-rooms/src/server/commands/execute'
import { principalSchema, type Capability } from '../../../efeonce-rooms/src/domain/contracts'
import { contentManifestV2Schema } from '../../../efeonce-rooms/src/domain/content-contracts'
import { validateContentManifest } from '../../../efeonce-rooms/src/domain/content-validation'
import { contentHash } from '../../../efeonce-rooms/src/server/persistence/store'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const RECEIPT_PATH = 'docs/audits/identity/2026-10-25-rooms-pilot-authority-receipt.json'
const RECEIPT_HASH = '6cee855f31056407cbe18c92a52b89383eb701e4e4dbe6dd31ba83b217f1fc10'
const INSTANCE = 'efeonce-group:us-east4:greenhouse-pg-dev'
const DATABASE = 'rooms_production'
const ISSUER = 'https://auth.efeonce.org'
const ORIGIN = 'https://efeonce-rooms.vercel.app'
const PRINCIPAL_ID = 'rooms-pilot-julio-20261025'
const ROOM_ID = 'rooms-synthetic-pilot-20261025'
const TEMP_GRANT_ID = 'rooms-pilot-20261025-create-temporary'
const FINAL_GRANT_ID = 'rooms-pilot-20261025-room-authority'
const SECRET_REF = 'projects/efeonce-group/secrets/rooms-production-postgres-migrator-password/versions/1'
const TEMP_CAPABILITIES: Capability[] = ['rooms.create', 'rooms.read', 'evidence.read']

const FINAL_CAPABILITIES: Capability[] = [
  'rooms.read',
  'evidence.read',
  'editions.publish',
  'rooms.archive',
  'access.read',
  'access.manage'
]

const AUTHORIZATION = {
  task: 'TASK-2069',
  source:
    'Operator authorization for controlled production Rooms pilot, infrastructure and one invitation; confirmed by coordinating parent on 2026-10-25',
  scope:
    'One synthetic room in the existing verified organization; Julio only; two-hour ceiling; no email sent by this tool'
}

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

export function pilotManifest(organizationId: string) {
  return contentManifestV2Schema.parse({
    schemaVersion: 'rooms.content.v2',
    id: ROOM_ID,
    organizationId,
    dataOrigin: 'synthetic',
    title: 'Piloto técnico Rooms — contenido sintético',
    subtitle:
      'Validación de acceso y publicación. No representa una propuesta comercial ni un compromiso con clientes.',
    brand: { name: 'Rooms · piloto técnico', descriptor: 'Contenido sintético', monogram: 'R' },
    profiles: ['seo-aeo'],
    blocks: [
      {
        id: 'pilot-notice',
        type: 'editorial',
        schemaVersion: 1,
        required: true,
        title: 'Sala de verificación',
        fragments: [
          {
            id: 'notice',
            text: 'Esta sala contiene únicamente texto sintético para comprobar el acceso autorizado y la publicación de una edición. No incluye datos de clientes, resultados medidos, archivos ni compromisos comerciales.'
          }
        ]
      }
    ],
    evidence: [],
    relations: [],
    assetRefs: []
  })
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

async function restrictedJournal(receipt: AuthorityReceipt) {
  const parent = resolve(ROOT, '.auth'),
    directory = resolve(parent, 'rooms-pilot-bootstrap')

  for (const path of [parent, directory]) {
    await mkdir(path, { mode: 0o700, recursive: true })
    const stat = await lstat(path)

    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (stat.mode & 0o022) !== 0 ||
      (path === directory && (stat.mode & 0o077) !== 0)
    )
      fail('audit_directory_not_private')
  }

  const runId = randomUUID(),
    path = resolve(directory, `${runId}.jsonl`)

  const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
  let priorHash: string | null = null

  const append = async (event: string, data: unknown) => {
    const payload = { schemaVersion: 1, runId, event, at: new Date().toISOString(), priorHash, data }
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')

    await file.write(`${JSON.stringify({ ...payload, hash })}\n`)
    await file.sync()
    priorHash = hash
  }

  await append('prepared', {
    authorization: AUTHORIZATION,
    receiptPath: RECEIPT_PATH,
    receiptHash: RECEIPT_HASH,
    identity: receipt.identities[0],
    profileId: receipt.person.profileId,
    organizationId: receipt.organization.organizationId,
    roomId: ROOM_ID,
    principalId: PRINCIPAL_ID,
    temporaryCapabilities: TEMP_CAPABILITIES,
    finalCapabilities: FINAL_CAPABILITIES
  })
  // Persist the new directory entry as well as the journal contents before any database mutation.
  const dir = await open(directory, constants.O_RDONLY)

  try {
    await dir.sync()
  } finally {
    await dir.close()
  }

  return { runId, path, append, close: () => file.close() }
}

async function migratorConnection() {
  const auth = createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })

  const result = await auth.request<{ name: string; payload: { data: string } }>({
    url: `https://secretmanager.googleapis.com/v1/${SECRET_REF}:access`,
    method: 'GET',
    timeout: 5000,
    retry: false,
    responseType: 'json'
  })

  if (
    result.data.name?.replace('projects/183008134038/', 'projects/efeonce-group/') !== SECRET_REF ||
    typeof result.data.payload?.data !== 'string'
  )
    fail('secret_reference_mismatch')
  const password = Buffer.from(result.data.payload.data, 'base64').toString('utf8')

  if (!/^[A-Za-z0-9_-]{32,128}$/.test(password)) fail('secret_shape')

  const connector = new Connector({
    auth: createGoogleAuth({ scopes: ['https://www.googleapis.com/auth/sqlservice.admin'] })
  })

  let ready = false,
    closing = false,
    closed = false

  const closeConnector = () => {
    if (ready && !closed) {
      closed = true
      connector.close()
    }
  }

  const pending = connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC })

  void pending
    .then(
      () => {
        ready = true
        if (closing) closeConnector()
      },
      () => {}
    )
    .catch(() => {})
  let timer: ReturnType<typeof setTimeout> | undefined
  let pool: Pool | undefined
  let checkedOut: PoolClient | undefined

  try {
    const driver = await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('connector_deadline')), 15000)
      })
    ])

    if (timer) clearTimeout(timer)
    pool = new Pool({
      ...driver,
      user: 'rooms_migrator',
      password,
      database: DATABASE,
      max: 1,
      connectionTimeoutMillis: 10000,
      statement_timeout: 10000,
      idleTimeoutMillis: 1000,
      options: '-c idle_session_timeout=60000 -c idle_in_transaction_session_timeout=30000',
      application_name: 'rooms-pilot-bootstrap-task2069'
    })
    pool.on('error', () => {})
    const client = await pool.connect()

    checkedOut = client

    const identity = (
      await client.query(`SELECT current_database() AS database,current_user AS username,current_setting('server_version_num')::int AS version,
      r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,r.rolinherit,r.rolconnlimit,
      (SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid OR roleid=r.oid) AS memberships FROM pg_roles r WHERE r.rolname=current_user`)
    ).rows[0]

    if (
      identity.database !== DATABASE ||
      identity.username !== 'rooms_migrator' ||
      identity.version < 160000 ||
      identity.version >= 170000 ||
      identity.rolsuper ||
      identity.rolcreatedb ||
      identity.rolcreaterole ||
      identity.rolreplication ||
      identity.rolbypassrls ||
      identity.rolinherit ||
      identity.rolconnlimit !== 1 ||
      identity.memberships !== 0
    ) {
      fail('migrator_identity_drift')
    }

    return {
      client,
      close: async () => {
        client.release()
        checkedOut = undefined
        await pool!.end()
        closing = true
        closeConnector()
      }
    }
  } catch (error) {
    if (timer) clearTimeout(timer)
    if (checkedOut) checkedOut.release(true)
    if (pool) await pool.end()
    closing = true
    closeConnector()
    throw error
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => !['--apply', '--help'].includes(arg))) fail('invalid_arguments')

  if (args[0] === '--help') {
    console.log(
      'Usage: node --conditions=react-server --import tsx scripts/rooms/bootstrap-production-pilot.ts [--apply]. Default: offline dry-run. Apply revalidates canonical IDs and atomically bootstraps one synthetic room; no email, sessions or flag changes.'
    )

    return
  }

  const receipt = await loadPilotReceipt(),
    organizationId = receipt.organization.organizationId,
    manifest = pilotManifest(organizationId)

  const coverage = validateContentManifest(manifest, {
    revision: 1,
    manifestHash: contentHash(manifest),
    organizationId,
    roomId: ROOM_ID
  })

  if (!coverage.valid || !coverage.publicable) fail('pilot_manifest_not_publicable')

  if (args[0] !== '--apply') {
    console.log(
      JSON.stringify({
        mode: 'offline-dry-run',
        database: DATABASE,
        roomId: ROOM_ID,
        receiptHash: RECEIPT_HASH,
        manifestHash: contentHash(manifest),
        publicable: coverage.publicable,
        temporaryCapabilities: TEMP_CAPABILITIES,
        temporaryMaxSeconds: 300,
        finalCapabilities: FINAL_CAPABILITIES,
        finalMaxSeconds: 7200,
        authorization: AUTHORIZATION,
        liveAuthorityRevalidated: false,
        databaseWrites: false,
        mailSent: false,
        applyRequires: [
          'canonical live revalidation',
          'provisioned Rooms DB and migrator role',
          'private fsynced journal',
          'atomic bootstrap and temporary grant revocation before commit'
        ]
      })
    )

    return
  }

  phase = 'canonical-profile'
  loadGreenhouseToolEnv()
  const profile = applyGreenhousePostgresProfile('ops')

  if (profile.instanceConnectionName !== INSTANCE || profile.database !== 'greenhouse_app')
    fail('canonical_target_mismatch')

  const canonicalPool = await getGreenhousePostgresPool()

  const canonical = await canonicalPool.connect().catch(async () => {
    await closeGreenhousePostgres()

    return fail('canonical_connection_failed')
  })

  let connection: Awaited<ReturnType<typeof migratorConnection>> | undefined
  let journal: Awaited<ReturnType<typeof restrictedJournal>> | undefined
  let openTransaction = false,
    commitAttempted = false,
    committed = false

  try {
    phase = 'canonical-revalidation'
    const evidence = await revalidateCanonical(receipt, canonical)

    journal = await restrictedJournal(receipt)
    await journal.append('canonical_revalidated', evidence)
    phase = 'rooms-connection'
    connection = await migratorConnection()
    const client = connection.client

    phase = 'atomic-bootstrap'
    await client.query('BEGIN')
    openTransaction = true
    await client.query("SET LOCAL lock_timeout='5000ms'")
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,2060))', [organizationId])

    const existing = await client.query(
      `SELECT
      EXISTS(SELECT 1 FROM rooms.principals WHERE organization_id=$1 AND id=$2) OR
      EXISTS(SELECT 1 FROM rooms.identity_bindings WHERE issuer=$3 AND subject=$4) OR
      EXISTS(SELECT 1 FROM rooms.rooms WHERE organization_id=$1 AND id=$5) OR
      EXISTS(SELECT 1 FROM rooms.grants WHERE organization_id=$1 AND id=ANY($6)) AS conflict`,
      [organizationId, PRINCIPAL_ID, ISSUER, receipt.identities[0]!.subject, ROOM_ID, [TEMP_GRANT_ID, FINAL_GRANT_ID]]
    )

    if (existing.rows[0].conflict) fail('existing_pilot_requires_readback_not_reapply')

    const clock = (
      await client.query(
        `SELECT clock_timestamp() AS now,LEAST(clock_timestamp()+interval '2 hours',$1::timestamptz) AS expires_at,clock_timestamp()+interval '5 minutes' AS temporary_expires_at`,
        [evidence.authorityUntil]
      )
    ).rows[0]

    const now = (clock.now as Date).toISOString(),
      expiresAt = (clock.expires_at as Date).toISOString(),
      temporaryExpiresAt = new Date(
        Math.min(clock.temporary_expires_at.getTime(), clock.expires_at.getTime())
      ).toISOString()

    if (Date.parse(expiresAt) - Date.parse(now) < 60000 || Date.parse(now) - Date.parse(evidence.observedAt) > 30000)
      fail('authority_evidence_stale_or_expiring')
    await client.query(
      "INSERT INTO rooms.principals(organization_id,id,kind,role,status,expires_at) VALUES($1,$2,'internal','administrator','active',$3)",
      [organizationId, PRINCIPAL_ID, expiresAt]
    )
    await client.query(
      "INSERT INTO rooms.memberships(organization_id,principal_id,status,expires_at) VALUES($1,$2,'active',$3)",
      [organizationId, PRINCIPAL_ID, expiresAt]
    )
    await client.query(
      "INSERT INTO rooms.identity_bindings(issuer,subject,organization_id,principal_id,status,expires_at) VALUES($1,$2,$3,$4,'active',$5)",
      [ISSUER, receipt.identities[0]!.subject, organizationId, PRINCIPAL_ID, expiresAt]
    )
    await client.query(
      "INSERT INTO rooms.grants(organization_id,id,principal_id,scope_kind,capabilities,status,not_before,expires_at) VALUES($1,$2,$3,'organization',$4,'active',$5,$6)",
      [organizationId, TEMP_GRANT_ID, PRINCIPAL_ID, TEMP_CAPABILITIES, now, temporaryExpiresAt]
    )

    const principal = principalSchema.parse({
      id: PRINCIPAL_ID,
      kind: 'internal',
      role: 'administrator',
      status: 'active',
      expiresAt,
      organizationIds: [organizationId],
      grants: []
    })

    // Administrative single-transaction adapter. No role memberships, runtime pool/env impersonation,
    // injected principal authority, nested commit, or duplicated business implementation.
    const execute = createCommandExecutor({
      transaction: async (requestedOrganization, run) => {
        if (!openTransaction || requestedOrganization !== organizationId) fail('transaction_scope_mismatch')
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,2060))', [organizationId])

        return run(client)
      }
    })

    const created = await execute({
      principal,
      organizationId,
      operation: 'rooms.create',
      idempotencyKey: 'task2069-pilot-create-v1',
      correlationId: journal.runId,
      payload: { roomId: ROOM_ID, content: manifest }
    })

    await client.query(
      "INSERT INTO rooms.grants(organization_id,id,principal_id,scope_kind,room_id,capabilities,status,not_before,expires_at) VALUES($1,$2,$3,'room',$4,$5,'active',$6,$7)",
      [organizationId, FINAL_GRANT_ID, PRINCIPAL_ID, ROOM_ID, FINAL_CAPABILITIES, now, expiresAt]
    )

    const revoked = await client.query(
      "UPDATE rooms.grants SET status='revoked' WHERE organization_id=$1 AND id=$2 AND principal_id=$3 AND scope_kind='organization' AND status='active'",
      [organizationId, TEMP_GRANT_ID, PRINCIPAL_ID]
    )

    if (revoked.rowCount !== 1) fail('temporary_revoke_failed')

    const published = await execute({
      principal,
      organizationId,
      operation: 'editions.publish',
      idempotencyKey: 'task2069-pilot-publish-v1',
      correlationId: journal.runId,
      payload: { roomId: ROOM_ID, expectedRevision: created.revision }
    })

    const final = await client.query(
      `SELECT r.revision,r.lifecycle,r.current_edition_id,e.content_hash,e.snapshot->>'dataOrigin' AS data_origin,
      (SELECT count(*)::int FROM rooms.grants g WHERE g.organization_id=$1 AND g.principal_id=$3 AND g.status='active') AS active_grants,
      (SELECT count(*)::int FROM rooms.grants g WHERE g.organization_id=$1 AND g.principal_id=$3 AND g.status='active' AND g.scope_kind='organization') AS organization_grants
      FROM rooms.rooms r JOIN rooms.editions e ON e.organization_id=r.organization_id AND e.room_id=r.id AND e.id=r.current_edition_id WHERE r.organization_id=$1 AND r.id=$2`,
      [organizationId, ROOM_ID, PRINCIPAL_ID]
    )

    const row = final.rows[0]

    if (
      !row ||
      row.revision !== 2 ||
      row.lifecycle !== 'published' ||
      row.current_edition_id !== published.editionId ||
      row.data_origin !== 'synthetic' ||
      row.active_grants !== 1 ||
      row.organization_grants !== 0
    )
      fail('pilot_readback_failed')
    phase = 'canonical-precommit-revalidation'
    const finalEvidence = await revalidateCanonical(receipt, canonical)

    if (Date.parse(finalEvidence.authorityUntil) < Date.parse(expiresAt)) fail('canonical_authority_shortened')
    await journal.append('precommit_verified', {
      expiresAt,
      temporaryExpiresAt,
      created,
      published,
      readback: row,
      canonical: finalEvidence,
      temporaryGrantStatus: 'revoked',
      sqlRole: 'rooms_migrator',
      sqlRuntimeLeastPrivilegeCertifiedByThisRun: false
    })
    phase = 'commit'
    commitAttempted = true
    await client.query('COMMIT')
    openTransaction = false
    committed = true
    await journal.append('committed', {
      organizationId,
      roomId: ROOM_ID,
      principalId: PRINCIPAL_ID,
      editionId: published.editionId,
      expiresAt,
      temporaryGrantStatus: 'revoked',
      loginUrl: `${ORIGIN}/auth/login?returnTo=${encodeURIComponent(`/rooms/${ROOM_ID}/invitations`)}`,
      mailSent: false,
      flagsChanged: false
    })
    console.log(
      JSON.stringify({
        status: 'committed',
        roomId: ROOM_ID,
        editionId: published.editionId,
        expiresAt,
        receipt: journal.path,
        temporaryGrantStatus: 'revoked',
        mailSent: false,
        flagsChanged: false
      })
    )
  } catch (error) {
    if (openTransaction && connection) {
      try {
        await connection.client.query('ROLLBACK')
      } catch {
        /* Outcome is recorded below; never retry an uncertain commit. */
      }
    }

    if (journal)
      await journal
        .append(
          committed
            ? 'committed_journal_or_cleanup_failed'
            : commitAttempted
              ? 'commit_outcome_unknown_requires_readback'
              : 'aborted_no_commit_attempted',
          { phase }
        )
        .catch(() => {})
    throw error
  } finally {
    canonical.release()

    try {
      if (connection) await connection.close()
    } finally {
      try {
        await closeGreenhousePostgres()
      } finally {
        if (journal) await journal.close()
      }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error(
      JSON.stringify({
        status: 'failed',
        phase,
        action: 'Inspect restricted journal and database state before any retry; raw provider/SQL errors suppressed.'
      })
    )
    process.exitCode = 1
  })
}
