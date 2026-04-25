import 'server-only'

import { randomUUID } from 'node:crypto'

import { withTransaction } from '@/lib/db'

import {
  DEFAULT_HUBSPOT_STAGE_MAP,
  resolveHubSpotStage
} from '../hubspot-lifecycle-mapping'
import { publishPartyCreated } from '../party-events'
import { findOrganizationByHubSpotCompany } from '../party-store'
import type {
  LifecycleStage,
  LifecycleTransitionSource,
  PartyActor,
  PartyCreationResult
} from '../types'

interface QueryResultLike<T> {
  rows: T[]
}

interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

export interface CreatePartyFromHubSpotCompanyInput {
  hubspotCompanyId: string
  hubspotLifecycleStage?: string | null
  defaultName?: string
  actor: PartyActor
}

// Canonical §4.5 mapping lives in ./hubspot-lifecycle-mapping. Re-exported
// below for backward compatibility with any caller that imported the map
// directly. Prefer `resolveHubSpotStage` for new code — it handles env
// overrides, unknown-stage logging, and ad-hoc overrides.
const mapHubSpotStage = (hubspotStage: string | null | undefined): LifecycleStage =>
  resolveHubSpotStage(hubspotStage, { unknownFallback: 'prospect' })

const HUBSPOT_STAGE_MAP = DEFAULT_HUBSPOT_STAGE_MAP

const normalizeOrganizationId = () => `org-${randomUUID()}`

export const createPartyFromHubSpotCompany = async (
  input: CreatePartyFromHubSpotCompanyInput,
  existingClient?: QueryableClient
): Promise<PartyCreationResult> => {
  const hubspotCompanyId = input.hubspotCompanyId.trim()

  if (!hubspotCompanyId) {
    throw new Error('hubspotCompanyId is required')
  }

  const run = async (txClient: QueryableClient): Promise<PartyCreationResult> => {
    // Idempotent hit: if the org already exists for this HubSpot company, we
    // return the existing record without mutating lifecycle state. The party
    // lifecycle is never degraded by a sync event.
    const existing = await findOrganizationByHubSpotCompany(txClient, hubspotCompanyId)

    if (existing) {
      return {
        organizationId: existing.organization_id,
        commercialPartyId: existing.commercial_party_id,
        lifecycleStage: existing.lifecycle_stage,
        created: false
      }
    }

    const initialStage = mapHubSpotStage(input.hubspotLifecycleStage)
    const source: LifecycleTransitionSource = 'hubspot_sync'
    const actorId = input.actor.userId ?? (input.actor.system ? 'system' : 'hubspot_sync')
    const organizationId = normalizeOrganizationId()
    const organizationName = input.defaultName?.trim() || `HubSpot Company ${hubspotCompanyId}`

    const inserted = await txClient.query<{
      organization_id: string
      commercial_party_id: string
    }>(
      `INSERT INTO greenhouse_core.organizations (
         organization_id,
         organization_name,
         hubspot_company_id,
         lifecycle_stage,
         lifecycle_stage_since,
         lifecycle_stage_source,
         lifecycle_stage_by,
         active,
         status,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, TRUE, 'active', NOW(), NOW())
       RETURNING organization_id, commercial_party_id::text AS commercial_party_id`,
      [organizationId, organizationName, hubspotCompanyId, initialStage, source, actorId]
    )

    const row = inserted.rows[0]

    if (!row) {
      throw new Error('Failed to insert organization row')
    }

    await txClient.query(
      `INSERT INTO greenhouse_core.organization_lifecycle_history (
         organization_id,
         commercial_party_id,
         from_stage,
         to_stage,
         transition_source,
         transitioned_by,
         metadata
       ) VALUES ($1, $2, NULL, $3, $4, $5, $6::jsonb)`,
      [
        row.organization_id,
        row.commercial_party_id,
        initialStage,
        source,
        actorId,
        JSON.stringify({
          hubspotCompanyId,
          hubspotLifecycleStage: input.hubspotLifecycleStage ?? null
        })
      ]
    )

    await publishPartyCreated(
      {
        commercialPartyId: row.commercial_party_id,
        organizationId: row.organization_id,
        initialStage,
        source,
        hubspotCompanyId
      },
      txClient
    )

    return {
      organizationId: row.organization_id,
      commercialPartyId: row.commercial_party_id,
      lifecycleStage: initialStage,
      created: true
    }
  }

  if (existingClient) {
    return run(existingClient)
  }

  return withTransaction(run)
}

export { HUBSPOT_STAGE_MAP, mapHubSpotStage }
