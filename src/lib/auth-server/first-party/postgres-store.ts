import { query, withTransaction } from '@/lib/db'
import type { FirstPartyStore, FirstPartyClient, FirstPartyCode, FirstPartyAccessHandle, FirstPartyLoginTransaction } from './types'

const CLIENT = `client_id AS "clientId", product, redirect_uris AS "redirectUris", token_endpoint_auth_method AS "tokenEndpointAuthMethod",
 client_secret_hash AS "clientSecretHash", status, allow_local_development AS "allowLocalDevelopment",
 session_max_age_seconds AS "sessionMaxAgeSeconds", created_by AS "createdBy", created_at AS "createdAt"`

const CODE = `code_hash AS "codeHash", client_id AS "clientId", session_hash AS "sessionHash", subject,
 redirect_uri AS "redirectUri", code_challenge AS "codeChallenge", nonce, auth_time AS "authTime",
 expires_at AS "expiresAt", created_at AS "createdAt", consumed_at AS "consumedAt", invalidated_at AS "invalidatedAt"`

const HANDLE = `token_hash AS "tokenHash", code_hash AS "codeHash", client_id AS "clientId", session_hash AS "sessionHash", subject,
 auth_time AS "authTime", created_at AS "createdAt", expires_at AS "expiresAt", revoked_at AS "revokedAt"`

const TRANSACTION = `transaction_hash AS "transactionHash", client_id AS "clientId", authorization_url AS "authorizationUrl",
 fresh_after AS "freshAfter", previous_session_hash AS "previousSessionHash", expires_at AS "expiresAt", consumed_at AS "consumedAt"`

type Row<T> = T & Record<string, unknown>

/** All ephemeral state is separate from delegated OAuth grants/consents. */
export class PostgresFirstPartyStore implements FirstPartyStore {
  async getClient(clientId: string) {
    return (await query<Row<FirstPartyClient>>(`SELECT ${CLIENT} FROM greenhouse_auth.first_party_clients WHERE client_id=$1`, [clientId]))[0] ?? null
  }
  async insertClient(client: FirstPartyClient) {
    return withTransaction(async db => {
    const { rows } = await db.query<{ client_id: string }>(
      `INSERT INTO greenhouse_auth.first_party_clients
       (client_id,product,redirect_uris,token_endpoint_auth_method,client_secret_hash,status,allow_local_development,session_max_age_seconds,created_by,created_at)
       VALUES ($1,$2,$3::text[],$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (client_id) DO NOTHING RETURNING client_id`,
      [client.clientId,client.product,client.redirectUris,client.tokenEndpointAuthMethod,client.clientSecretHash,client.status,
        client.allowLocalDevelopment,client.sessionMaxAgeSeconds,client.createdBy,client.createdAt])

    if (rows.length === 1) await db.query(`INSERT INTO greenhouse_auth.oauth_audit_events (event_type,outcome,client_id,details)
      VALUES ('register','success',$1,$2::jsonb)`, [client.clientId, JSON.stringify({ flowClass: 'first_party_sign_in', actor: client.createdBy, product: client.product })])

    return rows.length === 1
    })
  }
  async insertLoginTransaction(tx: FirstPartyLoginTransaction) {
    await query(`INSERT INTO greenhouse_auth.first_party_login_transactions
      (transaction_hash,client_id,authorization_url,fresh_after,previous_session_hash,expires_at,consumed_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tx.transactionHash,tx.clientId,tx.authorizationUrl,tx.freshAfter,tx.previousSessionHash,tx.expiresAt,tx.consumedAt])
  }
  async getLoginTransaction(hash: string) {
    return (await query<Row<FirstPartyLoginTransaction>>(`SELECT ${TRANSACTION} FROM greenhouse_auth.first_party_login_transactions WHERE transaction_hash=$1`, [hash]))[0] ?? null
  }
  async consumeLoginTransaction(hash: string, now: Date) {
    return (await query<{ transaction_hash: string }>(`UPDATE greenhouse_auth.first_party_login_transactions SET consumed_at=$2
      WHERE transaction_hash=$1 AND consumed_at IS NULL AND expires_at>$2 RETURNING transaction_hash`, [hash,now])).length === 1
  }
  async insertCode(code: FirstPartyCode) {
    await query(`INSERT INTO greenhouse_auth.first_party_codes
      (code_hash,client_id,session_hash,subject,redirect_uri,code_challenge,nonce,auth_time,expires_at,created_at,consumed_at,invalidated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [code.codeHash,code.clientId,code.sessionHash,code.subject,code.redirectUri,code.codeChallenge,code.nonce,
      code.authTime,code.expiresAt,code.createdAt,code.consumedAt,code.invalidatedAt])
  }
  async consumeCode(hash: string, clientId: string, now: Date) {
    return withTransaction(async db => {
      const code = (await db.query<FirstPartyCode>(`SELECT ${CODE} FROM greenhouse_auth.first_party_codes WHERE code_hash=$1 AND client_id=$2 FOR UPDATE`, [hash,clientId])).rows[0]

      if (!code) return null

      if (code.consumedAt) {
        await db.query('UPDATE greenhouse_auth.first_party_codes SET invalidated_at=COALESCE(invalidated_at,$2) WHERE code_hash=$1', [hash,now])
        await db.query('UPDATE greenhouse_auth.first_party_access_handles SET revoked_at=COALESCE(revoked_at,$2) WHERE code_hash=$1', [hash,now])

        return { status: 'reused' as const, code }
      }

      if (code.expiresAt <= now) return { status: 'expired' as const, code }
      await db.query('UPDATE greenhouse_auth.first_party_codes SET consumed_at=$2 WHERE code_hash=$1', [hash,now])

      return { status: 'consumed' as const, code: { ...code, consumedAt: now } }
    })
  }
  async insertAccessHandle(handle: FirstPartyAccessHandle) {
    return withTransaction(async db => {
      // The same code row lock orders replay invalidation against issuance: no post-replay handle can escape.
      const code = (await db.query<{ valid: boolean }>(`SELECT consumed_at IS NOT NULL AND invalidated_at IS NULL AS valid
        FROM greenhouse_auth.first_party_codes WHERE code_hash=$1 AND client_id=$2 FOR UPDATE`, [handle.codeHash,handle.clientId])).rows[0]

      if (!code?.valid) return false
      await db.query(`INSERT INTO greenhouse_auth.first_party_access_handles
        (token_hash,code_hash,client_id,session_hash,subject,auth_time,created_at,expires_at,revoked_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [handle.tokenHash,handle.codeHash,handle.clientId,handle.sessionHash,handle.subject,handle.authTime,handle.createdAt,handle.expiresAt,handle.revokedAt])

      return true
    })
  }
  async getAccessHandle(hash: string) {
    return (await query<Row<FirstPartyAccessHandle>>(`SELECT ${HANDLE} FROM greenhouse_auth.first_party_access_handles WHERE token_hash=$1`, [hash]))[0] ?? null
  }
  async revokeAccessHandle(hash: string, clientId: string, now: Date) {
    await query('UPDATE greenhouse_auth.first_party_access_handles SET revoked_at=COALESCE(revoked_at,$3) WHERE token_hash=$1 AND client_id=$2', [hash,clientId,now])
  }
  async revokeCodeHandles(hash: string, now: Date) {
    await query('UPDATE greenhouse_auth.first_party_access_handles SET revoked_at=COALESCE(revoked_at,$2) WHERE code_hash=$1', [hash,now])
  }
}
