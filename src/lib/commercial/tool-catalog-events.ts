import type { PoolClient } from 'pg'

import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

type ActiveLicenseEventRow = {
  license_id: string
  member_id: string
  tool_id: string
  activated_at: string | Date | null
  expires_at: string | Date | null
}

const toIsoDate = (value: string | Date | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const getCurrentSantiagoPeriod = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  if (!match) {
    const now = new Date()

    return { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1 }
  }

  return { periodYear: Number(match[1]), periodMonth: Number(match[2]) }
}

const getActiveLicenseScopesForTool = async (toolId: string, client: PoolClient) => {
  const result = await client.query<ActiveLicenseEventRow>(
    `
      SELECT license_id, member_id, tool_id, activated_at, expires_at
      FROM greenhouse_ai.member_tool_licenses
      WHERE tool_id = $1
        AND license_status = 'active'
      ORDER BY member_id ASC, license_id ASC
    `,
    [toolId]
  )

  return result.rows
}

export interface PublishToolCatalogEventsInput {
  client: PoolClient
  toolId: string
  providerId: string
  created: boolean
  costImpactChanged: boolean
}

export const publishToolCatalogSeedEvents = async (input: PublishToolCatalogEventsInput) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.aiTool,
      aggregateId: input.toolId,
      eventType: input.created ? EVENT_TYPES.aiToolCreated : EVENT_TYPES.aiToolUpdated,
      payload: {
        toolId: input.toolId,
        providerId: input.providerId
      }
    },
    input.client
  )

  if (!input.costImpactChanged) {
    return
  }

  const activeLicenses = await getActiveLicenseScopesForTool(input.toolId, input.client)
  const period = getCurrentSantiagoPeriod()

  for (const license of activeLicenses) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.financeLicenseCost,
        aggregateId: license.license_id,
        eventType: EVENT_TYPES.financeLicenseCostUpdated,
        payload: {
          licenseId: license.license_id,
          memberId: license.member_id,
          toolId: license.tool_id,
          providerId: input.providerId,
          activatedAt: toIsoDate(license.activated_at),
          expiresAt: toIsoDate(license.expires_at),
          ...period
        }
      },
      input.client
    )
  }
}

// TASK-546 Fase B: lifecycle transitions so source-to-product-catalog can
// archive/unarchive the materialized product when a tool toggles active.
type LifecycleClient = Parameters<typeof publishOutboxEvent>[1]

export const publishAiToolDeactivated = async (
  params: {
    toolId: string
    providerId: string
    deactivatedAt: string
  },
  client?: LifecycleClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.aiTool,
      aggregateId: params.toolId,
      eventType: EVENT_TYPES.aiToolDeactivated,
      payload: params
    },
    client
  )

export const publishAiToolReactivated = async (
  params: {
    toolId: string
    providerId: string
    reactivatedAt: string
  },
  client?: LifecycleClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.aiTool,
      aggregateId: params.toolId,
      eventType: EVENT_TYPES.aiToolReactivated,
      payload: params
    },
    client
  )
