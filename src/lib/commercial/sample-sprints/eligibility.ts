import 'server-only'

import type { PoolClient } from 'pg'

export type EngagementServiceIneligibilityReason =
  | 'not_found'
  | 'inactive'
  | 'legacy_seed_archived'
  | 'unmapped'

export interface EngagementServiceEligibilityRow extends Record<string, unknown> {
  service_id: string
  active: boolean
  status: string
  hubspot_sync_status: string | null
}

export class ServiceNotEligibleForEngagementError extends Error {
  constructor(
    message: string,
    readonly serviceId: string,
    readonly reasonCode: EngagementServiceIneligibilityReason
  ) {
    super(message)
    this.name = 'ServiceNotEligibleForEngagementError'
  }
}

export const mapEngagementServiceEligibilityFailure = (
  serviceId: string,
  row: EngagementServiceEligibilityRow | undefined
) => {
  if (!row) {
    return new ServiceNotEligibleForEngagementError(
      `Service ${serviceId} does not exist.`,
      serviceId,
      'not_found'
    )
  }

  if (row.status === 'legacy_seed_archived') {
    return new ServiceNotEligibleForEngagementError(
      `Service ${serviceId} is a TASK-813 legacy seed archive and cannot receive engagement operations.`,
      serviceId,
      'legacy_seed_archived'
    )
  }

  if (!row.active) {
    return new ServiceNotEligibleForEngagementError(
      `Service ${serviceId} is inactive and cannot receive engagement operations.`,
      serviceId,
      'inactive'
    )
  }

  if (row.hubspot_sync_status === 'unmapped') {
    return new ServiceNotEligibleForEngagementError(
      `Service ${serviceId} is unmapped from HubSpot and cannot receive engagement operations.`,
      serviceId,
      'unmapped'
    )
  }

  return null
}

export const assertEngagementServiceEligible = async (
  client: PoolClient,
  serviceId: string
): Promise<void> => {
  const result = await client.query<EngagementServiceEligibilityRow>(
    `SELECT service_id, active, status, hubspot_sync_status
     FROM greenhouse_core.services
     WHERE service_id = $1
     LIMIT 1`,
    [serviceId]
  )

  const failure = mapEngagementServiceEligibilityFailure(serviceId, result.rows[0])

  if (failure) throw failure
}

export const buildEligibleServicePredicate = (alias = 's') => {
  return `${alias}.active = TRUE
    AND ${alias}.status != 'legacy_seed_archived'
    AND ${alias}.hubspot_sync_status IS DISTINCT FROM 'unmapped'`
}
