import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { resolveCanonicalCategory } from './taxonomy'

// country (ISO-2) -> market + locale del grader. Conservador; ampliar cuando emerja otro país.
const MARKET_BY_COUNTRY: Record<string, { market: string; locale: string }> = {
  MX: { market: 'MX', locale: 'es-MX' },
  CL: { market: 'CL', locale: 'es-CL' },
  US: { market: 'US', locale: 'en-US' }
}

export type ProvisionGraderProfileErrorCode = 'org_not_found' | 'website_required'

export class ProvisionGraderProfileError extends Error {
  readonly code: ProvisionGraderProfileErrorCode
  readonly statusCode: number
  readonly details?: Record<string, unknown>

  constructor(
    code: ProvisionGraderProfileErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ProvisionGraderProfileError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

interface OrganizationRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
  website_url: string | null
  country: string | null
  industry: string | null
}

interface ProfileRow extends Record<string, unknown> {
  profile_id: string
  public_id: string | null
  website_url?: string | null
}

export interface ProvisionGraderProfileResult {
  readonly profileId: string
  readonly publicId: string | null
  readonly idempotent: boolean
  readonly websiteUrl: string
  readonly market: string
  readonly locale: string
}

const resolveMarketLocale = (
  country: string | null
): { market: string; locale: string } => {
  const countryCode = (country ?? '').trim().toUpperCase()

  return MARKET_BY_COUNTRY[countryCode] ?? { market: countryCode || 'CL', locale: 'es' }
}

export const provisionGraderProfileForOrganization = async (
  organizationId: string
): Promise<ProvisionGraderProfileResult> => {
  const orgRows = await runGreenhousePostgresQuery<OrganizationRow>(
    `SELECT organization_id, organization_name, website_url, country, industry
       FROM greenhouse_core.organizations
      WHERE organization_id = $1 AND active = TRUE`,
    [organizationId]
  )

  const org = orgRows[0]

  if (!org) {
    throw new ProvisionGraderProfileError(
      'org_not_found',
      `Organization '${organizationId}' not found or inactive`,
      404,
      { organizationId }
    )
  }

  const existingRows = await runGreenhousePostgresQuery<ProfileRow>(
    `SELECT profile_id, public_id, website_url
       FROM greenhouse_growth.grader_profiles
      WHERE organization_id = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`,
    [organizationId]
  )

  const existing = existingRows[0]

  if (existing?.profile_id) {
    const existingWebsiteUrl = existing.website_url ?? org.website_url

    if (!existingWebsiteUrl) {
      throw new ProvisionGraderProfileError(
        'website_required',
        `Organization '${organizationId}' has an active grader_profile but no canonical website_url`,
        422,
        { organizationId }
      )
    }

    const { market, locale } = resolveMarketLocale(org.country)

    return {
      profileId: existing.profile_id,
      publicId: existing.public_id ?? null,
      idempotent: true,
      websiteUrl: existingWebsiteUrl,
      market,
      locale
    }
  }

  if (!org.website_url) {
    throw new ProvisionGraderProfileError(
      'website_required',
      `Organization '${organizationId}' does not have canonical website_url`,
      422,
      { organizationId }
    )
  }

  const { market, locale } = resolveMarketLocale(org.country)

  // Resolve the RAW industry string to a canonical taxonomy node (ISSUE-110): the raw
  // enum is preserved in `category` (additive) but NEVER interpolated into prompts; the
  // canonical node + provenance drive the engine. Slice 2 is deterministic (HubSpot prior
  // + taxonomy alias); Slice 4 passes the grounded brand_intelligence candidate.
  const resolvedCategory = resolveCanonicalCategory({ industry: org.industry })

  const inserted = await runGreenhousePostgresQuery<ProfileRow>(
    `INSERT INTO greenhouse_growth.grader_profiles
       (brand_name, website_url, market, locale, category,
        category_node_id, category_label, category_confidence, category_source,
        competitors_declared, organization_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
     RETURNING profile_id, public_id`,
    [
      org.organization_name,
      org.website_url,
      market,
      locale,
      org.industry,
      resolvedCategory.nodeId,
      resolvedCategory.label?.es ?? null,
      resolvedCategory.confidence,
      resolvedCategory.source,
      [],
      org.organization_id
    ]
  )

  const profile = inserted[0]

  return {
    profileId: profile.profile_id,
    publicId: profile.public_id ?? null,
    idempotent: false,
    websiteUrl: org.website_url,
    market,
    locale
  }
}
