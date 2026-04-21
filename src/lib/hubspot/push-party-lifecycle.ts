import 'server-only'

import { query } from '@/lib/db'
import { insertPartySyncConflict } from '@/lib/commercial/party/sync-conflicts-store'
import { updateHubSpotGreenhouseCompanyLifecycle } from '@/lib/integrations/hubspot-greenhouse-service'
import { wasWrittenByHubSpotRecently } from '@/lib/sync/anti-ping-pong'
import { resolvePartyFieldAuthority } from '@/lib/sync/field-authority'

import {
  publishPartyHubSpotConflict,
  publishPartyHubSpotSynced
} from './party-hubspot-events'

type PartyHubSpotPushAction = 'lifecycle_update' | 'noop'
type PartyHubSpotPushStatus =
  | 'synced'
  | 'endpoint_not_deployed'
  | 'skipped_no_anchor'
  | 'skipped_hubspot_owned'
  | 'skipped_recent_hubspot_write'
  | 'skipped_operator_override_hold'

interface OrganizationLifecycleSnapshot extends Record<string, unknown> {
  organization_id: string
  commercial_party_id: string | null
  hubspot_company_id: string | null
  lifecycle_stage: string
  lifecycle_stage_source: string | null
  lifecycle_stage_since: string | Date | null
  active_contracts_count: string | number | null
  last_contract_at: string | Date | null
  last_quote_at: string | Date | null
}

export interface PushPartyLifecycleInput {
  organizationId: string
}

export interface PushPartyLifecycleResult {
  status: PartyHubSpotPushStatus
  action: PartyHubSpotPushAction
  organizationId: string
  hubspotCompanyId: string | null
  fieldsWritten: string[]
  reason?: string
}

const ACTIVE_QUOTE_STATUSES = ['issued', 'approved', 'sent']

const toIsoString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString()
}

const loadOrganizationLifecycleSnapshot = async (
  organizationId: string
): Promise<OrganizationLifecycleSnapshot | null> => {
  const rows = await query<OrganizationLifecycleSnapshot>(
    `
      WITH quote_summary AS (
        SELECT
          q.organization_id,
          MAX(COALESCE(q.issued_at, q.quote_date, q.created_at)) FILTER (
            WHERE q.status = ANY($2::text[])
          ) AS last_quote_at,
          COUNT(*) FILTER (WHERE q.status = ANY($2::text[])) AS active_quote_count
        FROM greenhouse_commercial.quotations q
        WHERE q.organization_id = $1
        GROUP BY q.organization_id
      ),
      contract_summary AS (
        SELECT
          c.organization_id,
          MAX(COALESCE(c.signed_at, c.start_date::timestamp, c.created_at)) AS last_contract_at,
          COUNT(*) FILTER (WHERE c.status = 'active') AS active_contracts_count
        FROM greenhouse_commercial.contracts c
        WHERE c.organization_id = $1
        GROUP BY c.organization_id
      )
      SELECT
        o.organization_id,
        o.commercial_party_id,
        o.hubspot_company_id,
        o.lifecycle_stage,
        o.lifecycle_stage_source,
        o.lifecycle_stage_since,
        COALESCE(cs.active_contracts_count, 0) AS active_contracts_count,
        cs.last_contract_at,
        qs.last_quote_at
      FROM greenhouse_core.organizations o
      LEFT JOIN quote_summary qs ON qs.organization_id = o.organization_id
      LEFT JOIN contract_summary cs ON cs.organization_id = o.organization_id
      WHERE o.organization_id = $1
      LIMIT 1
    `,
    [organizationId, ACTIVE_QUOTE_STATUSES]
  )

  return rows[0] ?? null
}

const resolveHubSpotLifecycleStage = (stage: string): string | null => {
  switch (stage) {
    case 'prospect':
      return 'lead'
    case 'opportunity':
      return 'opportunity'
    case 'active_client':
    case 'inactive':
    case 'churned':
      return 'customer'
    default:
      return null
  }
}

const toCount = (value: string | number | null): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const pushPartyLifecycleToHubSpot = async (
  input: PushPartyLifecycleInput
): Promise<PushPartyLifecycleResult> => {
  const snapshot = await loadOrganizationLifecycleSnapshot(input.organizationId)

  if (!snapshot) {
    throw new Error(`Organization not found for lifecycle outbound: ${input.organizationId}`)
  }

  if (!snapshot.hubspot_company_id) {
    return {
      status: 'skipped_no_anchor',
      action: 'noop',
      organizationId: snapshot.organization_id,
      hubspotCompanyId: null,
      fieldsWritten: [],
      reason: 'no_hubspot_company_id'
    }
  }

  const activeContractsCount = toCount(snapshot.active_contracts_count)

  const hasActiveQuoteOrContract =
    Boolean(snapshot.last_quote_at) || activeContractsCount > 0

  const lifecycleFieldOwner = resolvePartyFieldAuthority('lifecyclestage', {
    hasActiveQuoteOrContract
  })

  if (snapshot.lifecycle_stage_source === 'operator_override') {
    const conflict = await insertPartySyncConflict({
      organizationId: snapshot.organization_id,
      commercialPartyId: snapshot.commercial_party_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      conflictType: 'operator_override_hold',
      conflictingFields: { lifecyclestage: snapshot.lifecycle_stage },
      resolutionStatus: 'ignored',
      metadata: { reason: 'operator_override_source' }
    })

    await publishPartyHubSpotConflict({
      commercialPartyId: snapshot.commercial_party_id,
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      conflictType: conflict.conflictType,
      conflictingFields: conflict.conflictingFields,
      resolutionApplied: conflict.resolutionStatus,
      detectedAt: conflict.detectedAt
    })

    return {
      status: 'skipped_operator_override_hold',
      action: 'noop',
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      fieldsWritten: [],
      reason: 'operator_override_source'
    }
  }

  if (lifecycleFieldOwner === 'hubspot') {
    const conflict = await insertPartySyncConflict({
      organizationId: snapshot.organization_id,
      commercialPartyId: snapshot.commercial_party_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      conflictType: 'field_authority',
      conflictingFields: { lifecyclestage: snapshot.lifecycle_stage },
      resolutionStatus: 'resolved_hubspot_wins',
      metadata: { hasActiveQuoteOrContract }
    })

    await publishPartyHubSpotConflict({
      commercialPartyId: snapshot.commercial_party_id,
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      conflictType: conflict.conflictType,
      conflictingFields: conflict.conflictingFields,
      resolutionApplied: conflict.resolutionStatus,
      detectedAt: conflict.detectedAt
    })

    return {
      status: 'skipped_hubspot_owned',
      action: 'noop',
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      fieldsWritten: [],
      reason: 'hubspot_owns_lifecyclestage'
    }
  }

  if (wasWrittenByHubSpotRecently(snapshot.lifecycle_stage_since, 60)) {
    const conflict = await insertPartySyncConflict({
      organizationId: snapshot.organization_id,
      commercialPartyId: snapshot.commercial_party_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      conflictType: 'anti_ping_pong',
      conflictingFields: { lifecyclestage: snapshot.lifecycle_stage },
      resolutionStatus: 'resolved_hubspot_wins',
      metadata: { recentHubSpotWriteAt: toIsoString(snapshot.lifecycle_stage_since) }
    })

    await publishPartyHubSpotConflict({
      commercialPartyId: snapshot.commercial_party_id,
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      conflictType: conflict.conflictType,
      conflictingFields: conflict.conflictingFields,
      resolutionApplied: conflict.resolutionStatus,
      detectedAt: conflict.detectedAt
    })

    return {
      status: 'skipped_recent_hubspot_write',
      action: 'noop',
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      fieldsWritten: [],
      reason: 'recent_hubspot_write'
    }
  }

  const ghLastWriteAt = new Date().toISOString()
  const lifecycleStage = resolveHubSpotLifecycleStage(snapshot.lifecycle_stage)

  const response = await updateHubSpotGreenhouseCompanyLifecycle(snapshot.hubspot_company_id, {
    organizationId: snapshot.organization_id,
    commercialPartyId: snapshot.commercial_party_id,
    lifecycleStage,
    lastQuoteAt: toIsoString(snapshot.last_quote_at),
    lastContractAt: toIsoString(snapshot.last_contract_at),
    activeContractsCount,
    ghLastWriteAt,
    mrrTier: snapshot.lifecycle_stage === 'active_client' ? 'active_client' : null
  })

  if (response.status === 'endpoint_not_deployed') {
    await publishPartyHubSpotSynced({
      commercialPartyId: snapshot.commercial_party_id ?? snapshot.organization_id,
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      lifecycleStage,
      fieldsWritten: [],
      syncedAt: ghLastWriteAt,
      endpointNotDeployed: true
    })

    return {
      status: 'endpoint_not_deployed',
      action: 'lifecycle_update',
      organizationId: snapshot.organization_id,
      hubspotCompanyId: snapshot.hubspot_company_id,
      fieldsWritten: [],
      reason: response.message
    }
  }

  await publishPartyHubSpotSynced({
    commercialPartyId: snapshot.commercial_party_id ?? snapshot.organization_id,
    organizationId: snapshot.organization_id,
    hubspotCompanyId: snapshot.hubspot_company_id,
    lifecycleStage,
    fieldsWritten: response.fieldsWritten,
    syncedAt: ghLastWriteAt
  })

  return {
    status: 'synced',
    action: 'lifecycle_update',
    organizationId: snapshot.organization_id,
    hubspotCompanyId: snapshot.hubspot_company_id,
    fieldsWritten: response.fieldsWritten
  }
}
