import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type OrgSearchRow = {
  organizationId: string
  publicId: string | null
  organizationName: string
  legalName: string | null
  taxId: string | null
  country: string | null
  hubspotCompanyId: string | null
  lifecycleStage: string | null
}

const SELECT = `
  SELECT
    organization_id   AS "organizationId",
    public_id         AS "publicId",
    organization_name AS "organizationName",
    legal_name        AS "legalName",
    tax_id            AS "taxId",
    country,
    hubspot_company_id AS "hubspotCompanyId",
    lifecycle_stage    AS "lifecycleStage"
  FROM greenhouse_core.organizations
`

/** Search the canonical org backbone by name / legal name (prefill + dedup picker). */
export const searchOrganizations = async (query: string, limit = 12): Promise<OrgSearchRow[]> => {
  const trimmed = query.trim()

  if (trimmed.length === 0) {
    // Empty query → most-recent active clients (keeps the picker's "list on open" UX).
    return runGreenhousePostgresQuery<OrgSearchRow>(
      `${SELECT}
       WHERE COALESCE(organization_type, 'other') IN ('client', 'both')
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    )
  }

  const like = `%${trimmed}%`

  return runGreenhousePostgresQuery<OrgSearchRow>(
    `${SELECT}
     WHERE organization_name ILIKE $1
        OR legal_name ILIKE $1
        OR tax_id ILIKE $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [like, limit]
  )
}

/** Resolve an org by normalized tax id (duplicate-tax-id gate). */
export const findOrganizationByNormalizedTaxId = async (
  normalizedTaxId: string
): Promise<OrgSearchRow[]> => {
  if (!normalizedTaxId) return []

  return runGreenhousePostgresQuery<OrgSearchRow>(
    `${SELECT}
     WHERE UPPER(REGEXP_REPLACE(COALESCE(tax_id, ''), '[.\\-\\s]', '', 'g')) = $1
     ORDER BY updated_at DESC
     LIMIT 5`,
    [normalizedTaxId]
  )
}
