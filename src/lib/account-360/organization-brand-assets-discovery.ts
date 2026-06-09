import 'server-only'

import { randomUUID } from 'node:crypto'

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

  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || ''

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
    throw new Error('unsupported_logo_mime_type')
  }

  const contentLength = Number(response.headers.get('content-length') || '0')

  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error('logo_too_large')
  }

  const bytes = Buffer.from(await response.arrayBuffer())

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('logo_too_large')
  }

  return { bytes, mimeType }
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
