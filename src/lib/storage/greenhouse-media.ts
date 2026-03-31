import 'server-only'

import { GoogleAuth } from 'google-auth-library'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { getGoogleAuthOptions } from '@/lib/google-credentials'

const STORAGE_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_write'
const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const
const MAX_MEDIA_BYTES = 5 * 1024 * 1024

const normalizeFileName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

const inferExtension = (contentType: string, fileName: string) => {
  const normalizedName = normalizeFileName(fileName)
  const explicitExtension = normalizedName.split('.').pop()

  if (explicitExtension && explicitExtension !== normalizedName) {
    return explicitExtension
  }

  switch (contentType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}

const getStorageAuth = () =>
  new GoogleAuth(
    getGoogleAuthOptions({
      scopes: [STORAGE_SCOPE]
    })
  )

const getAccessToken = async () => {
  const auth = getStorageAuth()
  const token = await auth.getAccessToken()

  if (!token) {
    throw new Error('Unable to obtain Google Cloud access token for media upload')
  }

  return token
}

export const getGreenhouseMediaBucket = () =>
  process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET?.trim() ||
  process.env.GREENHOUSE_MEDIA_BUCKET?.trim() ||
  `${getBigQueryProjectId()}-greenhouse-media`

export const isSupportedImageType = (contentType: string) =>
  IMAGE_CONTENT_TYPES.includes(contentType as (typeof IMAGE_CONTENT_TYPES)[number])

export const assertSupportedImageFile = ({ contentType, size }: { contentType: string; size: number }) => {
  if (!isSupportedImageType(contentType)) {
    throw new Error('unsupported_type')
  }

  if (size > MAX_MEDIA_BYTES) {
    throw new Error('file_too_large')
  }
}

export const uploadGreenhouseStorageObject = async ({
  bucketName,
  objectName,
  contentType,
  bytes,
  cacheControl
}: {
  bucketName?: string
  objectName: string
  contentType: string
  bytes: ArrayBuffer | Uint8Array | Buffer
  cacheControl?: string
}) => {
  const bucket = bucketName?.trim() || getGreenhouseMediaBucket()
  const token = await getAccessToken()
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      ...(cacheControl ? { 'Cache-Control': cacheControl } : {})
    },
    body: bytes as unknown as BodyInit
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(`upload_failed:${response.status}:${errorText}`)
  }

  return `gs://${bucket}/${objectName}`
}

export const downloadGreenhouseStorageObject = async ({
  bucketName,
  objectName
}: {
  bucketName: string
  objectName: string
}) => {
  const token = await getAccessToken()
  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}?alt=media`

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(`download_failed:${response.status}:${errorText}`)
  }

  return {
    arrayBuffer: await response.arrayBuffer(),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    cacheControl: response.headers.get('cache-control') || 'private, max-age=0, must-revalidate'
  }
}

export const deleteGreenhouseStorageObject = async ({
  bucketName,
  objectName
}: {
  bucketName: string
  objectName: string
}) => {
  const token = await getAccessToken()
  const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`

  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text().catch(() => '')

    throw new Error(`delete_failed:${response.status}:${errorText}`)
  }
}

export const uploadGreenhouseMediaAsset = async ({
  entityFolder,
  entityId,
  kind,
  fileName,
  contentType,
  bytes
}: {
  entityFolder: 'users' | 'tenants'
  entityId: string
  kind: 'avatar' | 'logo'
  fileName: string
  contentType: string
  bytes: ArrayBuffer
}) => {
  const extension = inferExtension(contentType, fileName)
  const objectName = `${entityFolder}/${entityId}/${kind}-${Date.now()}.${extension}`

  return uploadGreenhouseStorageObject({
    objectName,
    contentType,
    bytes,
    cacheControl: 'public, max-age=31536000, immutable'
  })
}

export const parseGsAssetPath = (value: string) => {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(value.trim())

  if (!match) {
    return null
  }

  return {
    bucket: match[1],
    objectName: match[2]
  }
}

export const downloadGreenhouseMediaAsset = async (assetPath: string) => {
  const parsed = parseGsAssetPath(assetPath)

  if (!parsed) {
    throw new Error('invalid_asset_path')
  }

  return downloadGreenhouseStorageObject({
    bucketName: parsed.bucket,
    objectName: parsed.objectName
  })
}

export const greenhouseMediaMaxBytes = MAX_MEDIA_BYTES
