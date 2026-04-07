import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { AccountScope } from '@/types/account-complete-360'

/**
 * Resolve the full scope for an organization: org → spaces → clients.
 * Executed **once** at the start of the resolver and passed to every facet.
 */
export const resolveAccountScope = async (organizationId: string): Promise<AccountScope | null> => {
  const rows = await runGreenhousePostgresQuery<{
    organization_id: string
    public_id: string | null
    hubspot_company_id: string | null
    space_ids: string[] | null
    client_ids: string[] | null
  }>(`
    SELECT
      o.organization_id,
      o.public_id,
      o.hubspot_company_id,
      array_agg(DISTINCT s.space_id) FILTER (WHERE s.space_id IS NOT NULL) AS space_ids,
      array_agg(DISTINCT s.client_id) FILTER (WHERE s.client_id IS NOT NULL) AS client_ids
    FROM greenhouse_core.organizations o
    LEFT JOIN greenhouse_core.spaces s
      ON s.organization_id = o.organization_id AND s.active = TRUE
    WHERE o.organization_id = $1
    GROUP BY o.organization_id, o.public_id, o.hubspot_company_id
  `, [organizationId])

  if (!rows[0]) return null

  const row = rows[0]

  return {
    organizationId: row.organization_id,
    publicId: row.public_id,
    hubspotCompanyId: row.hubspot_company_id,
    spaceIds: row.space_ids ?? [],
    clientIds: row.client_ids ?? []
  }
}
