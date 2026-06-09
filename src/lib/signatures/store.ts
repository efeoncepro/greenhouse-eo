import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { SignatureRequest, SignatureRequestSigner } from './types'

type Row = Record<string, unknown>

const runQuery = async <T extends Row>(client: PoolClient | undefined, sql: string, params: unknown[]): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(sql, params)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(sql, params)
}

const toIso = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

export const SIGNATURE_REQUEST_COLUMNS = `
  signature_request_id, provider, provider_document_token, status, source_kind, source_ref,
  document_asset_id, signed_document_asset_id, audit_report_asset_id, provider_payload,
  signable_format, title, idempotency_key, sent_at, completed_at, cancelled_at, cancel_reason,
  failure_reason, last_synced_at, created_by_user_id, created_at, updated_at`

export const mapSignatureRequestRow = (row: Row): SignatureRequest => ({
  signatureRequestId: row.signature_request_id as string,
  provider: row.provider as SignatureRequest['provider'],
  providerDocumentToken: (row.provider_document_token as string | null) ?? null,
  status: row.status as SignatureRequest['status'],
  sourceKind: row.source_kind as SignatureRequest['sourceKind'],
  sourceRef: row.source_ref as string,
  documentAssetId: row.document_asset_id as string,
  signedDocumentAssetId: (row.signed_document_asset_id as string | null) ?? null,
  auditReportAssetId: (row.audit_report_asset_id as string | null) ?? null,
  signableFormat: row.signable_format as SignatureRequest['signableFormat'],
  title: (row.title as string | null) ?? null,
  idempotencyKey: (row.idempotency_key as string | null) ?? null,
  sentAt: toIso(row.sent_at),
  completedAt: toIso(row.completed_at),
  cancelledAt: toIso(row.cancelled_at),
  cancelReason: (row.cancel_reason as string | null) ?? null,
  failureReason: (row.failure_reason as string | null) ?? null,
  lastSyncedAt: toIso(row.last_synced_at),
  createdByUserId: row.created_by_user_id as string,
  createdAt: toIso(row.created_at) as string,
  updatedAt: toIso(row.updated_at) as string
})

export const mapSignatureSignerRow = (row: Row): SignatureRequestSigner => ({
  signerId: row.signer_id as string,
  signatureRequestId: row.signature_request_id as string,
  name: row.signer_name as string,
  email: (row.signer_email as string | null) ?? null,
  role: row.signer_role as SignatureRequestSigner['role'],
  orderGroup: Number(row.order_group ?? 1),
  status: row.status as SignatureRequestSigner['status'],
  providerSignerToken: (row.provider_signer_token as string | null) ?? null,
  signedAt: toIso(row.signed_at)
})

export const getSignatureRequestById = async (
  signatureRequestId: string,
  client?: PoolClient,
  forUpdate = false
): Promise<SignatureRequest | null> => {
  const rows = await runQuery(
    client,
    `SELECT ${SIGNATURE_REQUEST_COLUMNS}
     FROM greenhouse_core.signature_requests
     WHERE signature_request_id = $1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [signatureRequestId]
  )

  return rows[0] ? mapSignatureRequestRow(rows[0]) : null
}

export const getSignatureRequestByProviderToken = async (
  providerDocumentToken: string,
  client?: PoolClient,
  forUpdate = false
): Promise<SignatureRequest | null> => {
  const rows = await runQuery(
    client,
    `SELECT ${SIGNATURE_REQUEST_COLUMNS}
     FROM greenhouse_core.signature_requests
     WHERE provider_document_token = $1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [providerDocumentToken]
  )

  return rows[0] ? mapSignatureRequestRow(rows[0]) : null
}

export const getSignatureRequestByIdempotencyKey = async (
  idempotencyKey: string,
  client?: PoolClient
): Promise<SignatureRequest | null> => {
  const rows = await runQuery(
    client,
    `SELECT ${SIGNATURE_REQUEST_COLUMNS}
     FROM greenhouse_core.signature_requests
     WHERE idempotency_key = $1`,
    [idempotencyKey]
  )

  return rows[0] ? mapSignatureRequestRow(rows[0]) : null
}

export const listSignersForRequest = async (
  signatureRequestId: string,
  client?: PoolClient
): Promise<SignatureRequestSigner[]> => {
  const rows = await runQuery(
    client,
    `SELECT signer_id, signature_request_id, signer_name, signer_email, signer_role, order_group,
            status, provider_signer_token, signed_at
     FROM greenhouse_core.signature_request_signers
     WHERE signature_request_id = $1
     ORDER BY order_group ASC, created_at ASC`,
    [signatureRequestId]
  )

  return rows.map(mapSignatureSignerRow)
}
