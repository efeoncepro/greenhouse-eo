import 'server-only'

import { randomUUID } from 'node:crypto'

import { PNG } from 'pngjs'

import { query } from '@/lib/db'
import {
  createOrganizationLogoCandidate,
  OrganizationBrandAssetError,
  type OrganizationBrandAssetCandidateSource
} from '@/lib/account-360/organization-brand-assets'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_HTML_BYTES = 1024 * 1024
const DISCOVERY_USER_ID = 'ops-worker:organization-brand-assets'
const SUPPORTED_RASTER_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const ICO_MIME_TYPES = new Set(['image/x-icon', 'image/vnd.microsoft.icon', 'image/icon'])

type DiscoveryOrgRow = {
  organization_id: string
  public_id: string | null
  organization_name: string
  website_url: string | null
}

export type OrganizationBrandAssetDiscoveryResult = {
  scanned: number
  created: number
  skipped: number
  failed: number
  details: Array<{
    organizationId: string
    organizationName?: string
    status: 'created' | 'skipped' | 'failed'
    sourceUrl?: string
    candidateId?: string
    reason?: string
  }>
}

const extensionForMimeType = (mimeType: string) => {
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'

  return 'jpg'
}

const normalizeWebsiteUrl = (value: string | null | undefined) => {
  const raw = value?.trim()

  if (!raw) return null

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const url = new URL(withProtocol)

    if (!['http:', 'https:'].includes(url.protocol)) return null

    return url
  } catch {
    return null
  }
}

const extractAttr = (tag: string, attr: string) => {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'))

  return match?.[1]?.trim() || null
}

const isIcoBuffer = (bytes: Buffer) =>
  bytes.byteLength >= 6 && bytes.readUInt16LE(0) === 0 && bytes.readUInt16LE(2) === 1 && bytes.readUInt16LE(4) > 0

const convertIcoToPng = (bytes: Buffer) => {
  if (!isIcoBuffer(bytes)) {
    throw new Error('unsupported_ico_format')
  }

  const imageCount = bytes.readUInt16LE(4)
  let selected: { width: number; height: number; bitCount: number; size: number; offset: number } | null = null

  for (let index = 0; index < imageCount; index += 1) {
    const entryOffset = 6 + index * 16
    const width = bytes[entryOffset] || 256
    const height = bytes[entryOffset + 1] || 256
    const bitCount = bytes.readUInt16LE(entryOffset + 6)
    const size = bytes.readUInt32LE(entryOffset + 8)
    const offset = bytes.readUInt32LE(entryOffset + 12)

    if (offset <= 0 || size <= 0 || offset + size > bytes.byteLength) continue

    const score = width * height * Math.max(bitCount, 1)
    const selectedScore = selected ? selected.width * selected.height * Math.max(selected.bitCount, 1) : -1

    if (score > selectedScore) {
      selected = { width, height, bitCount, size, offset }
    }
  }

  if (!selected) {
    throw new Error('unsupported_ico_format')
  }

  const image = bytes.subarray(selected.offset, selected.offset + selected.size)

  if (image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return image
  }

  const headerSize = image.readUInt32LE(0)
  const width = image.readInt32LE(4)
  const dibHeight = image.readInt32LE(8)
  const planes = image.readUInt16LE(12)
  const bitCount = image.readUInt16LE(14)
  const compression = image.readUInt32LE(16)

  if (headerSize < 40 || planes !== 1 || compression !== 0 || ![24, 32].includes(bitCount) || width <= 0 || dibHeight === 0) {
    throw new Error('unsupported_ico_format')
  }

  const height = Math.abs(dibHeight) / 2

  if (!Number.isInteger(height) || height <= 0) {
    throw new Error('unsupported_ico_format')
  }

  const bytesPerPixel = bitCount / 8
  const rowStride = Math.ceil((width * bytesPerPixel) / 4) * 4
  const pixelOffset = headerSize
  const png = new PNG({ width, height })

  if (pixelOffset + rowStride * height > image.byteLength) {
    throw new Error('unsupported_ico_format')
  }

  for (let y = 0; y < height; y += 1) {
    const sourceY = dibHeight > 0 ? height - 1 - y : y

    for (let x = 0; x < width; x += 1) {
      const sourceOffset = pixelOffset + sourceY * rowStride + x * bytesPerPixel
      const targetOffset = (y * width + x) * 4

      png.data[targetOffset] = image[sourceOffset + 2] ?? 0
      png.data[targetOffset + 1] = image[sourceOffset + 1] ?? 0
      png.data[targetOffset + 2] = image[sourceOffset] ?? 0
      png.data[targetOffset + 3] = bitCount === 32 ? (image[sourceOffset + 3] ?? 255) : 255
    }
  }

  return PNG.sync.write(png)
}

const extractImageCandidatesFromHtml = (html: string, baseUrl: URL) => {
  const candidates: Array<{ url: string; confidence: number; source: string }> = []

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0]
    const rel = extractAttr(tag, 'rel')?.toLowerCase() || ''
    const href = extractAttr(tag, 'href')

    if (!href) continue

    if (rel.includes('apple-touch-icon')) {
      candidates.push({ url: new URL(href, baseUrl).toString(), confidence: 0.72, source: rel })
    } else if (rel.includes('icon')) {
      candidates.push({ url: new URL(href, baseUrl).toString(), confidence: 0.58, source: rel })
    }
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0]
    const property = (extractAttr(tag, 'property') || extractAttr(tag, 'name') || '').toLowerCase()
    const content = extractAttr(tag, 'content')

    if (!content) continue

    if (property === 'og:image' || property === 'twitter:image') {
      candidates.push({ url: new URL(content, baseUrl).toString(), confidence: 0.64, source: property })
    }
  }

  candidates.push({ url: new URL('/favicon.ico', baseUrl).toString(), confidence: 0.4, source: 'favicon_fallback' })

  return candidates
}

const fetchText = async (url: URL) => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'GreenhouseBrandAssetDiscovery/1.0'
    },
    signal: AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    throw new Error(`website_fetch_failed:${response.status}`)
  }

  const contentLength = Number(response.headers.get('content-length') || '0')

  if (contentLength > MAX_HTML_BYTES) {
    throw new Error('website_html_too_large')
  }

  const text = await response.text()

  if (text.length > MAX_HTML_BYTES) {
    throw new Error('website_html_too_large')
  }

  return text
}

const fetchImage = async (sourceUrl: string) => {
  const url = new URL(sourceUrl)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('unsupported_logo_url_protocol')
  }

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'GreenhouseBrandAssetDiscovery/1.0'
    },
    signal: AbortSignal.timeout(10000)
  })

  if (!response.ok) {
    throw new Error(`logo_fetch_failed:${response.status}`)
  }

  const responseMimeType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || ''

  const contentLength = Number(response.headers.get('content-length') || '0')

  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error('logo_too_large')
  }

  const bytes = Buffer.from(await response.arrayBuffer())

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('logo_too_large')
  }

  if (SUPPORTED_RASTER_MIME_TYPES.has(responseMimeType)) {
    return { bytes, mimeType: responseMimeType }
  }

  if (ICO_MIME_TYPES.has(responseMimeType) || isIcoBuffer(bytes)) {
    const pngBytes = convertIcoToPng(bytes)

    if (pngBytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('logo_too_large')
    }

    return { bytes: pngBytes, mimeType: 'image/png' }
  }

  throw new Error('unsupported_logo_mime_type')
}

const getOrganizationsForDiscovery = async ({
  organizationId,
  limit
}: {
  organizationId?: string | null
  limit: number
}) => {
  const cappedLimit = Math.max(1, Math.min(Math.trunc(limit), 50))

  return query<DiscoveryOrgRow>(
    `
      SELECT organization_id, public_id, organization_name, website_url
      FROM greenhouse_core.organizations
      WHERE is_operating_entity = FALSE
        AND logo_asset_id IS NULL
        AND website_url IS NOT NULL
        AND btrim(website_url) <> ''
        AND ($1::text IS NULL OR organization_id = $1 OR public_id = $1)
      ORDER BY updated_at DESC NULLS LAST, organization_name
      LIMIT $2
    `,
    [organizationId || null, cappedLimit]
  )
}

const persistDiscoveredLogoCandidate = async ({
  organization,
  sourceUrl,
  source,
  confidence,
  actorUserId,
  metadata
}: {
  organization: DiscoveryOrgRow
  sourceUrl: string
  source: OrganizationBrandAssetCandidateSource
  confidence: number
  actorUserId: string
  metadata: Record<string, unknown>
}) => {
  const { bytes, mimeType } = await fetchImage(sourceUrl)
  const assetId = `asset-${randomUUID()}`
  const extension = extensionForMimeType(mimeType)

  const asset = await storeSystemGeneratedPrivateAsset({
    assetId,
    ownerAggregateType: 'organization_logo_candidate',
    ownerAggregateId: organization.organization_id,
    fileName: `${organization.public_id || organization.organization_id}-logo-candidate.${extension}`,
    mimeType,
    bytes,
    actorUserId,
    metadata: {
      organizationId: organization.organization_id,
      source,
      sourceUrl,
      ...metadata
    }
  })

  return createOrganizationLogoCandidate({
    organizationId: organization.organization_id,
    assetId: asset.assetId,
    actorUserId,
    source,
    sourceUrl,
    confidence,
    metadata
  })
}

const createCandidateFromWebsiteUrl = async ({
  organization,
  websiteUrl,
  actorUserId,
  directImageError
}: {
  organization: DiscoveryOrgRow
  websiteUrl: URL
  actorUserId: string
  directImageError?: unknown
}) => {
  const html = await fetchText(websiteUrl)

  const candidates = extractImageCandidatesFromHtml(html, websiteUrl)
    .filter(item => /^https?:\/\//i.test(item.url))
    .sort((left, right) => right.confidence - left.confidence)

  const failures: string[] = []

  for (const candidate of candidates) {
    try {
      return await persistDiscoveredLogoCandidate({
        organization,
        sourceUrl: candidate.url,
        source: 'operator_url',
        confidence: Math.max(candidate.confidence, 0.76),
        actorUserId,
        metadata: {
          discoveryMode: 'operator_url',
          htmlSource: candidate.source,
          requestedUrl: websiteUrl.toString()
        }
      })
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }

  const reason = failures[0] || (directImageError instanceof Error ? directImageError.message : null)

  throw new OrganizationBrandAssetError(
    'no_supported_logo_candidate',
    reason ? `no_supported_logo_candidate:${reason}` : 'no_supported_logo_candidate'
  )
}

export const createOperatorUrlOrganizationLogoCandidate = async ({
  organizationId,
  sourceUrl,
  actorUserId
}: {
  organizationId: string
  sourceUrl: string
  actorUserId: string
}) => {
  const rows = await query<DiscoveryOrgRow>(
    `
      SELECT organization_id, public_id, organization_name, website_url
      FROM greenhouse_core.organizations
      WHERE (organization_id = $1 OR public_id = $1)
      LIMIT 1
    `,
    [organizationId]
  )

  const organization = rows[0]

  if (!organization) {
    throw new OrganizationBrandAssetError('organization_not_found')
  }

  const operatingRows = await query<{ is_operating_entity: boolean }>(
    `
      SELECT is_operating_entity
      FROM greenhouse_core.organizations
      WHERE organization_id = $1
      LIMIT 1
    `,
    [organization.organization_id]
  )

  if (operatingRows[0]?.is_operating_entity) {
    throw new OrganizationBrandAssetError('operating_entity_forbidden')
  }

  const normalizedSourceUrl = normalizeWebsiteUrl(sourceUrl)

  if (!normalizedSourceUrl) {
    throw new OrganizationBrandAssetError('invalid_source_url')
  }

  try {
    return await persistDiscoveredLogoCandidate({
      organization,
      sourceUrl: normalizedSourceUrl.toString(),
      source: 'operator_url',
      confidence: 0.9,
      actorUserId,
      metadata: { discoveryMode: 'operator_url', requestedUrl: normalizedSourceUrl.toString() }
    })
  } catch (error) {
    return createCandidateFromWebsiteUrl({
      organization,
      websiteUrl: normalizedSourceUrl,
      actorUserId,
      directImageError: error
    })
  }
}

export const discoverOrganizationBrandAssets = async ({
  organizationId,
  limit = 20,
  actorUserId = DISCOVERY_USER_ID
}: {
  organizationId?: string | null
  limit?: number
  actorUserId?: string
} = {}): Promise<OrganizationBrandAssetDiscoveryResult> => {
  const organizations = await getOrganizationsForDiscovery({ organizationId, limit })

  const result: OrganizationBrandAssetDiscoveryResult = {
    scanned: organizations.length,
    created: 0,
    skipped: 0,
    failed: 0,
    details: []
  }

  for (const organization of organizations) {
    const websiteUrl = normalizeWebsiteUrl(organization.website_url)

    if (!websiteUrl) {
      result.skipped += 1
      result.details.push({
        organizationId: organization.organization_id,
        organizationName: organization.organization_name,
        status: 'skipped',
        reason: 'missing_or_invalid_website'
      })
      continue
    }

    try {
      const html = await fetchText(websiteUrl)
      const candidates = extractImageCandidatesFromHtml(html, websiteUrl)
      const candidate = candidates.find(item => /^https?:\/\//i.test(item.url))

      if (!candidate) {
        await createOrganizationLogoCandidate({
          organizationId: organization.organization_id,
          actorUserId,
          source: 'website_metadata',
          sourceUrl: websiteUrl.toString(),
          status: 'failed',
          rejectionReason: 'no_supported_logo_candidate',
          metadata: { discoveryMode: 'website_metadata' }
        })

        result.failed += 1
        result.details.push({
          organizationId: organization.organization_id,
          organizationName: organization.organization_name,
          status: 'failed',
          reason: 'no_supported_logo_candidate'
        })
        continue
      }

      const created = await persistDiscoveredLogoCandidate({
        organization,
        sourceUrl: candidate.url,
        source: 'website_metadata',
        confidence: candidate.confidence,
        actorUserId,
        metadata: {
          discoveryMode: 'website_metadata',
          htmlSource: candidate.source,
          websiteUrl: websiteUrl.toString()
        }
      })

      result.created += 1
      result.details.push({
        organizationId: organization.organization_id,
        organizationName: organization.organization_name,
        status: 'created',
        sourceUrl: candidate.url,
        candidateId: created.candidate_id
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)

      await createOrganizationLogoCandidate({
        organizationId: organization.organization_id,
        actorUserId,
        source: 'website_metadata',
        sourceUrl: websiteUrl.toString(),
        status: 'failed',
        rejectionReason: reason,
        metadata: { discoveryMode: 'website_metadata', reason }
      }).catch(() => null)

      result.failed += 1
      result.details.push({
        organizationId: organization.organization_id,
        organizationName: organization.organization_name,
        status: 'failed',
        reason
      })
    }
  }

  return result
}
