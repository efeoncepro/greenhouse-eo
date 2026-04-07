import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { AccountIdentityFacet, AccountScope, AccountFacetContext } from '@/types/account-complete-360'

type IdentityRow = {
  organization_id: string
  public_id: string
  organization_name: string
  legal_name: string | null
  tax_id: string | null
  tax_id_type: string | null
  industry: string | null
  country: string | null
  organization_type: string
  status: string
  active: boolean
  hubspot_company_id: string | null
  notes: string | null
  space_count: string | number
  membership_count: string | number
  unique_person_count: string | number
  created_at: string | null
  updated_at: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

export const fetchIdentityFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountIdentityFacet | null> => {
  void ctx

  const rows = await runGreenhousePostgresQuery<IdentityRow>(
    `SELECT
      organization_id,
      public_id,
      organization_name,
      legal_name,
      tax_id,
      tax_id_type,
      industry,
      country,
      organization_type,
      status,
      active,
      hubspot_company_id,
      notes,
      space_count,
      membership_count,
      unique_person_count,
      created_at::text,
      updated_at::text
    FROM greenhouse_serving.organization_360
    WHERE organization_id = $1
    LIMIT 1`,
    [scope.organizationId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    organizationId: row.organization_id,
    publicId: row.public_id,
    organizationName: row.organization_name,
    legalName: row.legal_name,
    taxId: row.tax_id,
    taxIdType: row.tax_id_type,
    industry: row.industry,
    country: row.country,
    organizationType: row.organization_type,
    status: row.status,
    active: row.active,
    hubspotCompanyId: row.hubspot_company_id,
    notes: row.notes,
    spaceCount: toNum(row.space_count),
    membershipCount: toNum(row.membership_count),
    uniquePersonCount: toNum(row.unique_person_count),
    createdAt: row.created_at ? row.created_at.slice(0, 10) : null,
    updatedAt: row.updated_at ? row.updated_at.slice(0, 10) : null
  }
}
