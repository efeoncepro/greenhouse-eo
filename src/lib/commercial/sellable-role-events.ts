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

// TASK-546 Fase B: lifecycle transitions so source-to-product-catalog can
// archive/unarchive the materialized product when a role toggles active.
export const publishSellableRoleDeactivated = async (
  params: {
    roleId: string
    roleSku: string
    deactivatedAt: string
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.sellableRole,
      aggregateId: params.roleId,
      eventType: EVENT_TYPES.sellableRoleDeactivated,
      payload: params
    },
    client
  )

export const publishSellableRoleReactivated = async (
  params: {
    roleId: string
    roleSku: string
    reactivatedAt: string
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.sellableRole,
      aggregateId: params.roleId,
      eventType: EVENT_TYPES.sellableRoleReactivated,
      payload: params
    },
    client
  )
