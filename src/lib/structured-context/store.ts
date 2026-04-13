import 'server-only'

import type { PoolClient, QueryResult } from 'pg'

import { query, withTransaction } from '@/lib/db'

import {
  StructuredContextValidationError,
  getStructuredContextKindPolicy,
  validateStructuredContextDocument
} from './validation'
import type {
  CreateStructuredContextInput,
  JsonObject,
  StructuredContextLookup,
  StructuredContextQuarantineInput,
  StructuredContextRecord
} from './types'

type TransactionLike = Pick<PoolClient, 'query'>

interface ContextDocumentRow extends Record<string, unknown> {
  context_id: string
  public_id: string
  owner_aggregate_type: string
  owner_aggregate_id: string
  context_kind: string
  schema_version: string
  source_system: string
  producer_type: string
  producer_id: string | null
  organization_id: string | null
  client_id: string | null
  space_id: string | null
  data_classification: string
  access_scope: string
  retention_policy_code: string
  redaction_status: string
  contains_pii: boolean
  contains_financial_context: boolean
  content_hash: string
  idempotency_key: string | null
  current_version_number: number
  document_bytes: number
  expires_at: string | Date | null
  archived_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
  document_jsonb: JsonObject
}

const sanitizeRequiredText = (value: string, field: string) => {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${field} es obligatorio.`)
  }

  return normalized
}

const sanitizeOptionalText = (value?: string | null) => {
  if (value === undefined || value === null) return null

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : null
}

const toIsoString = (value: string | Date | null) => (value ? new Date(value).toISOString() : null)

const mapContextDocumentRow = <TDocument extends JsonObject>(
  row: ContextDocumentRow
): StructuredContextRecord<TDocument> => ({
  contextId: row.context_id,
  publicId: row.public_id,
  ownerAggregateType: row.owner_aggregate_type,
  ownerAggregateId: row.owner_aggregate_id,
  contextKind: row.context_kind as StructuredContextRecord<TDocument>['contextKind'],
  schemaVersion: row.schema_version,
  sourceSystem: row.source_system,
  producerType: row.producer_type as StructuredContextRecord<TDocument>['producerType'],
  producerId: row.producer_id,
  scope: {
    organizationId: row.organization_id,
    clientId: row.client_id,
    spaceId: row.space_id
  },
  dataClassification: row.data_classification as StructuredContextRecord<TDocument>['dataClassification'],
  accessScope: row.access_scope as StructuredContextRecord<TDocument>['accessScope'],
  retentionPolicyCode: row.retention_policy_code,
  redactionStatus: row.redaction_status as StructuredContextRecord<TDocument>['redactionStatus'],
  containsPii: row.contains_pii,
  containsFinancialContext: row.contains_financial_context,
  contentHash: row.content_hash,
  idempotencyKey: row.idempotency_key,
  currentVersionNumber: row.current_version_number,
  documentBytes: row.document_bytes,
  expiresAt: toIsoString(row.expires_at),
  archivedAt: toIsoString(row.archived_at),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
  document: row.document_jsonb as TDocument
})

const insertContextVersion = async ({
  client,
  contextId,
  versionNumber,
  schemaVersion,
  contentHash,
  document,
  documentBytes,
  changedByType,
  changedById,
  changeReason
}: {
  client: TransactionLike
  contextId: string
  versionNumber: number
  schemaVersion: string
  contentHash: string
  document: JsonObject
  documentBytes: number
  changedByType: string | null
  changedById: string | null
  changeReason: string
}) => {
  await client.query(
    `
      INSERT INTO greenhouse_context.context_document_versions (
        context_id,
        version_number,
        schema_version,
        content_hash,
        document_jsonb,
        document_bytes,
        changed_by_type,
        changed_by_id,
        change_reason
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
      ON CONFLICT (context_id, version_number) DO NOTHING
    `,
    [
      contextId,
      versionNumber,
      schemaVersion,
      contentHash,
      JSON.stringify(document),
      documentBytes,
      changedByType,
      changedById,
      changeReason
    ]
  )
}

const insertQuarantineRecord = async (input: StructuredContextQuarantineInput) => {
  const rawDocument =
    input.rawDocument && typeof input.rawDocument === 'object'
      ? JSON.stringify(input.rawDocument)
      : JSON.stringify({ value: input.rawDocument === undefined ? null : String(input.rawDocument) })

  await query(
    `
      INSERT INTO greenhouse_context.context_document_quarantine (
        owner_aggregate_type,
        owner_aggregate_id,
        context_kind,
        source_system,
        producer_type,
        producer_id,
        organization_id,
        client_id,
        space_id,
        validation_errors_jsonb,
        raw_document_jsonb,
        payload_bytes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12
      )
    `,
    [
      sanitizeOptionalText(input.ownerAggregateType ?? null),
      sanitizeOptionalText(input.ownerAggregateId ?? null),
      sanitizeOptionalText(input.contextKind ?? null),
      sanitizeOptionalText(input.sourceSystem ?? null),
      sanitizeOptionalText(input.producerType ?? null),
      sanitizeOptionalText(input.producerId ?? null),
      sanitizeOptionalText(input.scope?.organizationId ?? null),
      sanitizeOptionalText(input.scope?.clientId ?? null),
      sanitizeOptionalText(input.scope?.spaceId ?? null),
      JSON.stringify(input.errors),
      rawDocument,
      Buffer.byteLength(rawDocument, 'utf8')
    ]
  )
}

export const quarantineStructuredContextAttempt = async (input: StructuredContextQuarantineInput) => {
  await insertQuarantineRecord(input)
}

const loadExistingByIdempotency = async <TDocument extends JsonObject>({
  client,
  ownerAggregateType,
  ownerAggregateId,
  contextKind,
  idempotencyKey
}: {
  client: TransactionLike
  ownerAggregateType: string
  ownerAggregateId: string
  contextKind: string
  idempotencyKey: string
}) => {
  const result = await client.query(
    `
      SELECT *
      FROM greenhouse_context.context_documents
      WHERE owner_aggregate_type = $1
        AND owner_aggregate_id = $2
        AND context_kind = $3
        AND idempotency_key = $4
        AND archived_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [ownerAggregateType, ownerAggregateId, contextKind, idempotencyKey]
  ) as QueryResult<ContextDocumentRow>

  return result.rows[0] ? mapContextDocumentRow<TDocument>(result.rows[0]) : null
}

export const createStructuredContext = async <TDocument extends JsonObject>(
  input: CreateStructuredContextInput<TDocument>
): Promise<StructuredContextRecord<TDocument>> => {
  const ownerAggregateType = sanitizeRequiredText(input.ownerAggregateType, 'ownerAggregateType')
  const ownerAggregateId = sanitizeRequiredText(input.ownerAggregateId, 'ownerAggregateId')
  const schemaVersion = sanitizeOptionalText(input.schemaVersion) ?? 'v1'
  const sourceSystem = sanitizeRequiredText(input.sourceSystem, 'sourceSystem')
  const producerId = sanitizeOptionalText(input.producerId)
  const idempotencyKey = sanitizeOptionalText(input.idempotencyKey)
  const createdByType = sanitizeOptionalText(input.createdBy?.type ?? input.producerType)
  const createdById = sanitizeOptionalText(input.createdBy?.id ?? input.producerId ?? null)
  const updatedByType = sanitizeOptionalText(input.updatedBy?.type ?? input.producerType)
  const updatedById = sanitizeOptionalText(input.updatedBy?.id ?? input.producerId ?? null)

  const scope = {
    organizationId: sanitizeOptionalText(input.scope?.organizationId ?? null),
    clientId: sanitizeOptionalText(input.scope?.clientId ?? null),
    spaceId: sanitizeOptionalText(input.scope?.spaceId ?? null)
  }

  const policy = getStructuredContextKindPolicy(input.contextKind)

  if (input.containsSecrets === true) {
    throw new StructuredContextValidationError(['Structured Context Layer no acepta secretos ni credenciales.'])
  }

  const validation = validateStructuredContextDocument<TDocument>(input.contextKind, input.document)

  if (!validation.ok || !validation.normalizedDocument || !validation.contentHash || validation.documentBytes === undefined) {
    const errors = validation.errors.length > 0 ? validation.errors : ['Documento inválido para Structured Context Layer.']

    await insertQuarantineRecord({
      ownerAggregateType,
      ownerAggregateId,
      contextKind: input.contextKind,
      sourceSystem,
      producerType: input.producerType,
      producerId,
      scope,
      rawDocument: input.document,
      errors
    })

    throw new StructuredContextValidationError(errors)
  }

  const validatedDocument = validation.normalizedDocument
  const validatedContentHash = validation.contentHash
  const validatedDocumentBytes = validation.documentBytes

  return withTransaction(async client => {
    if (idempotencyKey) {
      const existing = await loadExistingByIdempotency<TDocument>({
        client,
        ownerAggregateType,
        ownerAggregateId,
        contextKind: input.contextKind,
        idempotencyKey
      })

      if (existing) {
        return existing
      }
    }

    const result = await client.query(
      `
        INSERT INTO greenhouse_context.context_documents (
          owner_aggregate_type,
          owner_aggregate_id,
          context_kind,
          schema_version,
          source_system,
          producer_type,
          producer_id,
          organization_id,
          client_id,
          space_id,
          data_classification,
          access_scope,
          retention_policy_code,
          redaction_status,
          contains_pii,
          contains_financial_context,
          content_hash,
          idempotency_key,
          document_jsonb,
          document_bytes,
          expires_at,
          created_by_type,
          created_by_id,
          updated_by_type,
          updated_by_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18,
          $19::jsonb, $20, $21, $22, $23, $24, $25
        )
        RETURNING *
      `,
      [
        ownerAggregateType,
        ownerAggregateId,
        input.contextKind,
        schemaVersion,
        sourceSystem,
        input.producerType,
        producerId,
        scope.organizationId,
        scope.clientId,
        scope.spaceId,
        input.dataClassification ?? policy.defaultDataClassification,
        input.accessScope ?? policy.defaultAccessScope,
        sanitizeOptionalText(input.retentionPolicyCode) ?? policy.defaultRetentionPolicyCode,
        input.redactionStatus ?? 'not_needed',
        input.containsPii === true,
        input.containsFinancialContext === true,
        validatedContentHash,
        idempotencyKey,
        JSON.stringify(validatedDocument),
        validatedDocumentBytes,
        sanitizeOptionalText(input.expiresAt) ?? null,
        createdByType,
        createdById,
        updatedByType,
        updatedById
      ]
    ) as QueryResult<ContextDocumentRow>

    const created = result.rows[0]

    await insertContextVersion({
      client,
      contextId: created.context_id,
      versionNumber: created.current_version_number,
      schemaVersion,
      contentHash: validatedContentHash,
      document: validatedDocument,
      documentBytes: validatedDocumentBytes,
      changedByType: updatedByType,
      changedById: updatedById,
      changeReason: 'initial_insert'
    })

    return mapContextDocumentRow<TDocument>(created)
  })
}

export const getStructuredContextByOwner = async <TDocument extends JsonObject>(
  lookup: StructuredContextLookup
) => {
  const ownerAggregateType = sanitizeRequiredText(lookup.ownerAggregateType, 'ownerAggregateType')
  const ownerAggregateId = sanitizeRequiredText(lookup.ownerAggregateId, 'ownerAggregateId')
  const params: unknown[] = [ownerAggregateType, ownerAggregateId]
  const filters = ['owner_aggregate_type = $1', 'owner_aggregate_id = $2']

  if (lookup.contextKind) {
    params.push(lookup.contextKind)
    filters.push(`context_kind = $${params.length}`)
  }

  if (lookup.includeArchived !== true) {
    filters.push('archived_at IS NULL')
  }

  const limit = lookup.limit && lookup.limit > 0 ? Math.min(lookup.limit, 100) : 20

  params.push(limit)

  const rows = await query<ContextDocumentRow>(
    `
      SELECT *
      FROM greenhouse_context.context_documents
      WHERE ${filters.join('\n        AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
    params
  )

  return rows.map(row => mapContextDocumentRow<TDocument>(row))
}

export const getLatestStructuredContextByOwner = async <TDocument extends JsonObject>(
  lookup: StructuredContextLookup
) => {
  const rows = await getStructuredContextByOwner<TDocument>({
    ...lookup,
    limit: 1
  })

  return rows[0] ?? null
}
