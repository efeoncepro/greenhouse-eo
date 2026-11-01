import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import {
  registerPreparedSigningKeyVersionInTransaction,
  type PreparedSigningKeyVersion,
  type SigningKeyRecord
} from '@/lib/auth-server/keys/signing-keys-store'

export type RotationPhase =
  | 'planned'
  | 'creating'
  | 'create_uncertain'
  | 'version_created'
  | 'preverified'
  | 'activated'
  | 'verified'
  | 'blocked'

export type RotationOperation = Readonly<{
  id: string
  keyName: string
  predecessorKid: string
  phase: RotationPhase
  kmsVersion: string | null
  candidateKid: string | null
  leaseOwner: string | null
  leaseUntil: Date | null
  fencingVersion: number
  verifiedAt: Date | null
}>

type OperationRow = {
  operation_id: string
  key_name: string
  predecessor_kid: string
  phase: RotationPhase
  kms_version: string | null
  candidate_kid: string | null
  lease_owner: string | null
  lease_until: Date | null
  fencing_version: string | number
  verified_at: Date | null
}

type KeyRow = {
  kid: string
  kms_key_version: string
  algorithm: 'ES256'
  public_jwk: SigningKeyRecord['publicJwk']
  state: SigningKeyRecord['state']
  activated_at: Date
  retiring_at: Date | null
  retired_at: Date | null
  created_by: string
}

const OP_COLUMNS = `operation_id, key_name, predecessor_kid, phase, kms_version, candidate_kid,
  lease_owner, lease_until, fencing_version, verified_at`

const KEY_COLUMNS = `kid, kms_key_version, algorithm, public_jwk, state, activated_at, retiring_at,
  retired_at, created_by`

const LEASE_SECONDS = 480
const EVIDENCE_REF_PATTERN = /^docs\/audits\/auth-server\/[a-zA-Z0-9._/-]{8,180}\.md$/

const assertEvidenceRef = (value: string): void => {
  if (!EVIDENCE_REF_PATTERN.test(value) || value.includes('..')) {
    throw new Error('Recovery requires a repository Auth audit markdown reference')
  }
}

const mapOperation = (row: OperationRow): RotationOperation => ({
  id: row.operation_id,
  keyName: row.key_name,
  predecessorKid: row.predecessor_kid,
  phase: row.phase,
  kmsVersion: row.kms_version,
  candidateKid: row.candidate_kid,
  leaseOwner: row.lease_owner,
  leaseUntil: row.lease_until ? new Date(row.lease_until) : null,
  fencingVersion: Number(row.fencing_version),
  verifiedAt: row.verified_at ? new Date(row.verified_at) : null
})

const mapKey = (row: KeyRow): SigningKeyRecord => ({
  kid: row.kid,
  kmsKeyVersion: row.kms_key_version,
  algorithm: row.algorithm,
  publicJwk: row.public_jwk,
  state: row.state,
  activatedAt: new Date(row.activated_at),
  retiringAt: row.retiring_at ? new Date(row.retiring_at) : null,
  retiredAt: row.retired_at ? new Date(row.retired_at) : null,
  createdBy: row.created_by
})

const event = async (client: Pick<PoolClient, 'query'>, operation: RotationOperation, phase: RotationPhase,
  actor: string, executionId: string, result: string) => {
  await client.query(
    `INSERT INTO greenhouse_auth.signing_key_rotation_events
      (operation_id, phase, actor, execution_id, git_sha, result) VALUES ($1,$2,$3,$4,$5,$6)`,
    [operation.id, phase, actor, executionId, process.env.GIT_SHA ?? null, result]
  )
}

export type RotationSnapshot = Readonly<{
  active: SigningKeyRecord | null
  retiring: readonly SigningKeyRecord[]
  lastVerifiedAt: Date | null
  lastVerifiedKid: string | null
  open: RotationOperation | null
}>

export const readRotationSnapshot = async (keyName: string): Promise<RotationSnapshot> => {
  const keys = await query<KeyRow>(
    `SELECT ${KEY_COLUMNS} FROM greenhouse_auth.signing_keys
      WHERE state IN ('active','retiring') AND kms_key_version LIKE $1`,
    [`${keyName}/cryptoKeyVersions/%`]
  )

  const operations = await query<OperationRow>(
    `SELECT ${OP_COLUMNS} FROM greenhouse_auth.signing_key_rotation_operations
      WHERE key_name = $1 AND phase <> 'verified' ORDER BY created_at DESC LIMIT 1`, [keyName]
  )

  const verified = await query<{ verified_at: Date; candidate_kid: string }>(
    `SELECT verified_at, candidate_kid FROM greenhouse_auth.signing_key_rotation_operations
      WHERE key_name = $1 AND phase = 'verified' ORDER BY verified_at DESC LIMIT 1`, [keyName]
  )

  return {
    active: keys.find(key => key.state === 'active') ? mapKey(keys.find(key => key.state === 'active')!) : null,
    retiring: keys.filter(key => key.state === 'retiring').map(mapKey),
    lastVerifiedAt: verified[0] ? new Date(verified[0].verified_at) : null,
    lastVerifiedKid: verified[0]?.candidate_kid ?? null,
    open: operations[0] ? mapOperation(operations[0]) : null
  }
}

export const getRotationOperation = async (operationId: string, keyName: string): Promise<RotationOperation | null> => {
  const rows = await query<OperationRow>(
    `SELECT ${OP_COLUMNS} FROM greenhouse_auth.signing_key_rotation_operations
      WHERE operation_id = $1 AND key_name = $2`, [operationId, keyName]
  )

  return rows[0] ? mapOperation(rows[0]) : null
}

export type ClaimResult = Readonly<{
  kind: 'claimed' | 'not_due' | 'baseline_required' | 'busy' | 'blocked'
  operation?: RotationOperation
}>

/** The advisory lock serializes plan creation with CLI register/retire. */
export const claimRotationOperation = async (input: {
  keyName: string
  owner: string
  actor: string
  executionId: string
  now: Date
}): Promise<ClaimResult> => withTransaction(async client => {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('greenhouse_auth.signing_keys'))`)

  const activeRows = await client.query<KeyRow>(
    `SELECT ${KEY_COLUMNS} FROM greenhouse_auth.signing_keys WHERE state = 'active' FOR UPDATE`
  )

  const active = activeRows.rows[0]

  if (!active) return { kind: 'blocked' }
  if (!active.kms_key_version.startsWith(`${input.keyName}/cryptoKeyVersions/`)) return { kind: 'blocked' }

  const existingRows = await client.query<OperationRow>(
    `SELECT ${OP_COLUMNS} FROM greenhouse_auth.signing_key_rotation_operations
      WHERE key_name = $1 AND phase <> 'verified' FOR UPDATE`, [input.keyName]
  )

  const existing = existingRows.rows[0]

  if (existing) {
    if (existing.phase === 'creating' && new Date(existing.lease_until ?? 0) <= input.now) {
      await client.query(
        `UPDATE greenhouse_auth.signing_key_rotation_operations
           SET phase = 'create_uncertain', lease_owner = NULL, lease_until = NULL,
               error_code = 'create_result_missing' WHERE operation_id = $1`, [existing.operation_id]
      )
      await event(client, mapOperation(existing), 'create_uncertain', input.actor, input.executionId, 'blocked')

      return { kind: 'blocked' }
    }

    if (existing.phase === 'create_uncertain' || existing.phase === 'blocked') return { kind: 'blocked' }
    if (existing.lease_until && new Date(existing.lease_until) > input.now) return { kind: 'busy' }

    const claimed = await client.query<OperationRow>(
      `UPDATE greenhouse_auth.signing_key_rotation_operations
         SET lease_owner = $2, lease_until = $3::timestamptz + make_interval(secs => $4),
             fencing_version = fencing_version + 1
       WHERE operation_id = $1 RETURNING ${OP_COLUMNS}`,
      [existing.operation_id, input.owner, input.now, LEASE_SECONDS]
    )

    return { kind: 'claimed', operation: mapOperation(claimed.rows[0]!) }
  }

  const retiring = await client.query<{ kid: string }>(
    `SELECT kid FROM greenhouse_auth.signing_keys WHERE state = 'retiring' LIMIT 1`
  )

  if (retiring.rows.length > 0) return { kind: 'blocked' }

  const latest = await client.query<{ verified_at: Date; candidate_kid: string }>(
    `SELECT verified_at, candidate_kid FROM greenhouse_auth.signing_key_rotation_operations
      WHERE key_name = $1 AND phase = 'verified' ORDER BY verified_at DESC LIMIT 1`, [input.keyName]
  )

  const verifiedAt = latest.rows[0]?.verified_at

  if (!verifiedAt) return { kind: 'baseline_required' }
  if (latest.rows[0]?.candidate_kid !== active.kid) return { kind: 'blocked' }
  if (input.now.getTime() - new Date(verifiedAt).getTime() < 90 * 24 * 60 * 60 * 1000) return { kind: 'not_due' }

  const created = await client.query<OperationRow>(
    `INSERT INTO greenhouse_auth.signing_key_rotation_operations
      (key_name, predecessor_kid, phase, lease_owner, lease_until, fencing_version)
     VALUES ($1, $2, 'planned', $3, $4::timestamptz + make_interval(secs => $5), 1)
     RETURNING ${OP_COLUMNS}`,
    [input.keyName, active.kid, input.owner, input.now, LEASE_SECONDS]
  )

  const operation = mapOperation(created.rows[0]!)

  await event(client, operation, 'planned', input.actor, input.executionId, 'created')

  return { kind: 'claimed', operation }
})

export const transitionRotationOperation = async (input: {
  operation: RotationOperation
  from: RotationPhase
  to: RotationPhase
  actor: string
  executionId: string
  result: string
  kmsVersion?: string
  candidateKid?: string
  verifiedAt?: Date
  releaseLease?: boolean
}): Promise<RotationOperation> => withTransaction(async client => {
  const { operation } = input

  const updated = await client.query<OperationRow>(
    `UPDATE greenhouse_auth.signing_key_rotation_operations
       SET phase = $4, kms_version = COALESCE($5, kms_version),
           candidate_kid = COALESCE($6, candidate_kid),
           verified_at = COALESCE($7, verified_at),
           overlap_not_before = CASE WHEN $7::timestamptz IS NOT NULL THEN $7::timestamptz + interval '1 hour'
                                     ELSE overlap_not_before END,
           lease_owner = CASE WHEN $8 THEN NULL ELSE lease_owner END,
           lease_until = CASE WHEN $8 THEN NULL ELSE lease_until END
     WHERE operation_id = $1 AND phase = $2 AND lease_owner = $3
       AND fencing_version = $9 AND lease_until > now()
     RETURNING ${OP_COLUMNS}`,
    [operation.id, input.from, operation.leaseOwner, input.to, input.kmsVersion ?? null,
      input.candidateKid ?? null, input.verifiedAt ?? null, input.releaseLease ?? false,
      operation.fencingVersion]
  )

  const row = updated.rows[0]

  if (!row) throw new Error('Stale rotation lease or phase; no transition applied')
  const next = mapOperation(row)

  await event(client, operation, input.to, input.actor, input.executionId, input.result)

  return next
})

/** Registry, event and ledger activation share one PostgreSQL transaction. */
export const activateRotationOperation = async (input: {
  operation: RotationOperation
  prepared: PreparedSigningKeyVersion
  actor: string
  executionId: string
}): Promise<RotationOperation> => withTransaction(async client => {
  const { operation, prepared } = input

  const checked = await client.query<OperationRow>(
    `SELECT ${OP_COLUMNS} FROM greenhouse_auth.signing_key_rotation_operations
      WHERE operation_id = $1 FOR UPDATE`, [operation.id]
  )

  const current = checked.rows[0]

  if (!current || current.phase !== 'preverified' || current.lease_owner !== operation.leaseOwner ||
      Number(current.fencing_version) !== operation.fencingVersion ||
      !current.lease_until || new Date(current.lease_until) <= new Date()) {
    throw new Error('Stale rotation lease before activation')
  }

  if (current.kms_version !== prepared.versionName || current.candidate_kid !== prepared.kid) {
    throw new Error('Prepared candidate does not match the rotation ledger')
  }

  await registerPreparedSigningKeyVersionInTransaction(
    client, prepared, input.actor, true, operation.predecessorKid
  )

  const updated = await client.query<OperationRow>(
    `UPDATE greenhouse_auth.signing_key_rotation_operations SET phase = 'activated'
      WHERE operation_id = $1 RETURNING ${OP_COLUMNS}`, [operation.id]
  )

  await event(client, operation, 'activated', input.actor, input.executionId, 'registered')

  return mapOperation(updated.rows[0]!)
})

/** One-time conservative anchor after a human has verified the previous rotation. */
export const attestExistingRotationBaseline = async (input: {
  keyName: string
  predecessorKid: string
  activeKid: string
  evidenceRef: string
  actor: string
  executionId: string
}): Promise<RotationOperation> => {
  assertEvidenceRef(input.evidenceRef)

  return withTransaction(async client => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('greenhouse_auth.signing_keys'))`)

    const operations = await client.query<OperationRow>(
      `SELECT ${OP_COLUMNS} FROM greenhouse_auth.signing_key_rotation_operations
        WHERE key_name = $1 LIMIT 1 FOR UPDATE`, [input.keyName]
    )

    if (operations.rows.length) throw new Error('Rotation baseline already exists or an operation is open')

    const active = await client.query<KeyRow>(
      `SELECT ${KEY_COLUMNS} FROM greenhouse_auth.signing_keys WHERE state = 'active' FOR UPDATE`
    )

    const previous = await client.query<KeyRow>(
      `SELECT ${KEY_COLUMNS} FROM greenhouse_auth.signing_keys WHERE kid = $1 FOR UPDATE`,
      [input.predecessorKid]
    )

    if (active.rows[0]?.kid !== input.activeKid || previous.rows[0]?.state !== 'retired' ||
        previous.rows[0]?.kid === input.activeKid ||
        !active.rows[0].kms_key_version.startsWith(`${input.keyName}/cryptoKeyVersions/`)) {
      throw new Error('Baseline key state changed; require active candidate and retired predecessor')
    }

    const created = await client.query<OperationRow>(
      `INSERT INTO greenhouse_auth.signing_key_rotation_operations
        (key_name, predecessor_kid, operation_kind, phase, kms_version, candidate_kid,
         verified_at, overlap_not_before, evidence_ref)
       VALUES ($1,$2,'baseline','verified',$3,$4,now(),now(),$5)
       RETURNING ${OP_COLUMNS}`,
      [input.keyName, input.predecessorKid, active.rows[0].kms_key_version,
        input.activeKid, input.evidenceRef]
    )

    const operation = mapOperation(created.rows[0]!)

    await event(client, operation, 'verified', input.actor, input.executionId, 'baseline_attested')

    return operation
  })
}

/** Bind only a named KMS version established by external audit; never infer newest. */
export const reconcileUncertainCreation = async (input: {
  operationId: string
  keyName: string
  versionName: string
  evidenceRef: string
  actor: string
  executionId: string
}): Promise<RotationOperation> => {
  assertEvidenceRef(input.evidenceRef)

  if (!input.versionName.startsWith(`${input.keyName}/cryptoKeyVersions/`) ||
      !/\/cryptoKeyVersions\/[0-9]+$/.test(input.versionName)) {
    throw new Error('Recovered version does not belong to the allowlisted key')
  }

  return withTransaction(async client => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('greenhouse_auth.signing_keys'))`)

    const rows = await client.query<OperationRow>(
      `SELECT ${OP_COLUMNS} FROM greenhouse_auth.signing_key_rotation_operations
        WHERE operation_id = $1 AND key_name = $2 FOR UPDATE`, [input.operationId, input.keyName]
    )

    const row = rows.rows[0]

    if (!row || row.phase !== 'create_uncertain' || row.kms_version) {
      throw new Error('Rotation operation is not awaiting uncertain-create reconciliation')
    }

    const active = await client.query<KeyRow>(
      `SELECT ${KEY_COLUMNS} FROM greenhouse_auth.signing_keys WHERE state = 'active' FOR UPDATE`
    )

    if (active.rows[0]?.kid !== row.predecessor_kid) {
      throw new Error('Signing key predecessor changed during recovery')
    }

    const registered = await client.query<KeyRow>(
      `SELECT ${KEY_COLUMNS} FROM greenhouse_auth.signing_keys WHERE kms_key_version = $1`,
      [input.versionName]
    )

    if (registered.rows.length) throw new Error('Recovered KMS version is already registered')

    const updated = await client.query<OperationRow>(
      `UPDATE greenhouse_auth.signing_key_rotation_operations
         SET phase = 'version_created', kms_version = $2, error_code = NULL, evidence_ref = $3
       WHERE operation_id = $1 RETURNING ${OP_COLUMNS}`,
      [input.operationId, input.versionName, input.evidenceRef]
    )

    const operation = mapOperation(updated.rows[0]!)

    await event(client, operation, 'version_created', input.actor, input.executionId, 'uncertain_create_reconciled')

    return operation
  })
}

/** Only an already active candidate may recover a failed JWKS publication check. */
export const reconcileBlockedPublication = async (input: {
  operationId: string
  keyName: string
  candidateKid: string
  evidenceRef: string
  actor: string
  executionId: string
}): Promise<RotationOperation> => {
  assertEvidenceRef(input.evidenceRef)

  return withTransaction(async client => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('greenhouse_auth.signing_keys'))`)

    const rows = await client.query<OperationRow>(
      `SELECT ${OP_COLUMNS} FROM greenhouse_auth.signing_key_rotation_operations
        WHERE operation_id = $1 AND key_name = $2 FOR UPDATE`, [input.operationId, input.keyName]
    )

    const row = rows.rows[0]

    if (!row || row.phase !== 'blocked' || row.candidate_kid !== input.candidateKid || !row.kms_version) {
      throw new Error('Rotation operation is not an activated publication failure')
    }

    const active = await client.query<KeyRow>(
      `SELECT ${KEY_COLUMNS} FROM greenhouse_auth.signing_keys WHERE state = 'active' FOR UPDATE`
    )

    if (active.rows[0]?.kid !== input.candidateKid || active.rows[0]?.kms_key_version !== row.kms_version) {
      throw new Error('Active signing key differs from the blocked operation')
    }

    const updated = await client.query<OperationRow>(
      `UPDATE greenhouse_auth.signing_key_rotation_operations
         SET phase = 'verified', verified_at = now(), overlap_not_before = now() + interval '1 hour',
             error_code = NULL, evidence_ref = $2
       WHERE operation_id = $1 RETURNING ${OP_COLUMNS}`,
      [input.operationId, input.evidenceRef]
    )

    const operation = mapOperation(updated.rows[0]!)

    await event(client, operation, 'verified', input.actor, input.executionId, 'publication_reconciled')

    return operation
  })
}
