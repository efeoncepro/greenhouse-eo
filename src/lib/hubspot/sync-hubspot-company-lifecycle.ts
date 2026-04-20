import 'server-only'

import { query, withTransaction } from '@/lib/db'
import {
  getHubSpotGreenhouseCompanyProfile,
  type HubSpotGreenhouseCompanyProfile
} from '@/lib/integrations/hubspot-greenhouse-service'

import {
  normalizeClientLifecycleStageSource,
  normalizeHubSpotLifecycleStage,
  type ClientLifecycleStage,
  type ClientLifecycleStageSource
} from './company-lifecycle-store'
import { publishCompanyLifecycleStageChanged } from './company-lifecycle-events'

interface OrganizationLifecycleTarget extends Record<string, unknown> {
  organization_id: string
  hubspot_company_id: string
  space_id: string | null
  client_ids: string[] | null
}

interface ClientLifecycleRow extends Record<string, unknown> {
  client_id: string
  hubspot_company_id: string | null
  lifecyclestage: string | null
  lifecyclestage_source: string | null
}

export interface HubSpotCompanyLifecycleSyncResult {
  processed: number
  updated: number
  changed: number
  skippedManualOverrides: number
  errors: string[]
}

const listOrganizationLifecycleTargets = async (): Promise<OrganizationLifecycleTarget[]> =>
  query<OrganizationLifecycleTarget>(
    `
      SELECT
        o.organization_id,
        o.hubspot_company_id,
        MIN(s.space_id) FILTER (WHERE s.space_id IS NOT NULL) AS space_id,
        COALESCE(
          ARRAY_AGG(DISTINCT s.client_id) FILTER (WHERE s.client_id IS NOT NULL),
          ARRAY[]::text[]
        ) AS client_ids
      FROM greenhouse_core.organizations AS o
      LEFT JOIN greenhouse_core.spaces AS s
        ON s.organization_id = o.organization_id
       AND s.active = TRUE
      WHERE o.active = TRUE
        AND o.hubspot_company_id IS NOT NULL
        AND btrim(o.hubspot_company_id) <> ''::text
      GROUP BY o.organization_id, o.hubspot_company_id
      ORDER BY o.organization_id ASC
    `
  )

const listClientLifecycleRows = async (
  hubspotCompanyId: string,
  clientIds: string[]
): Promise<ClientLifecycleRow[]> =>
  query<ClientLifecycleRow>(
    `
      SELECT
        client_id,
        hubspot_company_id,
        lifecyclestage,
        lifecyclestage_source
      FROM greenhouse_core.clients
      WHERE hubspot_company_id = $1
         OR client_id = ANY($2::text[])
      ORDER BY client_id ASC
    `,
    [hubspotCompanyId, clientIds]
  )

const resolveLifecycleStage = (company: HubSpotGreenhouseCompanyProfile): ClientLifecycleStage =>
  normalizeHubSpotLifecycleStage(company.lifecycle.lifecyclestage)

const resolveLifecycleSource = (): ClientLifecycleStageSource => 'hubspot_sync'

const shouldUpdateLifecycle = (
  row: ClientLifecycleRow,
  nextStage: ClientLifecycleStage,
  nextSource: ClientLifecycleStageSource
) => {
  const currentStage = normalizeHubSpotLifecycleStage(row.lifecyclestage)
  const currentSource = normalizeClientLifecycleStageSource(row.lifecyclestage_source)

  if (currentSource === 'manual_override') {
    return { shouldUpdate: false, changed: false, currentStage, currentSource }
  }

  const changed = currentStage !== nextStage
  const sourceChanged = currentSource !== nextSource

  return {
    shouldUpdate: changed || sourceChanged,
    changed,
    currentStage,
    currentSource
  }
}

export const syncHubSpotCompanyLifecycles = async (): Promise<HubSpotCompanyLifecycleSyncResult> => {
  const targets = await listOrganizationLifecycleTargets()

  const result: HubSpotCompanyLifecycleSyncResult = {
    processed: 0,
    updated: 0,
    changed: 0,
    skippedManualOverrides: 0,
    errors: []
  }

  for (const target of targets) {
    result.processed += 1

    let company: HubSpotGreenhouseCompanyProfile

    try {
      company = await getHubSpotGreenhouseCompanyProfile(target.hubspot_company_id)
    } catch (error) {
      result.errors.push(
        `HubSpot company ${target.hubspot_company_id}: ${error instanceof Error ? error.message : String(error)}`
      )
      continue
    }

    const nextStage = resolveLifecycleStage(company)
    const nextSource = resolveLifecycleSource()
    const clientIds = target.client_ids ?? []

    let clientRows: ClientLifecycleRow[]

    try {
      clientRows = await listClientLifecycleRows(target.hubspot_company_id, clientIds)
    } catch (error) {
      result.errors.push(
        `Target resolution ${target.hubspot_company_id}: ${error instanceof Error ? error.message : String(error)}`
      )
      continue
    }

    if (clientRows.length === 0) continue

    try {
      await withTransaction(async client => {
        for (const row of clientRows) {
          const decision = shouldUpdateLifecycle(row, nextStage, nextSource)

          if (decision.currentSource === 'manual_override') {
            result.skippedManualOverrides += 1
            continue
          }

          if (!decision.shouldUpdate) continue

          await client.query(
            `
              UPDATE greenhouse_core.clients
              SET lifecyclestage = $2,
                  lifecyclestage_source = $3,
                  lifecyclestage_updated_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
              WHERE client_id = $1
                AND COALESCE(lifecyclestage_source, 'unknown') <> 'manual_override'
            `,
            [row.client_id, nextStage, nextSource]
          )

          result.updated += 1

          if (decision.changed) {
            result.changed += 1

            await publishCompanyLifecycleStageChanged(
              {
                clientId: row.client_id,
                organizationId: target.organization_id,
                spaceId: target.space_id,
                hubspotCompanyId: target.hubspot_company_id,
                fromStage: decision.currentStage,
                toStage: nextStage,
                source: 'hubspot_live'
              },
              client
            )
          }
        }
      })
    } catch (error) {
      result.errors.push(
        `Lifecycle write ${target.hubspot_company_id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return result
}
