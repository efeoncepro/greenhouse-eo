import 'server-only'

import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { query, withTransaction } from '@/lib/db'

import type {
  CreateSisterPlatformConsumerInput,
  SisterPlatformConsumerRecord,
  SisterPlatformConsumerStatus,
  SisterPlatformConsumerType,
  SisterPlatformGreenhouseScopeType,
  UpsertSisterPlatformConsumerInput
} from './types'

type SisterPlatformConsumerRow = {
  consumer_id: string
  public_id: string
  sister_platform_key: string
  consumer_name: string
  consumer_type: SisterPlatformConsumerType
  credential_status: SisterPlatformConsumerStatus
  token_prefix: string
  hash_algorithm: 'sha256'
  allowed_greenhouse_scope_types: string[] | null
  rate_limit_per_minute: number
  rate_limit_per_hour: number
  expires_at: string | Date | null
  last_used_at: string | Date | null
  notes: string | null
  metadata_json: Record<string, unknown> | null
  created_by_user_id: string | null
  rotated_by_user_id: string | null
  suspended_by_user_id: string | null
  deprecated_by_user_id: string | null
  suspended_at: string | Date | null
  deprecated_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

type TransactionClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}

export class SisterPlatformConsumerError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'SisterPlatformConsumerError'
    this.statusCode = statusCode
  }
}

const ALL_SCOPE_TYPES: SisterPlatformGreenhouseScopeType[] = ['organization', 'client', 'space', 'internal']

const toIsoString = (value: string | Date | null) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const sanitizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : null
}

const sanitizeRequiredText = (value: unknown, fieldName: string) => {
  const normalized = sanitizeOptionalText(value)

  if (!normalized) {
    throw new SisterPlatformConsumerError(`${fieldName} es requerido.`)
  }

  return normalized
}

const sanitizeJson = (value: Record<string, unknown> | null | undefined) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value
}

const normalizeScopeTypes = (value: SisterPlatformGreenhouseScopeType[] | undefined) => {
  if (!value || value.length === 0) {
    return [...ALL_SCOPE_TYPES]
  }

  const normalized = Array.from(new Set(value)).filter(
    (item): item is SisterPlatformGreenhouseScopeType =>
      item === 'organization' || item === 'client' || item === 'space' || item === 'internal'
  )

  if (normalized.length === 0) {
    throw new SisterPlatformConsumerError('allowedGreenhouseScopeTypes debe incluir al menos un scope valido.')
  }

  return normalized
}

const normalizeLimit = (value: number | undefined, fieldName: string, fallback: number) => {
  if (value === undefined || value === null) {
    return fallback
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new SisterPlatformConsumerError(`${fieldName} debe ser un numero positivo.`)
  }

  return Math.trunc(value)
}

const normalizeIsoTimestamp = (value: string | null | undefined, fieldName: string) => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new SisterPlatformConsumerError(`${fieldName} debe ser un timestamp ISO valido.`)
  }

  return parsed.toISOString()
}

const mapConsumerRow = (row: SisterPlatformConsumerRow): SisterPlatformConsumerRecord => ({
  consumerId: row.consumer_id,
  publicId: row.public_id,
  sisterPlatformKey: row.sister_platform_key,
  consumerName: row.consumer_name,
  consumerType: row.consumer_type,
  credentialStatus: row.credential_status,
  tokenPrefix: row.token_prefix,
  hashAlgorithm: row.hash_algorithm,
  allowedGreenhouseScopeTypes: normalizeScopeTypes(row.allowed_greenhouse_scope_types as SisterPlatformGreenhouseScopeType[]),
  rateLimitPerMinute: Number(row.rate_limit_per_minute || 0),
  rateLimitPerHour: Number(row.rate_limit_per_hour || 0),
  expiresAt: toIsoString(row.expires_at),
  lastUsedAt: toIsoString(row.last_used_at),
  notes: row.notes,
  metadata: row.metadata_json ?? {},
  createdByUserId: row.created_by_user_id,
  rotatedByUserId: row.rotated_by_user_id,
  suspendedByUserId: row.suspended_by_user_id,
  deprecatedByUserId: row.deprecated_by_user_id,
  suspendedAt: toIsoString(row.suspended_at),
  deprecatedAt: toIsoString(row.deprecated_at),
  createdAt: toIsoString(row.created_at) || new Date(0).toISOString(),
  updatedAt: toIsoString(row.updated_at) || new Date(0).toISOString()
})

const loadConsumerById = async (consumerId: string) => {
  const result = await query<SisterPlatformConsumerRow>(
    `
      SELECT
        sister_platform_consumer_id AS consumer_id,
        public_id,
        sister_platform_key,
        consumer_name,
        consumer_type,
        credential_status,
        token_prefix,
        hash_algorithm,
        allowed_greenhouse_scope_types,
        rate_limit_per_minute,
        rate_limit_per_hour,
        expires_at,
        last_used_at,
        notes,
        metadata_json,
        created_by_user_id,
        rotated_by_user_id,
        suspended_by_user_id,
        deprecated_by_user_id,
        suspended_at,
        deprecated_at,
        created_at,
        updated_at
      FROM greenhouse_core.sister_platform_consumers
      WHERE sister_platform_consumer_id = $1
      LIMIT 1
    `,
    [consumerId]
  )

  const row = (result as SisterPlatformConsumerRow[])[0]

  return row ? mapConsumerRow(row) : null
}

const loadConsumerByIdentity = async (sisterPlatformKey: string, consumerName: string) => {
  const result = await query<SisterPlatformConsumerRow>(
    `
      SELECT
        sister_platform_consumer_id AS consumer_id,
        public_id,
        sister_platform_key,
        consumer_name,
        consumer_type,
        credential_status,
        token_prefix,
        hash_algorithm,
        allowed_greenhouse_scope_types,
        rate_limit_per_minute,
        rate_limit_per_hour,
        expires_at,
        last_used_at,
        notes,
        metadata_json,
        created_by_user_id,
        rotated_by_user_id,
        suspended_by_user_id,
        deprecated_by_user_id,
        suspended_at,
        deprecated_at,
        created_at,
        updated_at
      FROM greenhouse_core.sister_platform_consumers
      WHERE sister_platform_key = $1
        AND lower(consumer_name) = lower($2)
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [sisterPlatformKey, consumerName]
  )

  const row = (result as SisterPlatformConsumerRow[])[0]

  return row ? mapConsumerRow(row) : null
}

const nextConsumerPublicId = async (client: TransactionClient) => {
  const result = await client.query(
    `
      SELECT
        'EO-SPK-' || LPAD(nextval('greenhouse_core.seq_sister_platform_consumer_public_id')::text, 4, '0') AS public_id
    `
  )

  const publicId = String(result.rows[0]?.public_id || '').trim()

  if (!publicId) {
    throw new SisterPlatformConsumerError('No fue posible generar public_id para el consumer.')
  }

  return publicId
}

const buildStatusFields = (credentialStatus: SisterPlatformConsumerStatus, actorUserId: string | null) => {
  const now = new Date().toISOString()

  return {
    suspendedAt: credentialStatus === 'suspended' ? now : null,
    deprecatedAt: credentialStatus === 'deprecated' ? now : null,
    suspendedByUserId: credentialStatus === 'suspended' ? actorUserId : null,
    deprecatedByUserId: credentialStatus === 'deprecated' ? actorUserId : null
  }
}

export const buildSisterPlatformConsumerTokenHash = (token: string) => createHash('sha256').update(token).digest('hex')

export const buildSisterPlatformConsumerTokenPrefix = (token: string) =>
  buildSisterPlatformConsumerTokenHash(token).slice(0, 16)

export const generateSisterPlatformConsumerToken = () => `ghspk_${randomBytes(32).toString('hex')}`

export const listSisterPlatformConsumers = async (filters?: {
  sisterPlatformKey?: string
  credentialStatus?: SisterPlatformConsumerStatus
  limit?: number
}) => {
  const values: unknown[] = []
  const conditions: string[] = []

  if (filters?.sisterPlatformKey) {
    values.push(filters.sisterPlatformKey)
    conditions.push(`sister_platform_key = $${values.length}`)
  }

  if (filters?.credentialStatus) {
    values.push(filters.credentialStatus)
    conditions.push(`credential_status = $${values.length}`)
  }

  const limit = Math.max(1, Math.min(filters?.limit ?? 100, 500))

  values.push(limit)

  const result = await query<SisterPlatformConsumerRow>(
    `
      SELECT
        sister_platform_consumer_id AS consumer_id,
        public_id,
        sister_platform_key,
        consumer_name,
        consumer_type,
        credential_status,
        token_prefix,
        hash_algorithm,
        allowed_greenhouse_scope_types,
        rate_limit_per_minute,
        rate_limit_per_hour,
        expires_at,
        last_used_at,
        notes,
        metadata_json,
        created_by_user_id,
        rotated_by_user_id,
        suspended_by_user_id,
        deprecated_by_user_id,
        suspended_at,
        deprecated_at,
        created_at,
        updated_at
      FROM greenhouse_core.sister_platform_consumers
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $${values.length}
    `,
    values
  )

  return (result as SisterPlatformConsumerRow[]).map(mapConsumerRow)
}

export const createSisterPlatformConsumer = async (input: CreateSisterPlatformConsumerInput) => {
  const sisterPlatformKey = sanitizeRequiredText(input.sisterPlatformKey, 'sisterPlatformKey').toLowerCase()
  const consumerName = sanitizeRequiredText(input.consumerName, 'consumerName')
  const consumerType = input.consumerType ?? 'sister_platform'
  const credentialStatus = input.credentialStatus ?? 'active'
  const actorUserId = sanitizeOptionalText(input.actorUserId)
  const token = sanitizeOptionalText(input.token) ?? generateSisterPlatformConsumerToken()
  const allowedGreenhouseScopeTypes = normalizeScopeTypes(input.allowedGreenhouseScopeTypes)
  const rateLimitPerMinute = normalizeLimit(input.rateLimitPerMinute, 'rateLimitPerMinute', 60)
  const rateLimitPerHour = normalizeLimit(input.rateLimitPerHour, 'rateLimitPerHour', 1000)
  const expiresAt = normalizeIsoTimestamp(input.expiresAt, 'expiresAt')
  const notes = sanitizeOptionalText(input.notes)
  const metadata = sanitizeJson(input.metadata)
  const consumerId = `spc-${randomUUID()}`

  const publicId = await withTransaction(async client => {
    const generatedPublicId = await nextConsumerPublicId(client as TransactionClient)
    const statusFields = buildStatusFields(credentialStatus, actorUserId)

    await client.query(
      `
        INSERT INTO greenhouse_core.sister_platform_consumers (
          sister_platform_consumer_id,
          public_id,
          sister_platform_key,
          consumer_name,
          consumer_type,
          credential_status,
          token_prefix,
          token_hash,
          hash_algorithm,
          allowed_greenhouse_scope_types,
          rate_limit_per_minute,
          rate_limit_per_hour,
          expires_at,
          notes,
          metadata_json,
          created_by_user_id,
          rotated_by_user_id,
          suspended_by_user_id,
          deprecated_by_user_id,
          suspended_at,
          deprecated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'sha256', $9::text[], $10, $11, $12, $13, $14::jsonb, $15, NULL, $16, $17, $18, $19
        )
      `,
      [
        consumerId,
        generatedPublicId,
        sisterPlatformKey,
        consumerName,
        consumerType,
        credentialStatus,
        buildSisterPlatformConsumerTokenPrefix(token),
        buildSisterPlatformConsumerTokenHash(token),
        allowedGreenhouseScopeTypes,
        rateLimitPerMinute,
        rateLimitPerHour,
        expiresAt,
        notes,
        JSON.stringify(metadata),
        actorUserId,
        statusFields.suspendedByUserId,
        statusFields.deprecatedByUserId,
        statusFields.suspendedAt,
        statusFields.deprecatedAt
      ]
    )

    return generatedPublicId
  })

  const createdConsumer = await loadConsumerById(consumerId)

  if (!createdConsumer || createdConsumer.publicId !== publicId) {
    throw new SisterPlatformConsumerError('No fue posible recargar el consumer recien creado.', 500)
  }

  return {
    consumer: createdConsumer,
    plainToken: token
  }
}

export const upsertSisterPlatformConsumer = async (input: UpsertSisterPlatformConsumerInput) => {
  const sisterPlatformKey = sanitizeRequiredText(input.sisterPlatformKey, 'sisterPlatformKey').toLowerCase()
  const consumerName = sanitizeRequiredText(input.consumerName, 'consumerName')
  const existing = await loadConsumerByIdentity(sisterPlatformKey, consumerName)

  if (!existing) {
    const created = await createSisterPlatformConsumer({
      ...input,
      sisterPlatformKey,
      consumerName
    })

    return {
      ...created,
      created: true,
      rotated: true
    }
  }

  const credentialStatus = input.credentialStatus ?? existing.credentialStatus
  const actorUserId = sanitizeOptionalText(input.actorUserId)
  const rotateToken = input.rotateToken === true || Boolean(sanitizeOptionalText(input.token))
  const token = rotateToken ? sanitizeOptionalText(input.token) ?? generateSisterPlatformConsumerToken() : null
  const statusFields = buildStatusFields(credentialStatus, actorUserId)

  const allowedGreenhouseScopeTypes = normalizeScopeTypes(
    input.allowedGreenhouseScopeTypes ?? existing.allowedGreenhouseScopeTypes
  )

  const rateLimitPerMinute = normalizeLimit(input.rateLimitPerMinute, 'rateLimitPerMinute', existing.rateLimitPerMinute)
  const rateLimitPerHour = normalizeLimit(input.rateLimitPerHour, 'rateLimitPerHour', existing.rateLimitPerHour)
  const expiresAt = normalizeIsoTimestamp(input.expiresAt ?? existing.expiresAt, 'expiresAt')
  const notes = input.notes === undefined ? existing.notes : sanitizeOptionalText(input.notes)
  const metadata = input.metadata === undefined ? existing.metadata : sanitizeJson(input.metadata)
  const consumerType = input.consumerType ?? existing.consumerType

  await withTransaction(async client => {
    await client.query(
      `
        UPDATE greenhouse_core.sister_platform_consumers
        SET
          consumer_type = $2,
          credential_status = $3,
          token_prefix = COALESCE($4, token_prefix),
          token_hash = COALESCE($5, token_hash),
          allowed_greenhouse_scope_types = $6::text[],
          rate_limit_per_minute = $7,
          rate_limit_per_hour = $8,
          expires_at = $9,
          notes = $10,
          metadata_json = $11::jsonb,
          rotated_by_user_id = CASE WHEN $4 IS NULL THEN rotated_by_user_id ELSE $12 END,
          suspended_by_user_id = $13,
          deprecated_by_user_id = $14,
          suspended_at = $15,
          deprecated_at = $16,
          updated_at = NOW()
        WHERE sister_platform_consumer_id = $1
      `,
      [
        existing.consumerId,
        consumerType,
        credentialStatus,
        token ? buildSisterPlatformConsumerTokenPrefix(token) : null,
        token ? buildSisterPlatformConsumerTokenHash(token) : null,
        allowedGreenhouseScopeTypes,
        rateLimitPerMinute,
        rateLimitPerHour,
        expiresAt,
        notes,
        JSON.stringify(metadata),
        token ? actorUserId : null,
        statusFields.suspendedByUserId,
        statusFields.deprecatedByUserId,
        statusFields.suspendedAt,
        statusFields.deprecatedAt
      ]
    )
  })

  const updatedConsumer = await loadConsumerById(existing.consumerId)

  if (!updatedConsumer) {
    throw new SisterPlatformConsumerError('No fue posible recargar el consumer actualizado.', 500)
  }

  return {
    consumer: updatedConsumer,
    plainToken: token,
    created: false,
    rotated: rotateToken
  }
}
