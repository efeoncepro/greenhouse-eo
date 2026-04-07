import 'server-only'

import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface ResolvedOrganization {
  organizationId: string
  publicId: string
  hubspotCompanyId: string | null
}

const EO_ORG_PATTERN = /^EO-ORG-\d{4,}$/

/**
 * Resolve any organization identifier (public_id, organization_id, hubspot_company_id)
 * to a canonical ResolvedOrganization. Queries `organization_360` in Postgres.
 */
export const resolveOrganizationIdentifier = async (
  identifier: string
): Promise<ResolvedOrganization | null> => {
  if (!isGreenhousePostgresConfigured()) return null

  try {
    const isPublicId = EO_ORG_PATTERN.test(identifier)

    const whereClause = isPublicId
      ? 'public_id = $1'
      : 'organization_id = $1 OR hubspot_company_id = $1'

    const rows = await runGreenhousePostgresQuery<{
      organization_id: string
      public_id: string
      hubspot_company_id: string | null
    }>(
      `SELECT organization_id, public_id, hubspot_company_id
       FROM greenhouse_serving.organization_360
       WHERE ${whereClause}
       LIMIT 1`,
      [identifier]
    )

    if (!rows[0]) return null

    return {
      organizationId: rows[0].organization_id,
      publicId: rows[0].public_id,
      hubspotCompanyId: rows[0].hubspot_company_id
    }
  } catch {
    return null
  }
}

export const isOrgPublicIdFormat = (value: string) => EO_ORG_PATTERN.test(value)
