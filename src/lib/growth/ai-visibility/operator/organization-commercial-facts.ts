import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1279 — Hechos comerciales de la organización sujeto (cliente vs prospecto) para el
 * cross-sell operador. Lee la fila canónica `greenhouse_core.organizations` (SSOT, TASK-991):
 * `organization_type` ∈ {client, supplier, both, other} + `lifecycle_stage`. Un cliente con
 * relación activa (type client/both o lifecycle active_client) ⇒ `expansion` (envío = servicio);
 * cualquier otro (prospecto/other) ⇒ `new_business` (envío = interés legítimo, exige consent).
 *
 * Esta derivación es SERVER-SIDE y AUTORITATIVA: el consent gate NUNCA confía en lo que diga el
 * operador, sino en el tipo real de la org (evita que un envío en frío se disfrace de "expansion").
 */

export interface OrganizationCommercialFacts {
  organizationId: string
  organizationName: string
  /** Web canónica (TASK-1285/999); fuente del dominio para el match de Company en HubSpot. */
  websiteUrl: string | null
  hubspotCompanyId: string | null
  /** true si la org es cliente con relación (client/both o active_client). */
  isClient: boolean
}

type RawOrgRow = {
  organization_id: string
  organization_name: string
  legal_name: string | null
  organization_type: string | null
  lifecycle_stage: string | null
  website_url: string | null
  hubspot_company_id: string | null
}

export const getOrganizationCommercialFacts = async (
  organizationId: string
): Promise<OrganizationCommercialFacts | null> => {
  const rows = await runGreenhousePostgresQuery<RawOrgRow>(
    `SELECT organization_id, organization_name, legal_name, organization_type,
            lifecycle_stage, website_url, hubspot_company_id
       FROM greenhouse_core.organizations
      WHERE organization_id = $1
      LIMIT 1`,
    [organizationId]
  )

  const row = rows[0]

  if (!row) return null

  const type = row.organization_type ?? 'other'
  const isClient = type === 'client' || type === 'both' || row.lifecycle_stage === 'active_client'

  return {
    organizationId: row.organization_id,
    organizationName: (row.organization_name || row.legal_name || '').trim(),
    websiteUrl: row.website_url,
    hubspotCompanyId: row.hubspot_company_id,
    isClient
  }
}
