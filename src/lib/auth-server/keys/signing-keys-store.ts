import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import {
  assertKmsVersionBelongsToKey,
  buildJwks,
  computeKid,
  getAuthServerKmsKeyName,
  pemToPublicJwk,
  signCompactJws,
  toPublishedJwk,
  type EcPublicJwk,
  type KmsSignerPort,
  type PublishedJwk
} from './kms-signer'

/**
 * TASK-1828 — Registry de llaves de firma (`greenhouse_auth.signing_keys`).
 *
 * State machine: registered(retiring/active) → active → retiring → retired.
 *   - `registerSigningKeyVersion` inserta una versión KMS como `active` (si no hay activa)
 *     o la activa desplazando la activa actual a `retiring` (rotación con solapamiento).
 *   - `retireSigningKey` sólo acepta `retiring` y exige que haya pasado la ventana de
 *     solapamiento (≥ TTL máximo de token + margen) salvo `force` explícito.
 *   - JWKS publica `active` + `retiring`; `retired` desaparece.
 * Toda transición escribe en `signing_key_events` (append-only, trigger en DB).
 */

export type SigningKeyState = 'active' | 'retiring' | 'retired'

export type SigningKeyRecord = Readonly<{
  kid: string
  kmsKeyVersion: string
  algorithm: 'ES256'
  publicJwk: EcPublicJwk
  state: SigningKeyState
  activatedAt: Date
  retiringAt: Date | null
  retiredAt: Date | null
  createdBy: string
}>

type SigningKeyRow = {
  kid: string
  kms_key_version: string
  algorithm: 'ES256'
  public_jwk: EcPublicJwk
  state: SigningKeyState
  activated_at: Date
  retiring_at: Date | null
  retired_at: Date | null
  created_by: string
}

/** Solapamiento mínimo antes de retirar: TTL máximo del access token (15 min) × 4 = 1 h. */
export const SIGNING_KEY_MIN_OVERLAP_MS = 60 * 60 * 1000

const SELECT_COLUMNS = `kid, kms_key_version, algorithm, public_jwk, state, activated_at, retiring_at, retired_at, created_by`

const mapRow = (row: SigningKeyRow): SigningKeyRecord => ({
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

// `query` (runGreenhousePostgresQuery) devuelve las filas directamente; dentro de una
// transacción, `client.query` devuelve el QueryResult de pg (`.rows`).
export const listSigningKeys = async (): Promise<SigningKeyRecord[]> => {
  const rows = await query<SigningKeyRow>(
    `SELECT ${SELECT_COLUMNS} FROM greenhouse_auth.signing_keys ORDER BY activated_at DESC`
  )

  return rows.map(mapRow)
}

export const getActiveSigningKey = async (): Promise<SigningKeyRecord | null> => {
  const rows = await query<SigningKeyRow>(
    `SELECT ${SELECT_COLUMNS} FROM greenhouse_auth.signing_keys WHERE state = 'active' LIMIT 1`
  )

  const row = rows[0]

  return row ? mapRow(row) : null
}

/** Llaves publicables en el JWKS: `active` primero, luego `retiring` (más reciente primero). */
export const getPublishableSigningKeys = async (): Promise<SigningKeyRecord[]> => {
  const rows = await query<SigningKeyRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM greenhouse_auth.signing_keys
      WHERE state IN ('active', 'retiring')
      ORDER BY (state = 'active') DESC, activated_at DESC`
  )

  return rows.map(mapRow)
}

export const buildPublishedJwks = (keys: readonly SigningKeyRecord[]): { keys: PublishedJwk[] } =>
  buildJwks(keys.map(key => toPublishedJwk(key.publicJwk, key.kid)))

const insertEvent = async (
  client: Pick<PoolClient, 'query'>,
  kid: string,
  eventType: 'registered' | 'activated' | 'retiring' | 'retired',
  actor: string,
  details: Record<string, unknown> = {}
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_auth.signing_key_events (kid, event_type, actor, details)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [kid, eventType, actor, JSON.stringify(details)]
  )
}

export type RegisterSigningKeyVersionInput = Readonly<{
  signer: KmsSignerPort
  versionName: string
  actor: string
  /** `true` (default): la versión pasa a `active` y la activa anterior a `retiring`. */
  activate?: boolean
  keyName?: string
}>

export type RegisterSigningKeyVersionResult = Readonly<{
  key: SigningKeyRecord
  previousActiveKid: string | null
  alreadyRegistered: boolean
}>

/**
 * Registra (y por defecto activa) una versión KMS existente. Idempotente por `kms_key_version`:
 * registrar dos veces la misma versión no crea una segunda fila ni un segundo evento de activación.
 */
export const registerSigningKeyVersion = async ({
  signer,
  versionName,
  actor,
  activate = true,
  keyName = getAuthServerKmsKeyName()
}: RegisterSigningKeyVersionInput): Promise<RegisterSigningKeyVersionResult> => {
  assertKmsVersionBelongsToKey(versionName, keyName)

  const pem = await signer.getPublicKeyPem(versionName)
  const publicJwk = await pemToPublicJwk(pem)
  const kid = await computeKid(publicJwk)

  return withTransaction(async client => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('greenhouse_auth.signing_keys'))`)

    const existing = await client.query<SigningKeyRow>(
      `SELECT ${SELECT_COLUMNS} FROM greenhouse_auth.signing_keys WHERE kms_key_version = $1 OR kid = $2`,
      [versionName, kid]
    )

    const existingRow = existing.rows[0]

    if (existingRow) {
      if (existingRow.kms_key_version !== versionName || existingRow.kid !== kid) {
        throw new Error('Signing key collision: kid/version pair already registered with different identity')
      }

      if (!activate || existingRow.state === 'active') {
        return { key: mapRow(existingRow), previousActiveKid: null, alreadyRegistered: true }
      }

      if (existingRow.state === 'retired') {
        throw new Error('A retired signing key cannot be re-activated')
      }
    }

    const active = await client.query<SigningKeyRow>(
      `SELECT ${SELECT_COLUMNS} FROM greenhouse_auth.signing_keys WHERE state = 'active' FOR UPDATE`
    )

    const previousActive = active.rows[0] ?? null
    const shouldActivate = activate || !previousActive

    if (shouldActivate && previousActive && previousActive.kid !== kid) {
      await client.query(
        `UPDATE greenhouse_auth.signing_keys SET state = 'retiring', retiring_at = now() WHERE kid = $1`,
        [previousActive.kid]
      )
      await insertEvent(client, previousActive.kid, 'retiring', actor, { replacedBy: kid })
    }

    const targetState: SigningKeyState = shouldActivate ? 'active' : 'retiring'

    const upserted = await client.query<SigningKeyRow>(
      `INSERT INTO greenhouse_auth.signing_keys
         (kid, kms_key_version, algorithm, public_jwk, state, activated_at, retiring_at, created_by)
       VALUES ($1, $2, 'ES256', $3::jsonb, $4, now(), CASE WHEN $4 = 'retiring' THEN now() END, $5)
       ON CONFLICT (kid) DO UPDATE
         SET state = EXCLUDED.state,
             activated_at = CASE WHEN EXCLUDED.state = 'active' THEN now() ELSE greenhouse_auth.signing_keys.activated_at END,
             retiring_at = CASE WHEN EXCLUDED.state = 'active' THEN NULL ELSE greenhouse_auth.signing_keys.retiring_at END
       RETURNING ${SELECT_COLUMNS}`,
      [kid, versionName, JSON.stringify(publicJwk), targetState, actor]
    )

    const row = upserted.rows[0]

    if (!row) {
      throw new Error('Signing key upsert returned no row')
    }

    if (!existingRow) {
      await insertEvent(client, kid, 'registered', actor, { kmsKeyVersion: versionName })
    }

    if (shouldActivate) {
      await insertEvent(client, kid, 'activated', actor, { previousActiveKid: previousActive?.kid ?? null })
    }

    return { key: mapRow(row), previousActiveKid: previousActive?.kid ?? null, alreadyRegistered: Boolean(existingRow) }
  })
}

export type RetireSigningKeyInput = Readonly<{
  kid: string
  actor: string
  /** Salta la ventana mínima de solapamiento (sólo incidente; queda en el evento). */
  force?: boolean
  now?: Date
}>

export const retireSigningKey = async ({ kid, actor, force = false, now = new Date() }: RetireSigningKeyInput) =>
  withTransaction(async client => {
    const result = await client.query<SigningKeyRow>(
      `SELECT ${SELECT_COLUMNS} FROM greenhouse_auth.signing_keys WHERE kid = $1 FOR UPDATE`,
      [kid]
    )

    const row = result.rows[0]

    if (!row) {
      throw new Error('Signing key not found')
    }

    if (row.state === 'retired') {
      return mapRow(row)
    }

    if (row.state !== 'retiring' || !row.retiring_at) {
      throw new Error('Only a retiring signing key can be retired; rotate first')
    }

    const overlapMs = now.getTime() - new Date(row.retiring_at).getTime()

    if (!force && overlapMs < SIGNING_KEY_MIN_OVERLAP_MS) {
      throw new Error(`Signing key overlap window not elapsed (${Math.round(overlapMs / 1000)}s < ${SIGNING_KEY_MIN_OVERLAP_MS / 1000}s)`)
    }

    const updated = await client.query<SigningKeyRow>(
      `UPDATE greenhouse_auth.signing_keys SET state = 'retired', retired_at = $2 WHERE kid = $1 RETURNING ${SELECT_COLUMNS}`,
      [kid, now]
    )

    await insertEvent(client, kid, 'retired', actor, { force, overlapMs })

    const updatedRow = updated.rows[0]

    if (!updatedRow) {
      throw new Error('Signing key retire returned no row')
    }

    return mapRow(updatedRow)
  })

export type SignAccessTokenInput = Readonly<{
  signer: KmsSignerPort
  payload: Record<string, unknown>
}>

/** Firma un JWT con la llave activa. Falla loud (y reporta) si no hay llave activa. */
export const signWithActiveKey = async ({ signer, payload }: SignAccessTokenInput): Promise<string> => {
  const active = await getActiveSigningKey()

  if (!active) {
    const error = new Error('No active signing key registered')

    captureWithDomain(error, 'identity', { tags: { component: 'auth-server' } })
    throw error
  }

  return signCompactJws({
    signer,
    versionName: active.kmsKeyVersion,
    kid: active.kid,
    publicJwk: active.publicJwk,
    payload
  })
}
