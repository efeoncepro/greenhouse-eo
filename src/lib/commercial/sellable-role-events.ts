import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

export const publishSellableRoleCreated = async (
  params: {
    roleId: string
    roleSku: string
    roleCode: string
    roleLabelEs: string
    category: string
    tier: string
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.sellableRole,
      aggregateId: params.roleId,
      eventType: EVENT_TYPES.sellableRoleCreated,
      payload: params
    },
    client
  )

export const publishSellableRoleCostUpdated = async (
  params: {
    roleId: string
    roleSku: string
    employmentTypeCode: string
    effectiveFrom: string
    totalMonthlyCostUsd: number
    hourlyCostUsd: number
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.sellableRole,
      aggregateId: params.roleId,
      eventType: EVENT_TYPES.sellableRoleCostUpdated,
      payload: params
    },
    client
  )

export const publishSellableRolePricingUpdated = async (
  params: {
    roleId: string
    roleSku: string
    currencyCode: string
    effectiveFrom: string
    hourlyPrice: number
    fteMonthlyPrice: number
    marginPct: number
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.sellableRole,
      aggregateId: params.roleId,
      eventType: EVENT_TYPES.sellableRolePricingUpdated,
      payload: params
    },
    client
  )
