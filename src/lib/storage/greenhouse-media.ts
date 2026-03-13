import 'server-only'

import { GoogleAuth } from 'google-auth-library'

import { getGoogleCredentials, getBigQueryProjectId } from '@/lib/bigquery'

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
  new GoogleAuth({
    projectId: getBigQueryProjectId(),
    credentials: getGoogleCredentials(),
    scopes: [STORAGE_SCOPE]
  })

const getAccessToken = async () => {
  const auth = getStorageAuth()
  const token = await auth.getAccessToken()

  if (!token) {
    throw new Error('Unable to obtain Google Cloud access token for media upload')
  }

  return token
}

export const getGreenhouseMediaBucket = () =>
  process.env.GREENHOUSE_MEDIA_BUCKET?.trim() || `${getBigQueryProjectId()}-greenhouse-media`

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
  const bucket = getGreenhouseMediaBucket()
  const extension = inferExtension(contentType, fileName)
  const objectName = `${entityFolder}/${entityId}/${kind}-${Date.now()}.${extension}`
  const token = await getAccessToken()
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    },
    body: bytes
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(`upload_failed:${response.status}:${errorText}`)
  }

  return `gs://${bucket}/${objectName}`
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

  const token = await getAccessToken()
  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(parsed.bucket)}/o/${encodeURIComponent(parsed.objectName)}?alt=media`

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

export const greenhouseMediaMaxBytes = MAX_MEDIA_BYTES
