import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { ROLE_CODES } from '@/config/role-codes'
import { hasRoleCode, hasRouteGroup } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { deleteGreenhouseStorageObject, downloadGreenhouseStorageObject, uploadGreenhouseStorageObject } from './greenhouse-media'
import { normalizeGreenhouseAssetOwnershipScope } from './greenhouse-assets-shared'
import type {
  GreenhouseAssetContext,
  GreenhouseAssetRecord,
  GreenhouseAssetRetentionClass,
  GreenhouseAssetStatus,
} from '@/types/assets'

type AssetRow = {
  asset_id: string
  public_id: string
  visibility: string
  status: string
  bucket_name: string
  object_path: string
  filename: string
  mime_type: string
  size_bytes: number | string
  retention_class: string
  owner_aggregate_type: string
  owner_aggregate_id: string | null
  owner_client_id: string | null
  owner_space_id: string | null
  owner_member_id: string | null
  uploaded_by_user_id: string | null
  attached_by_user_id: string | null
  deleted_by_user_id: string | null
  upload_source: string
  download_count: number | string | null
  metadata_json: Record<string, unknown> | null
  created_at: string | null
  uploaded_at: string | null
  attached_at: string | null
  deleted_at: string | null
  last_downloaded_at: string | null
}

const PRIVATE_USER_ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const SYSTEM_ALLOWED_MIME_TYPES = new Set([...PRIVATE_USER_ALLOWED_MIME_TYPES, 'text/csv', 'text/csv; charset=utf-8'])

const MAX_PRIVATE_UPLOAD_BYTES_BY_CONTEXT: Record<Extract<GreenhouseAssetContext, 'leave_request_draft' | 'purchase_order_draft' | 'certification_draft'>, number> = {
  leave_request_draft: 10 * 1024 * 1024,
  purchase_order_draft: 10 * 1024 * 1024,
  certification_draft: 10 * 1024 * 1024
}

const CONTEXT_RETENTION_CLASS: Record<GreenhouseAssetContext, GreenhouseAssetRetentionClass> = {
  leave_request_draft: 'hr_leave',
  leave_request: 'hr_leave',
  purchase_order_draft: 'finance_purchase_order',
  purchase_order: 'finance_purchase_order',
  payroll_receipt: 'payroll_receipt',
  payroll_export_pdf: 'payroll_export',
  payroll_export_csv: 'payroll_export',
  certification_draft: 'hr_certification',
  certification: 'hr_certification'
}

const CONTEXT_PREFIX: Record<GreenhouseAssetContext, string> = {
  leave_request_draft: 'leave',
  leave_request: 'leave',
  purchase_order_draft: 'purchase-orders',
  purchase_order: 'purchase-orders',
  payroll_receipt: 'payroll-receipts',
  payroll_export_pdf: 'payroll-export-packages',
  payroll_export_csv: 'payroll-export-packages',
  certification_draft: 'certifications',
  certification: 'certifications'
}

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeNullableString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  return normalized ? normalized : null
}

const normalizeRecord = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

const normalizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

const inferExtension = (fileName: string, contentType: string) => {
  const normalized = normalizeFileName(fileName)
  const explicitExtension = normalized.split('.').pop()

  if (explicitExtension && explicitExtension !== normalized) {
    return explicitExtension.toLowerCase()
  }

  switch (contentType) {
    case 'application/pdf':
      return 'pdf'
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'text/csv':
    case 'text/csv; charset=utf-8':
      return 'csv'
    default:
      return 'bin'
  }
}

const buildAssetId = () => `asset-${randomUUID()}`
const buildAssetPublicId = () => `EO-AST-${randomUUID().slice(0, 8).toUpperCase()}`

type QueryableClient = Pick<PoolClient, 'query'>

const getStorageEnvironmentSuffix = () => {
  const explicit = process.env.GREENHOUSE_STORAGE_ENV?.trim().toLowerCase()

  if (explicit === 'prod' || explicit === 'staging' || explicit === 'dev') {
    return explicit
  }

  const branch = process.env.VERCEL_GIT_COMMIT_REF?.trim().toLowerCase()
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase()

  if (vercelEnv === 'production' || branch === 'main') {
    return 'prod'
  }

  if (branch === 'develop') {
    return 'staging'
  }

  return 'dev'
}

export const getGreenhousePublicMediaBucket = () =>
  process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET?.trim() ||
  `${getBigQueryProjectId()}-greenhouse-public-media-${getStorageEnvironmentSuffix()}`

export const getGreenhousePrivateAssetsBucket = () =>
  process.env.GREENHOUSE_PRIVATE_ASSETS_BUCKET?.trim() ||
  `${getBigQueryProjectId()}-greenhouse-private-assets-${getStorageEnvironmentSuffix()}`

export const buildPrivateAssetDownloadUrl = (assetId: string) => `/api/assets/private/${encodeURIComponent(assetId)}`

const queryAssetRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const writeAssetAccessLog = async ({
  assetId,
  action,
  actorUserId,
  metadata,
  client
}: {
  assetId: string
  action: 'upload' | 'attach' | 'delete' | 'download'
  actorUserId: string | null
  metadata?: Record<string, unknown>
  client?: QueryableClient
}) => {
  await queryAssetRows(
    `
      INSERT INTO greenhouse_core.asset_access_log (
        access_log_id,
        asset_id,
        action,
        actor_user_id,
        occurred_at,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5::jsonb)
    `,
    [`asset-access-${randomUUID()}`, assetId, action, actorUserId, JSON.stringify(metadata || {})],
    client
  )
}

const mapAssetRow = (row: AssetRow): GreenhouseAssetRecord => ({
  assetId: row.asset_id,
  publicId: row.public_id,
  visibility: row.visibility === 'public' ? 'public' : 'private',
  status: (['attached', 'orphaned', 'deleted'].includes(row.status) ? row.status : 'pending') as GreenhouseAssetStatus,
  bucketName: row.bucket_name,
  objectPath: row.object_path,
  filename: row.filename,
  mimeType: row.mime_type,
  sizeBytes: toNumber(row.size_bytes),
  retentionClass: row.retention_class as GreenhouseAssetRetentionClass,
  ownerAggregateType: row.owner_aggregate_type as GreenhouseAssetContext,
  ownerAggregateId: normalizeNullableString(row.owner_aggregate_id),
  ownerClientId: normalizeNullableString(row.owner_client_id),
  ownerSpaceId: normalizeNullableString(row.owner_space_id),
  ownerMemberId: normalizeNullableString(row.owner_member_id),
  uploadedByUserId: normalizeNullableString(row.uploaded_by_user_id),
  attachedByUserId: normalizeNullableString(row.attached_by_user_id),
  deletedByUserId: normalizeNullableString(row.deleted_by_user_id),
  uploadSource: row.upload_source === 'system' ? 'system' : 'user',
  downloadCount: toNumber(row.download_count),
  metadata: normalizeRecord(row.metadata_json),
  createdAt: normalizeNullableString(row.created_at),
  uploadedAt: normalizeNullableString(row.uploaded_at),
  attachedAt: normalizeNullableString(row.attached_at),
  deletedAt: normalizeNullableString(row.deleted_at),
  lastDownloadedAt: normalizeNullableString(row.last_downloaded_at)
})

const assertPrivateAssetUpload = ({
  contextType,
  contentType,
  sizeBytes
}: {
  contextType: Extract<GreenhouseAssetContext, 'leave_request_draft' | 'purchase_order_draft' | 'certification_draft'>
  contentType: string
  sizeBytes: number
}) => {
  if (!PRIVATE_USER_ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error('unsupported_type')
  }

  if (sizeBytes > MAX_PRIVATE_UPLOAD_BYTES_BY_CONTEXT[contextType]) {
    throw new Error('file_too_large')
  }
}

export const getAssetById = async (assetId: string, client?: QueryableClient): Promise<GreenhouseAssetRecord | null> => {
  const rows = await queryAssetRows<AssetRow>(
    `
      SELECT *
      FROM greenhouse_core.assets
      WHERE asset_id = $1
      LIMIT 1
    `,
    [assetId],
    client
  )

  return rows[0] ? mapAssetRow(rows[0]) : null
}

const buildObjectPath = ({
  contextType,
  assetId,
  fileName
}: {
  contextType: GreenhouseAssetContext
  assetId: string
  fileName: string
}) => {
  const safeName = normalizeFileName(fileName) || assetId
  const extension = inferExtension(safeName, 'application/octet-stream')

  return `${CONTEXT_PREFIX[contextType]}/${assetId}/${Date.now()}-${safeName.endsWith(`.${extension}`) ? safeName : `${safeName}.${extension}`}`
}

const buildMetadataJson = ({
  originalFileName,
  extra
}: {
  originalFileName: string
  extra?: Record<string, unknown>
}) => ({
  originalFileName,
  ...(extra || {})
})

export const createPrivatePendingAsset = async ({
  contextType,
  uploadedByUserId,
  fileName,
  contentType,
  bytes,
  ownerClientId,
  ownerSpaceId,
  ownerMemberId,
  metadata
}: {
  contextType: Extract<GreenhouseAssetContext, 'leave_request_draft' | 'purchase_order_draft' | 'certification_draft'>
  uploadedByUserId: string
  fileName: string
  contentType: string
  bytes: ArrayBuffer | Uint8Array | Buffer
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
  metadata?: Record<string, unknown>
}) => {
  const ownershipScope = normalizeGreenhouseAssetOwnershipScope({
    ownerClientId,
    ownerSpaceId,
    ownerMemberId
  })

  const sizeBytes = bytes instanceof ArrayBuffer ? bytes.byteLength : bytes.byteLength

  assertPrivateAssetUpload({
    contextType,
    contentType,
    sizeBytes
  })

  const assetId = buildAssetId()
  const publicId = buildAssetPublicId()
  const bucketName = getGreenhousePrivateAssetsBucket()

  const objectPath = buildObjectPath({
    contextType,
    assetId,
    fileName: `${normalizeFileName(fileName) || assetId}.${inferExtension(fileName, contentType)}`
  })

  await uploadGreenhouseStorageObject({
    bucketName,
    objectName: objectPath,
    contentType,
    bytes,
    cacheControl: 'private, max-age=0, no-store'
  })

  const rows = await runGreenhousePostgresQuery<AssetRow>(
    `
      INSERT INTO greenhouse_core.assets (
        asset_id,
        public_id,
        visibility,
        status,
        bucket_name,
        object_path,
        filename,
        mime_type,
        size_bytes,
        retention_class,
        owner_aggregate_type,
        owner_aggregate_id,
        owner_client_id,
        owner_space_id,
        owner_member_id,
        uploaded_by_user_id,
        upload_source,
        metadata_json,
        created_at,
        uploaded_at
      )
      VALUES (
        $1, $2, 'private', 'pending', $3, $4, $5, $6, $7, $8, $9, NULL,
        $10, $11, $12, $13, 'user', $14::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `,
    [
      assetId,
      publicId,
      bucketName,
      objectPath,
      fileName,
      contentType,
      sizeBytes,
      CONTEXT_RETENTION_CLASS[contextType],
      contextType,
      ownershipScope.ownerClientId,
      ownershipScope.ownerSpaceId,
      ownershipScope.ownerMemberId,
      uploadedByUserId,
      JSON.stringify(buildMetadataJson({ originalFileName: fileName, extra: metadata }))
    ]
  )

  const asset = mapAssetRow(rows[0])

  await writeAssetAccessLog({
    assetId: asset.assetId,
    action: 'upload',
    actorUserId: uploadedByUserId,
    metadata: {
      ownerAggregateType: asset.ownerAggregateType,
      ownerClientId: asset.ownerClientId,
      ownerSpaceId: asset.ownerSpaceId,
      ownerMemberId: asset.ownerMemberId
    }
  })

  await publishOutboxEvent({
    aggregateType: 'asset',
    aggregateId: asset.assetId,
    eventType: 'asset.uploaded',
    payload: {
      assetId: asset.assetId,
      publicId: asset.publicId,
      visibility: asset.visibility,
      ownerAggregateType: asset.ownerAggregateType,
      ownerClientId: asset.ownerClientId,
      ownerSpaceId: asset.ownerSpaceId,
      ownerMemberId: asset.ownerMemberId,
      uploadedByUserId
    }
  })

  return asset
}

export const attachAssetToAggregate = async ({
  assetId,
  ownerAggregateType,
  ownerAggregateId,
  actorUserId,
  ownerClientId,
  ownerSpaceId,
  ownerMemberId,
  metadata,
  client
}: {
  assetId: string
  ownerAggregateType: Exclude<GreenhouseAssetContext, 'leave_request_draft' | 'purchase_order_draft'>
  ownerAggregateId: string
  actorUserId: string
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
  metadata?: Record<string, unknown>
  client?: QueryableClient
}) => {
  const ownershipScope = normalizeGreenhouseAssetOwnershipScope({
    ownerClientId,
    ownerSpaceId,
    ownerMemberId
  })

  const rows = await queryAssetRows<AssetRow>(
    `
      UPDATE greenhouse_core.assets
      SET
        status = 'attached',
        owner_aggregate_type = $2,
        owner_aggregate_id = $3,
        owner_client_id = COALESCE($4, owner_client_id),
        owner_space_id = COALESCE($5, owner_space_id),
        owner_member_id = COALESCE($6, owner_member_id),
        attached_by_user_id = $7,
        attached_at = CURRENT_TIMESTAMP,
        metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $8::jsonb
      WHERE asset_id = $1
        AND status <> 'deleted'
      RETURNING *
    `,
    [
      assetId,
      ownerAggregateType,
      ownerAggregateId,
      ownershipScope.ownerClientId,
      ownershipScope.ownerSpaceId,
      ownershipScope.ownerMemberId,
      actorUserId,
      JSON.stringify(metadata || {})
    ],
    client
  )

  if (!rows[0]) {
    throw new Error('asset_not_found')
  }

  const asset = mapAssetRow(rows[0])

  await writeAssetAccessLog({
    assetId: asset.assetId,
    action: 'attach',
    actorUserId,
    metadata: {
      ownerAggregateType,
      ownerAggregateId,
      ownerClientId: asset.ownerClientId,
      ownerSpaceId: asset.ownerSpaceId,
      ownerMemberId: asset.ownerMemberId
    },
    client
  })

  await publishOutboxEvent({
    aggregateType: 'asset',
    aggregateId: asset.assetId,
    eventType: 'asset.attached',
    payload: {
      assetId: asset.assetId,
      ownerAggregateType,
      ownerAggregateId,
      ownerClientId: asset.ownerClientId,
      ownerSpaceId: asset.ownerSpaceId,
      ownerMemberId: asset.ownerMemberId,
      actorUserId
    }
  }, client)

  return asset
}

export const upsertSystemGeneratedAsset = async ({
  assetId,
  ownerAggregateType,
  ownerAggregateId,
  ownerClientId,
  ownerSpaceId,
  ownerMemberId,
  bucketName,
  objectPath,
  fileName,
  mimeType,
  sizeBytes,
  actorUserId,
  metadata
}: {
  assetId?: string | null
  ownerAggregateType: Extract<GreenhouseAssetContext, 'payroll_receipt' | 'payroll_export_pdf' | 'payroll_export_csv'>
  ownerAggregateId: string
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
  bucketName: string
  objectPath: string
  fileName: string
  mimeType: string
  sizeBytes: number
  actorUserId?: string | null
  metadata?: Record<string, unknown>
}) => {
  const ownershipScope = normalizeGreenhouseAssetOwnershipScope({
    ownerClientId,
    ownerSpaceId,
    ownerMemberId
  })

  if (!SYSTEM_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('unsupported_system_asset_type')
  }

  const nextAssetId = assetId || buildAssetId()

  const rows = await runGreenhousePostgresQuery<AssetRow>(
    `
      INSERT INTO greenhouse_core.assets (
        asset_id,
        public_id,
        visibility,
        status,
        bucket_name,
        object_path,
        filename,
        mime_type,
        size_bytes,
        retention_class,
        owner_aggregate_type,
        owner_aggregate_id,
        owner_client_id,
        owner_space_id,
        owner_member_id,
        uploaded_by_user_id,
        attached_by_user_id,
        upload_source,
        metadata_json,
        created_at,
        uploaded_at,
        attached_at
      )
      VALUES (
        $1, $2, 'private', 'attached', $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $14, 'system', $15::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (asset_id) DO UPDATE SET
        status = 'attached',
        bucket_name = EXCLUDED.bucket_name,
        object_path = EXCLUDED.object_path,
        filename = EXCLUDED.filename,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        retention_class = EXCLUDED.retention_class,
        owner_aggregate_type = EXCLUDED.owner_aggregate_type,
        owner_aggregate_id = EXCLUDED.owner_aggregate_id,
        owner_client_id = EXCLUDED.owner_client_id,
        owner_space_id = EXCLUDED.owner_space_id,
        owner_member_id = EXCLUDED.owner_member_id,
        attached_by_user_id = EXCLUDED.attached_by_user_id,
        metadata_json = EXCLUDED.metadata_json,
        uploaded_at = CURRENT_TIMESTAMP,
        attached_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      nextAssetId,
      buildAssetPublicId(),
      bucketName,
      objectPath,
      fileName,
      mimeType,
      sizeBytes,
      CONTEXT_RETENTION_CLASS[ownerAggregateType],
      ownerAggregateType,
      ownerAggregateId,
      ownershipScope.ownerClientId,
      ownershipScope.ownerSpaceId,
      ownershipScope.ownerMemberId,
      actorUserId ?? null,
      JSON.stringify(buildMetadataJson({ originalFileName: fileName, extra: metadata }))
    ]
  )

  return mapAssetRow(rows[0])
}

const canAccessLeaveAsset = (tenant: TenantContext, asset: GreenhouseAssetRecord) => {
  if (asset.ownerMemberId && tenant.memberId && asset.ownerMemberId === tenant.memberId) {
    return true
  }

  return hasRouteGroup(tenant, 'hr') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)
}

const canAccessPurchaseOrderAsset = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'finance') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

const canAccessPayrollReceiptAsset = (tenant: TenantContext, asset: GreenhouseAssetRecord) => {
  if (asset.ownerMemberId && tenant.memberId && asset.ownerMemberId === tenant.memberId) {
    return true
  }

  return hasRouteGroup(tenant, 'hr') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)
}

const canAccessPayrollExportAsset = (tenant: TenantContext) =>
  hasRouteGroup(tenant, 'hr') || hasRouteGroup(tenant, 'finance') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

const canAccessCertificationAsset = (tenant: TenantContext, asset: GreenhouseAssetRecord) => {
  if (asset.ownerMemberId && tenant.memberId && asset.ownerMemberId === tenant.memberId) {
    return true
  }

  return hasRouteGroup(tenant, 'hr') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)
}

export const canTenantAccessAsset = ({
  tenant,
  asset
}: {
  tenant: TenantContext
  asset: GreenhouseAssetRecord
}) => {
  switch (asset.ownerAggregateType) {
    case 'leave_request_draft':
    case 'leave_request':
      return canAccessLeaveAsset(tenant, asset)
    case 'purchase_order_draft':
    case 'purchase_order':
      return canAccessPurchaseOrderAsset(tenant)
    case 'payroll_receipt':
      return canAccessPayrollReceiptAsset(tenant, asset)
    case 'payroll_export_pdf':
    case 'payroll_export_csv':
      return canAccessPayrollExportAsset(tenant)
    case 'certification_draft':
    case 'certification':
      return canAccessCertificationAsset(tenant, asset)
    default:
      return false
  }
}

export const deletePendingAsset = async ({
  assetId,
  actorUserId
}: {
  assetId: string
  actorUserId: string
}) => {
  const asset = await getAssetById(assetId)

  if (!asset) {
    throw new Error('asset_not_found')
  }

  if (asset.status !== 'pending') {
    throw new Error('asset_not_pending')
  }

  if (asset.uploadedByUserId !== actorUserId) {
    throw new Error('forbidden')
  }

  await deleteGreenhouseStorageObject({
    bucketName: asset.bucketName,
    objectName: asset.objectPath
  })

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_core.assets
      SET
        status = 'deleted',
        deleted_by_user_id = $2,
        deleted_at = CURRENT_TIMESTAMP
      WHERE asset_id = $1
    `,
    [assetId, actorUserId]
  )

  await writeAssetAccessLog({
    assetId,
    action: 'delete',
    actorUserId,
    metadata: {
      ownerAggregateType: asset.ownerAggregateType,
      ownerAggregateId: asset.ownerAggregateId
    }
  })

  await publishOutboxEvent({
    aggregateType: 'asset',
    aggregateId: assetId,
    eventType: 'asset.deleted',
    payload: {
      assetId,
      actorUserId
    }
  })
}

export const downloadPrivateAsset = async ({
  assetId,
  actorUserId
}: {
  assetId: string
  actorUserId: string
}) => {
  const asset = await getAssetById(assetId)

  if (!asset || asset.status === 'deleted') {
    throw new Error('asset_not_found')
  }

  const file = await downloadGreenhouseStorageObject({
    bucketName: asset.bucketName,
    objectName: asset.objectPath
  })

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_core.assets
      SET
        download_count = COALESCE(download_count, 0) + 1,
        last_downloaded_at = CURRENT_TIMESTAMP
      WHERE asset_id = $1
    `,
    [assetId]
  )

  await writeAssetAccessLog({
    assetId,
    action: 'download',
    actorUserId,
    metadata: {
      ownerAggregateType: asset.ownerAggregateType,
      ownerAggregateId: asset.ownerAggregateId
    }
  })

  await publishOutboxEvent({
    aggregateType: 'asset',
    aggregateId: assetId,
    eventType: 'asset.downloaded',
    payload: {
      assetId,
      actorUserId,
      ownerAggregateType: asset.ownerAggregateType,
      ownerAggregateId: asset.ownerAggregateId
    }
  })

  return {
    asset,
    file
  }
}
