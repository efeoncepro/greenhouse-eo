import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

import { ApiPlatformError } from './errors'
import type { ApiPlatformLane } from './request-logging'

// ─── Constants ──────────────────────────────────────────────

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key'
export const IDEMPOTENCY_REPLAYED_HEADER = 'idempotency-replayed'

// Keys expire after 24h. A retry with the same key after expiry is treated as a
// fresh command (the audit row remains for forensic; the partial unique index lets
// a new claim coexist only after the prior row is pruned — see cleanup follow-up).
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

const MAX_IDEMPOTENCY_KEY_LENGTH = 255

// ─── Types ──────────────────────────────────────────────────

export type CommandExecutionStatus = 'processing' | 'completed' | 'failed'

export type CommandPrincipalKind = 'consumer' | 'app_user' | 'internal_actor'

export type CommandExecutionScope = {
  greenhouseScopeType?: string | null
  organizationId?: string | null
  clientId?: string | null
  spaceId?: string | null
}

export type CommandExecutionPrincipal = {
  lane: ApiPlatformLane
  principalKind: CommandPrincipalKind
  principalId: string
  consumerId?: string | null
  appSessionId?: string | null
  userId?: string | null
}

export type StoredCommandExecution = {
  commandExecutionId: string
  status: CommandExecutionStatus
  requestFingerprint: string | null
  responseStatus: number | null
  responseBody: unknown
}

/**
 * Decision taken when a claim attempt did NOT grab the key (the upsert returned no
 * row). It means another request already owns or owned this key. Pure function — no
 * I/O — so it is unit-testable without Postgres.
 */
export type IdempotencyDecision =
  | { kind: 'replay'; responseStatus: number; responseBody: unknown }
  | { kind: 'conflict' }
  | { kind: 'in_progress' }

// ─── Helpers ────────────────────────────────────────────────

const buildCommandExecutionId = () => `EO-APC-${randomUUID().slice(0, 8).toUpperCase()}`

/**
 * Deterministic JSON serialization with recursively sorted object keys. Two requests
 * with the same logical payload but different key ordering must produce the same
 * fingerprint — otherwise a legitimate retry would false-trigger idempotency_conflict.
 */
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)

  return `{${entries.join(',')}}`
}

export const computeRequestFingerprint = ({
  method,
  path,
  body
}: {
  method: string
  path: string
  body: unknown
}) =>
  createHash('sha256')
    .update(`${method.toUpperCase()}\n${path}\n${stableStringify(body ?? null)}`)
    .digest('hex')

/**
 * Normalizes the Idempotency-Key header. Returns null when absent/blank (idempotency
 * is opt-in). Throws 400 when present but malformed — never silently downgrades a
 * provided-but-invalid key to "no key" (that would make a write non-idempotent
 * without the consumer knowing).
 */
export const parseIdempotencyKey = (request: Request): string | null => {
  const raw = request.headers.get(IDEMPOTENCY_KEY_HEADER)

  if (raw === null) return null

  const trimmed = raw.trim()

  if (!trimmed) return null

  if (trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new ApiPlatformError(`Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters.`, {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return trimmed
}

export const resolveIdempotencyDecision = (
  existing: StoredCommandExecution | null,
  fingerprint: string
): IdempotencyDecision => {
  // Row vanished between claim and read (cleanup race). Safe default: conflict.
  if (!existing) return { kind: 'conflict' }

  // Same key, different payload → the consumer reused a key incorrectly.
  if (existing.requestFingerprint !== fingerprint) return { kind: 'conflict' }

  // Terminal success with a stored response → faithful replay.
  if (existing.status === 'completed' && existing.responseStatus !== null) {
    return { kind: 'replay', responseStatus: existing.responseStatus, responseBody: existing.responseBody }
  }

  // Another request is currently running this exact command.
  if (existing.status === 'processing') return { kind: 'in_progress' }

  // completed-without-response, or failed that another caller already re-claimed (now
  // processing by the time we read) — both safe to surface as conflict.
  return { kind: 'conflict' }
}

// ─── Store I/O ──────────────────────────────────────────────

const SCOPE_AND_AUDIT_COLUMNS = `
  lane,
  principal_kind,
  principal_id,
  consumer_id,
  app_session_id,
  user_id,
  route_key,
  request_method,
  request_path,
  greenhouse_scope_type,
  organization_id,
  client_id,
  space_id
`

const buildInsertParams = ({
  principal,
  scope,
  routeKey,
  method,
  path
}: {
  principal: CommandExecutionPrincipal
  scope: CommandExecutionScope
  routeKey: string
  method: string
  path: string
}) => [
  principal.lane,
  principal.principalKind,
  principal.principalId,
  principal.consumerId ?? null,
  principal.appSessionId ?? null,
  principal.userId ?? null,
  routeKey,
  method.toUpperCase(),
  path,
  scope.greenhouseScopeType ?? null,
  scope.organizationId ?? null,
  scope.clientId ?? null,
  scope.spaceId ?? null
]

/**
 * Atomic idempotent claim. Inserts a fresh `processing` row, OR re-claims an existing
 * row that is `failed` with a matching fingerprint (retry-after-failure). For any other
 * conflicting state (completed / processing / failed-with-different-fp) the conditional
 * `DO UPDATE ... WHERE` does not fire and RETURNING is empty — the caller then reads the
 * existing row and applies `resolveIdempotencyDecision`.
 *
 * Returns `{ claimed: true, commandExecutionId }` when this request owns execution,
 * or `{ claimed: false }` when another request owns/owned the key.
 */
export const claimCommandExecution = async ({
  principal,
  scope,
  routeKey,
  method,
  path,
  idempotencyKey,
  fingerprint,
  expiresAt
}: {
  principal: CommandExecutionPrincipal
  scope: CommandExecutionScope
  routeKey: string
  method: string
  path: string
  idempotencyKey: string
  fingerprint: string
  expiresAt: Date
}): Promise<{ claimed: boolean; commandExecutionId?: string }> => {
  const commandExecutionId = buildCommandExecutionId()

  const rows = await query<{ command_execution_id: string }>(
    `
      INSERT INTO greenhouse_core.api_platform_command_executions (
        command_execution_id,
        ${SCOPE_AND_AUDIT_COLUMNS},
        idempotency_key,
        request_fingerprint,
        status,
        expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'processing', $17
      )
      ON CONFLICT (principal_id, idempotency_key) WHERE idempotency_key IS NOT NULL
      DO UPDATE SET
        command_execution_id = EXCLUDED.command_execution_id,
        request_fingerprint = EXCLUDED.request_fingerprint,
        status = 'processing',
        response_status = NULL,
        response_body = NULL,
        error_code = NULL,
        completed_at = NULL,
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP
      WHERE api_platform_command_executions.status = 'failed'
        AND api_platform_command_executions.request_fingerprint = EXCLUDED.request_fingerprint
      RETURNING command_execution_id
    `,
    [
      commandExecutionId,
      ...buildInsertParams({ principal, scope, routeKey, method, path }),
      idempotencyKey,
      fingerprint,
      expiresAt
    ]
  )

  const claimedId = rows[0]?.command_execution_id

  return claimedId ? { claimed: true, commandExecutionId: claimedId } : { claimed: false }
}

/** Inserts a fresh audit-only row for a command WITHOUT an idempotency key. */
export const recordCommandAudit = async ({
  principal,
  scope,
  routeKey,
  method,
  path,
  expiresAt
}: {
  principal: CommandExecutionPrincipal
  scope: CommandExecutionScope
  routeKey: string
  method: string
  path: string
  expiresAt: Date
}): Promise<string> => {
  const commandExecutionId = buildCommandExecutionId()

  await query(
    `
      INSERT INTO greenhouse_core.api_platform_command_executions (
        command_execution_id,
        ${SCOPE_AND_AUDIT_COLUMNS},
        idempotency_key,
        request_fingerprint,
        status,
        expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NULL, NULL, 'processing', $15
      )
    `,
    [commandExecutionId, ...buildInsertParams({ principal, scope, routeKey, method, path }), expiresAt]
  )

  return commandExecutionId
}

export const loadCommandExecutionByKey = async ({
  principalId,
  idempotencyKey
}: {
  principalId: string
  idempotencyKey: string
}): Promise<StoredCommandExecution | null> => {
  const rows = await query<{
    command_execution_id: string
    status: CommandExecutionStatus
    request_fingerprint: string | null
    response_status: number | null
    response_body: unknown
  }>(
    `
      SELECT command_execution_id, status, request_fingerprint, response_status, response_body
      FROM greenhouse_core.api_platform_command_executions
      WHERE principal_id = $1 AND idempotency_key = $2
      LIMIT 1
    `,
    [principalId, idempotencyKey]
  )

  const row = rows[0]

  if (!row) return null

  return {
    commandExecutionId: row.command_execution_id,
    status: row.status,
    requestFingerprint: row.request_fingerprint,
    responseStatus: row.response_status,
    responseBody: row.response_body
  }
}

export const completeCommandExecution = async ({
  commandExecutionId,
  responseStatus,
  responseBody
}: {
  commandExecutionId: string
  responseStatus: number
  responseBody: unknown
}): Promise<void> => {
  await query(
    `
      UPDATE greenhouse_core.api_platform_command_executions
      SET status = 'completed',
          response_status = $2,
          response_body = $3::jsonb,
          error_code = NULL,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE command_execution_id = $1
    `,
    [commandExecutionId, responseStatus, responseBody === undefined ? null : JSON.stringify(responseBody)]
  )
}

export const failCommandExecution = async ({
  commandExecutionId,
  responseStatus,
  errorCode
}: {
  commandExecutionId: string
  responseStatus: number | null
  errorCode: string | null
}): Promise<void> => {
  await query(
    `
      UPDATE greenhouse_core.api_platform_command_executions
      SET status = 'failed',
          response_status = $2,
          error_code = $3,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE command_execution_id = $1
    `,
    [commandExecutionId, responseStatus, errorCode]
  )
}

export const incrementReplayCount = async ({
  principalId,
  idempotencyKey
}: {
  principalId: string
  idempotencyKey: string
}): Promise<void> => {
  await query(
    `
      UPDATE greenhouse_core.api_platform_command_executions
      SET replay_count = replay_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE principal_id = $1 AND idempotency_key = $2
    `,
    [principalId, idempotencyKey]
  )
}
