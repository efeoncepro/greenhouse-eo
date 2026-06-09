import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { attachAssetToAggregate, buildPrivateAssetDownloadUrl, getAssetById } from '@/lib/storage/greenhouse-assets'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

type QueryableClient = Pick<PoolClient, 'query'>

type OrganizationBrandAssetOrgRow = {
  organization_id: string
  public_id: string | null
  organization_name: string
  is_operating_entity: boolean
  logo_asset_id: string | null
}

type CandidateRow = {
  candidate_id: string
  organization_id: string
  asset_id: string | null
  source: OrganizationBrandAssetCandidateSource
  source_url: string | null
  status: string
}

export type AttachOrganizationLogoResult = {
  organizationId: string
  previousLogoAssetId: string | null
  logoAssetId: string
  logoUrl: string
}

export type OrganizationBrandAssetCandidateSource =
  | 'hubspot_company'
  | 'website_metadata'
  | 'manual_upload'
  | 'operator_url'

export type OrganizationBrandAssetCandidateStatus =
  | 'pending_review'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'expired'
  | 'failed'

export type OrganizationBrandAssetReviewCandidate = {
  candidateId: string
  organizationId: string
  source: OrganizationBrandAssetCandidateSource
  sourceUrl: string | null
  assetId: string | null
  assetUrl: string | null
  confidence: number | null
  status: OrganizationBrandAssetCandidateStatus
  rejectionReason: string | null
  metadata: Record<string, unknown>
  discoveredAt: string
  reviewedAt: string | null
}

export type OrganizationBrandAssetReviewItem = {
  organizationId: string
  publicId: string | null
  organizationName: string
  websiteUrl: string | null
  logoAssetId: string | null
  logoUrl: string | null
  pendingCandidates: OrganizationBrandAssetReviewCandidate[]
}

export type OrganizationBrandAssetReviewOverview = {
  generatedAt: string
  totals: {
    nonOperatingOrganizations: number
    withLogo: number
    missingLogo: number
    pendingCandidates: number
    failedCandidatesLast24h: number
    protectedOperatingEntities: number
  }
  items: OrganizationBrandAssetReviewItem[]
}

export const canUpdateOrganizationBrandAsset = (subject: TenantEntitlementSubject) =>
  can(subject, 'organization.brand_asset', 'update', 'tenant')

export const canReviewOrganizationBrandAsset = (subject: TenantEntitlementSubject) =>
  can(subject, 'organization.brand_asset', 'review', 'tenant')

export class OrganizationBrandAssetError extends Error {
  constructor(
    public readonly code:
      | 'organization_not_found'
      | 'operating_entity_forbidden'
      | 'asset_not_found'
      | 'unsupported_asset_context'
      | 'candidate_not_found'
      | 'candidate_asset_mismatch'
      | 'invalid_source_url'
      | 'no_supported_logo_candidate',
    message: string = code
  ) {
    super(message)
    this.name = 'OrganizationBrandAssetError'
  }
}

const getOrganizationForLogoUpdate = async (client: QueryableClient, organizationId: string) => {
  const result = await client.query<OrganizationBrandAssetOrgRow>(
    `
      SELECT organization_id, public_id, organization_name, is_operating_entity, logo_asset_id
      FROM greenhouse_core.organizations
      WHERE organization_id = $1 OR public_id = $1
      FOR UPDATE
      LIMIT 1
    `,
    [organizationId]
  )

  return result.rows[0] ?? null
}

const getCandidateForUpdate = async (client: QueryableClient, candidateId: string) => {
  const result = await client.query<CandidateRow>(
    `
      SELECT candidate_id, organization_id, asset_id, source, source_url, status
      FROM greenhouse_core.organization_brand_asset_candidates
      WHERE candidate_id = $1
      FOR UPDATE
      LIMIT 1
    `,
    [candidateId]
  )

  return result.rows[0] ?? null
}

const markPreviousLogoSuperseded = async ({
  client,
  previousLogoAssetId,
  nextLogoAssetId,
  actorUserId
}: {
  client: QueryableClient
  previousLogoAssetId: string | null
  nextLogoAssetId: string
  actorUserId: string
}) => {
  if (!previousLogoAssetId || previousLogoAssetId === nextLogoAssetId) {
    return
  }

  await client.query(
    `
      UPDATE greenhouse_core.assets
      SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $2::jsonb
      WHERE asset_id = $1
        AND status <> 'deleted'
    `,
    [
      previousLogoAssetId,
      JSON.stringify({
        supersededByAssetId: nextLogoAssetId,
        supersededByUserId: actorUserId,
        supersededAt: new Date().toISOString()
      })
    ]
  )
}

export const attachOrganizationLogoAsset = async ({
  organizationId,
  assetId,
  actorUserId,
  candidateId,
  reason
}: {
  organizationId: string
  assetId: string
  actorUserId: string
  candidateId?: string | null
  reason?: string | null
}): Promise<AttachOrganizationLogoResult> =>
  withGreenhousePostgresTransaction(async client => {
    const organization = await getOrganizationForLogoUpdate(client, organizationId)

    if (!organization) {
      throw new OrganizationBrandAssetError('organization_not_found')
    }

    if (organization.is_operating_entity) {
      throw new OrganizationBrandAssetError('operating_entity_forbidden')
    }

    const asset = await getAssetById(assetId, client)

    if (!asset || asset.status === 'deleted') {
      throw new OrganizationBrandAssetError('asset_not_found')
    }

    if (!['organization_logo_draft', 'organization_logo_candidate', 'organization_logo'].includes(asset.ownerAggregateType)) {
      throw new OrganizationBrandAssetError('unsupported_asset_context')
    }

    if (candidateId) {
      const candidate = await getCandidateForUpdate(client, candidateId)

      if (!candidate || candidate.organization_id !== organization.organization_id) {
        throw new OrganizationBrandAssetError('candidate_not_found')
      }

      if (candidate.asset_id && candidate.asset_id !== assetId) {
        throw new OrganizationBrandAssetError('candidate_asset_mismatch')
      }
    }

    await markPreviousLogoSuperseded({
      client,
      previousLogoAssetId: organization.logo_asset_id,
      nextLogoAssetId: assetId,
      actorUserId
    })

    const attachedAsset = await attachAssetToAggregate({
      assetId,
      ownerAggregateType: 'organization_logo',
      ownerAggregateId: organization.organization_id,
      actorUserId,
      ownerClientId: asset.ownerClientId,
      ownerSpaceId: asset.ownerSpaceId,
      ownerMemberId: asset.ownerMemberId,
      metadata: {
        organizationId: organization.organization_id,
        previousLogoAssetId: organization.logo_asset_id,
        reason: reason || null
      },
      client
    })

    await client.query(
      `
        UPDATE greenhouse_core.organizations
        SET logo_asset_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE organization_id = $1
      `,
      [organization.organization_id, attachedAsset.assetId]
    )

    if (candidateId) {
      await client.query(
        `
          UPDATE greenhouse_core.organization_brand_asset_candidates
          SET status = 'accepted',
              asset_id = COALESCE(asset_id, $2),
              reviewed_by_user_id = $3,
              reviewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP,
              metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $4::jsonb
          WHERE candidate_id = $1
        `,
        [
          candidateId,
          attachedAsset.assetId,
          actorUserId,
          JSON.stringify({ acceptedReason: reason || null })
        ]
      )
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.organization,
      aggregateId: organization.organization_id,
      eventType: EVENT_TYPES.organizationBrandAssetUpdated,
      payload: {
        organizationId: organization.organization_id,
        assetId: attachedAsset.assetId,
        previousLogoAssetId: organization.logo_asset_id,
        candidateId: candidateId || null,
        actorUserId,
        reason: reason || null
      }
    }, client)

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.organization,
      aggregateId: organization.organization_id,
      eventType: EVENT_TYPES.organizationUpdated,
      payload: {
        organizationId: organization.organization_id,
        updatedFields: ['logo_asset_id']
      }
    }, client)

    return {
      organizationId: organization.organization_id,
      previousLogoAssetId: organization.logo_asset_id,
      logoAssetId: attachedAsset.assetId,
      logoUrl: `${buildPrivateAssetDownloadUrl(attachedAsset.assetId)}?inline=1`
    }
  })

export const createManualOrganizationLogoCandidate = async ({
  organizationId,
  assetId,
  actorUserId,
  sourceUrl,
  metadata
}: {
  organizationId: string
  assetId: string
  actorUserId: string
  sourceUrl?: string | null
  metadata?: Record<string, unknown>
}) =>
  createOrganizationLogoCandidate({
    organizationId,
    assetId,
    actorUserId,
    source: 'manual_upload',
    sourceUrl,
    confidence: 1,
    status: 'pending_review',
    metadata
  })

export const createOrganizationLogoCandidate = async ({
  organizationId,
  assetId,
  actorUserId,
  source,
  sourceUrl,
  confidence,
  status = 'pending_review',
  rejectionReason,
  metadata
}: {
  organizationId: string
  assetId?: string | null
  actorUserId: string
  source: OrganizationBrandAssetCandidateSource
  sourceUrl?: string | null
  confidence?: number | null
  status?: OrganizationBrandAssetCandidateStatus
  rejectionReason?: string | null
  metadata?: Record<string, unknown>
}) =>
  withGreenhousePostgresTransaction(async client => {
    const organization = await getOrganizationForLogoUpdate(client, organizationId)

    if (!organization) {
      throw new OrganizationBrandAssetError('organization_not_found')
    }

    if (organization.is_operating_entity) {
      throw new OrganizationBrandAssetError('operating_entity_forbidden')
    }

    if (assetId) {
      const asset = await getAssetById(assetId, client)

      if (!asset || asset.status === 'deleted') {
        throw new OrganizationBrandAssetError('asset_not_found')
      }

      if (!['organization_logo_draft', 'organization_logo_candidate', 'organization_logo'].includes(asset.ownerAggregateType)) {
        throw new OrganizationBrandAssetError('unsupported_asset_context')
      }
    }

    const normalizedSourceUrl = sourceUrl?.trim() || null

    if (normalizedSourceUrl) {
      const existing = await client.query<CandidateRow>(
        `
          SELECT candidate_id, organization_id, asset_id, source, source_url, status
          FROM greenhouse_core.organization_brand_asset_candidates
          WHERE organization_id = $1
            AND source = $2
            AND source_url = $3
            AND status IN ('pending_review', 'accepted')
          ORDER BY discovered_at DESC
          LIMIT 1
        `,
        [organization.organization_id, source, normalizedSourceUrl]
      )

      if (existing.rows[0]) {
        return existing.rows[0]
      }
    }

    const candidateId = `obac-${randomUUID()}`

    const result = await client.query<CandidateRow>(
      `
        INSERT INTO greenhouse_core.organization_brand_asset_candidates (
          candidate_id,
          organization_id,
          source,
          source_url,
          asset_id,
          confidence,
          status,
          metadata_json,
          rejection_reason,
          reviewed_by_user_id,
          reviewed_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb,
          $9,
          CASE WHEN $7 = 'pending_review' THEN NULL ELSE $10 END,
          CASE WHEN $7 = 'pending_review' THEN NULL ELSE CURRENT_TIMESTAMP END
        )
        RETURNING candidate_id, organization_id, asset_id, source, source_url, status
      `,
      [
        candidateId,
        organization.organization_id,
        source,
        normalizedSourceUrl,
        assetId || null,
        confidence ?? null,
        status,
        JSON.stringify({
          ...(metadata || {}),
          createdByUserId: actorUserId
        }),
        rejectionReason || null,
        actorUserId
      ]
    )

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.organization,
      aggregateId: organization.organization_id,
      eventType: EVENT_TYPES.organizationBrandAssetCandidateCreated,
      payload: {
        organizationId: organization.organization_id,
        candidateId,
        assetId: assetId || null,
        source,
        actorUserId
      }
    }, client)

    return result.rows[0]
  })

export const rejectOrganizationLogoCandidate = async ({
  candidateId,
  actorUserId,
  reason
}: {
  candidateId: string
  actorUserId: string
  reason?: string | null
}) =>
  withGreenhousePostgresTransaction(async client => {
    const candidate = await getCandidateForUpdate(client, candidateId)

    if (!candidate) {
      throw new OrganizationBrandAssetError('candidate_not_found')
    }

    const organization = await getOrganizationForLogoUpdate(client, candidate.organization_id)

    if (!organization) {
      throw new OrganizationBrandAssetError('organization_not_found')
    }

    if (organization.is_operating_entity) {
      throw new OrganizationBrandAssetError('operating_entity_forbidden')
    }

    const result = await client.query<CandidateRow>(
      `
        UPDATE greenhouse_core.organization_brand_asset_candidates
        SET status = 'rejected',
            rejection_reason = $2,
            reviewed_by_user_id = $3,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE candidate_id = $1
        RETURNING candidate_id, organization_id, asset_id, source, source_url, status
      `,
      [candidateId, reason || null, actorUserId]
    )

    return result.rows[0]
  })

type OverviewTotalsRow = {
  non_operating_organizations: number
  with_logo: number
  missing_logo: number
  pending_candidates: number
  failed_candidates_last_24h: number
  protected_operating_entities: number
}

type OverviewItemRow = {
  organization_id: string
  public_id: string | null
  organization_name: string
  website_url: string | null
  logo_asset_id: string | null
  pending_candidate_count: number
}

type OverviewCandidateRow = {
  candidate_id: string
  organization_id: string
  source: OrganizationBrandAssetCandidateSource
  source_url: string | null
  asset_id: string | null
  confidence: string | number | null
  status: OrganizationBrandAssetCandidateStatus
  rejection_reason: string | null
  metadata_json: Record<string, unknown> | null
  discovered_at: Date | string
  reviewed_at: Date | string | null
}

const toIso = (value: Date | string | null) => {
  if (!value) return null

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export const getOrganizationBrandAssetReviewOverview = async ({
  limit = 80
}: {
  limit?: number
} = {}): Promise<OrganizationBrandAssetReviewOverview> =>
  withGreenhousePostgresTransaction(async client => {
    const cappedLimit = Math.max(1, Math.min(Math.trunc(limit), 250))

    const totalsResult = await client.query<OverviewTotalsRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE is_operating_entity = FALSE)::int AS non_operating_organizations,
          COUNT(*) FILTER (WHERE is_operating_entity = FALSE AND logo_asset_id IS NOT NULL)::int AS with_logo,
          COUNT(*) FILTER (WHERE is_operating_entity = FALSE AND logo_asset_id IS NULL)::int AS missing_logo,
          (
            SELECT COUNT(*)::int
            FROM greenhouse_core.organization_brand_asset_candidates
            WHERE status = 'pending_review'
          ) AS pending_candidates,
          (
            SELECT COUNT(*)::int
            FROM greenhouse_core.organization_brand_asset_candidates
            WHERE status = 'failed'
              AND discovered_at >= NOW() - INTERVAL '24 hours'
          ) AS failed_candidates_last_24h,
          COUNT(*) FILTER (WHERE is_operating_entity = TRUE)::int AS protected_operating_entities
        FROM greenhouse_core.organizations
      `
    )

    const itemResult = await client.query<OverviewItemRow>(
      `
        WITH scoped AS (
          SELECT
            o.organization_id,
            o.public_id,
            o.organization_name,
            o.website_url,
            o.logo_asset_id,
            (
              SELECT COUNT(*)::int
              FROM greenhouse_core.organization_brand_asset_candidates c
              WHERE c.organization_id = o.organization_id
                AND c.status = 'pending_review'
            ) AS pending_candidate_count
          FROM greenhouse_core.organizations o
          WHERE o.is_operating_entity = FALSE
            AND (
              o.logo_asset_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM greenhouse_core.organization_brand_asset_candidates c
                WHERE c.organization_id = o.organization_id
                  AND c.status = 'pending_review'
              )
            )
          ORDER BY pending_candidate_count DESC, o.updated_at DESC NULLS LAST, o.organization_name
          LIMIT $1
        )
        SELECT *
        FROM scoped
      `,
      [cappedLimit]
    )

    const organizationIds = itemResult.rows.map(row => row.organization_id)

    const candidateRows = organizationIds.length
      ? (
          await client.query<OverviewCandidateRow>(
            `
              SELECT
                candidate_id,
                organization_id,
                source,
                source_url,
                asset_id,
                confidence,
                status,
                rejection_reason,
                metadata_json,
                discovered_at,
                reviewed_at
              FROM greenhouse_core.organization_brand_asset_candidates
              WHERE organization_id = ANY($1::text[])
                AND status IN ('pending_review', 'failed')
              ORDER BY discovered_at DESC
            `,
            [organizationIds]
          )
        ).rows
      : []

    const candidatesByOrganization = new Map<string, OrganizationBrandAssetReviewCandidate[]>()

    for (const candidate of candidateRows) {
      const list = candidatesByOrganization.get(candidate.organization_id) ?? []

      list.push({
        candidateId: candidate.candidate_id,
        organizationId: candidate.organization_id,
        source: candidate.source,
        sourceUrl: candidate.source_url,
        assetId: candidate.asset_id,
        assetUrl: candidate.asset_id ? `${buildPrivateAssetDownloadUrl(candidate.asset_id)}?inline=1` : null,
        confidence: candidate.confidence === null ? null : Number(candidate.confidence),
        status: candidate.status,
        rejectionReason: candidate.rejection_reason,
        metadata: candidate.metadata_json ?? {},
        discoveredAt: toIso(candidate.discovered_at) ?? new Date().toISOString(),
        reviewedAt: toIso(candidate.reviewed_at)
      })

      candidatesByOrganization.set(candidate.organization_id, list)
    }

    const items: OrganizationBrandAssetReviewItem[] = itemResult.rows.map(row => ({
      organizationId: row.organization_id,
      publicId: row.public_id,
      organizationName: row.organization_name,
      websiteUrl: row.website_url,
      logoAssetId: row.logo_asset_id,
      logoUrl: row.logo_asset_id ? `${buildPrivateAssetDownloadUrl(row.logo_asset_id)}?inline=1` : null,
      pendingCandidates: candidatesByOrganization.get(row.organization_id) ?? []
    }))

    const totals = totalsResult.rows[0]

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        nonOperatingOrganizations: Number(totals?.non_operating_organizations ?? 0),
        withLogo: Number(totals?.with_logo ?? 0),
        missingLogo: Number(totals?.missing_logo ?? 0),
        pendingCandidates: Number(totals?.pending_candidates ?? 0),
        failedCandidatesLast24h: Number(totals?.failed_candidates_last_24h ?? 0),
        protectedOperatingEntities: Number(totals?.protected_operating_entities ?? 0)
      },
      items
    }
  })
