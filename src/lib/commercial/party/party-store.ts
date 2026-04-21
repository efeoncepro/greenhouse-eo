import 'server-only'

import type { LifecycleStage, LifecycleTransitionSource } from './types'

interface QueryResultLike<T> {
  rows: T[]
}

interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

export interface OrganizationLifecycleRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
  commercial_party_id: string
  hubspot_company_id: string | null
  lifecycle_stage: LifecycleStage
  lifecycle_stage_since: string
  lifecycle_stage_source: LifecycleTransitionSource
  lifecycle_stage_by: string | null
  is_dual_role: boolean
  organization_type: string | null
}

// TASK-535: narrow reads for the lifecycle commands. Kept separate so the
// commands stay focused on write orchestration and so future readers (UI,
// API) can import the same row shape.

export const selectOrganizationForLifecycleUpdate = async (
  client: QueryableClient,
  organizationId: string
): Promise<OrganizationLifecycleRow | null> => {
  const result = await client.query<OrganizationLifecycleRow>(
    `SELECT
       organization_id,
       organization_name,
       commercial_party_id::text AS commercial_party_id,
       hubspot_company_id,
       lifecycle_stage,
       lifecycle_stage_since::text AS lifecycle_stage_since,
       lifecycle_stage_source,
       lifecycle_stage_by,
       is_dual_role,
       organization_type
     FROM greenhouse_core.organizations
     WHERE organization_id = $1
     FOR UPDATE`,
    [organizationId]
  )

  return result.rows[0] ?? null
}

export const findOrganizationByHubSpotCompany = async (
  client: QueryableClient,
  hubspotCompanyId: string
): Promise<OrganizationLifecycleRow | null> => {
  const result = await client.query<OrganizationLifecycleRow>(
    `SELECT
       organization_id,
       organization_name,
       commercial_party_id::text AS commercial_party_id,
       hubspot_company_id,
       lifecycle_stage,
       lifecycle_stage_since::text AS lifecycle_stage_since,
       lifecycle_stage_source,
       lifecycle_stage_by,
       is_dual_role,
       organization_type
     FROM greenhouse_core.organizations
     WHERE hubspot_company_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [hubspotCompanyId]
  )

  return result.rows[0] ?? null
}

export const organizationHasClient = async (
  client: QueryableClient,
  organizationId: string
): Promise<string | null> => {
  // Two paths: fin_client_profiles.organization_id bridge, or a clients row
  // sharing the organization's hubspot_company_id. Either means we already
  // have a client instantiated.
  const result = await client.query<{ client_id: string | null }>(
    `WITH via_profile AS (
       SELECT cp.client_id
       FROM greenhouse_finance.client_profiles cp
       WHERE cp.organization_id = $1
         AND cp.client_id IS NOT NULL
       LIMIT 1
     ),
     via_hubspot AS (
       SELECT c.client_id
       FROM greenhouse_core.clients c
       JOIN greenhouse_core.organizations o
         ON o.hubspot_company_id = c.hubspot_company_id
        AND o.hubspot_company_id IS NOT NULL
       WHERE o.organization_id = $1
       LIMIT 1
     )
     SELECT client_id FROM via_profile
     UNION ALL
     SELECT client_id FROM via_hubspot
     LIMIT 1`,
    [organizationId]
  )

  return result.rows[0]?.client_id ?? null
}
