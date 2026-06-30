/**
 * TASK-1282 — State OAuth single-use para Search Console (anti-CSRF / confused-deputy).
 *
 * Patrón canónico (mirror de magic-link + sister-platforms oauth-broker): el `state`
 * que viaja a Google es un token random de 32 bytes; en PG sólo guardamos su SHA-256
 * (`state_hash`) junto al `organization_id` + `site_url` + TTL + single-use. La org
 * se ancla server-side acá, NUNCA viaja en el browser. La callback re-hashea el state
 * entrante, busca la fila bajo `FOR UPDATE`, valida (no consumida + no expirada) y la
 * marca consumida atómicamente. Un state forjado/reusado/expirado no resuelve nada.
 */

import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'

import { SEARCH_CONSOLE_STATE_TTL_MS } from './contracts'

const hashState = (rawState: string): string => createHash('sha256').update(rawState).digest('hex')
const STATE_RETURN_TO_SEPARATOR = '.'

export const normalizeSearchConsoleReturnToPath = (value: string | null | undefined): string | null => {
  const path = value?.trim()

  if (!path || path.length > 512) {
    return null
  }

  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://') || /[\r\n]/.test(path)) {
    return null
  }

  return path.startsWith('/agency/clients/') && path.includes('/lifecycle') ? path : null
}

const encodeReturnToPath = (path: string | null): string | null =>
  path ? Buffer.from(path, 'utf8').toString('base64url') : null

const decodeReturnToPath = (rawState: string): string | null => {
  const encoded = rawState.split(STATE_RETURN_TO_SEPARATOR)[1]

  if (!encoded) {
    return null
  }

  try {
    return normalizeSearchConsoleReturnToPath(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export interface CreateSearchConsoleStateInput {
  organizationId: string
  createdByUserId: string | null
  returnToPath?: string | null
}

/** Crea el state row y devuelve el token raw (lo que se manda a Google). */
export const createSearchConsoleOAuthState = async (
  input: CreateSearchConsoleStateInput
): Promise<string> => {
  const nonce = randomBytes(32).toString('base64url')
  const returnToPath = normalizeSearchConsoleReturnToPath(input.returnToPath)
  const encodedReturnTo = encodeReturnToPath(returnToPath)
  const rawState = encodedReturnTo ? `${nonce}${STATE_RETURN_TO_SEPARATOR}${encodedReturnTo}` : nonce
  const stateHash = hashState(rawState)
  const expiresAt = new Date(Date.now() + SEARCH_CONSOLE_STATE_TTL_MS).toISOString()

  // El flujo property-picker no pre-elige propiedad: `site_url` queda como placeholder
  // ('') en el state. La propiedad se elige después del desplegable.
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_growth.search_console_oauth_states
       (state_hash, organization_id, site_url, created_by_user_id, expires_at)
     VALUES ($1, $2, '', $3, $4)`,
    [stateHash, input.organizationId, input.createdByUserId, expiresAt]
  )

  return rawState
}

export interface ConsumedSearchConsoleState {
  organizationId: string
  createdByUserId: string | null
  returnToPath: string | null
}

interface SearchConsoleStateRow {
  state_id: string
  organization_id: string
  site_url: string
  created_by_user_id: string | null
  expires_at: string
  consumed_at: string | null
}

/**
 * Valida + consume el state entrante atómicamente. Devuelve `null` si no existe,
 * ya fue consumido o expiró (la callback lo traduce a `state_invalid`).
 */
export const consumeSearchConsoleOAuthState = async (
  rawState: string
): Promise<ConsumedSearchConsoleState | null> => {
  const stateHash = hashState(rawState)

  return withGreenhousePostgresTransaction(async client => {
    const found = await client.query<SearchConsoleStateRow>(
      `SELECT state_id, organization_id, site_url, created_by_user_id, expires_at, consumed_at
         FROM greenhouse_growth.search_console_oauth_states
        WHERE state_hash = $1
        FOR UPDATE`,
      [stateHash]
    )

    const row = found.rows[0]

    if (!row || row.consumed_at) {
      return null
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return null
    }

    const consumed = await client.query(
      `UPDATE greenhouse_growth.search_console_oauth_states
          SET consumed_at = NOW()
        WHERE state_id = $1 AND consumed_at IS NULL`,
      [row.state_id]
    )

    if (consumed.rowCount === 0) {
      return null
    }

    return {
      organizationId: row.organization_id,
      createdByUserId: row.created_by_user_id,
      returnToPath: decodeReturnToPath(rawState)
    }
  })
}
