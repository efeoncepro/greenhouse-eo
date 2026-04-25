import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

// TASK-546 Fase B: overhead_addons never published outbox events before. The
// store did a silent upsert, which meant the source_to_product_catalog
// projection could not observe addon lifecycle. These publishers are the
// homogeneous contract for materialization: created/updated/deactivated carry
// the addon id + sku so the materializer can re-read the row and re-apply the
// GH-owned field snapshot + checksum.

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

export const publishOverheadAddonCreated = async (
  params: {
    addonId: string
    addonSku: string
    addonName: string
    addonType: string
    visibleToClient: boolean
    active: boolean
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.overheadAddon,
      aggregateId: params.addonId,
      eventType: EVENT_TYPES.overheadAddonCreated,
      payload: params
    },
    client
  )

export const publishOverheadAddonUpdated = async (
  params: {
    addonId: string
    addonSku: string
    addonName: string
    addonType: string
    visibleToClient: boolean
    active: boolean
    changedFields?: string[]
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.overheadAddon,
      aggregateId: params.addonId,
      eventType: EVENT_TYPES.overheadAddonUpdated,
      payload: params
    },
    client
  )

export const publishOverheadAddonDeactivated = async (
  params: {
    addonId: string
    addonSku: string
    deactivatedAt: string
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.overheadAddon,
      aggregateId: params.addonId,
      eventType: EVENT_TYPES.overheadAddonDeactivated,
      payload: params
    },
    client
  )

export const publishOverheadAddonReactivated = async (
  params: {
    addonId: string
    addonSku: string
    reactivatedAt: string
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.overheadAddon,
      aggregateId: params.addonId,
      eventType: EVENT_TYPES.overheadAddonReactivated,
      payload: params
    },
    client
  )
