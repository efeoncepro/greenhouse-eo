import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import {
  isAutoMaterializableSourceKind,
  isProductSyncEnabled,
  type AutoMaterializableSourceKind
} from '@/lib/commercial/product-catalog/flags'
import type { UpsertProductCatalogFromSourceResult } from '@/lib/commercial/product-catalog/upsert-product-catalog-from-source'
import { handleOverheadAddonToProduct } from '@/lib/sync/handlers/overhead-addon-to-product'
import { handleSellableRoleToProduct } from '@/lib/sync/handlers/sellable-role-to-product'
import { handleServiceToProduct } from '@/lib/sync/handlers/service-to-product'
import { handleToolToProduct } from '@/lib/sync/handlers/tool-to-product'

import type { ProjectionDefinition } from '../projection-registry'

// TASK-546 Fase B — replaces the TASK-545 scaffolded no-op. This projection
// listens to every source catalog event that creates / updates / retires a
// row in `greenhouse_commercial.product_catalog` and dispatches to the
// corresponding per-source handler under a feature sub-flag.
//
// Runtime topology: Cloud Run ops-worker (`cost_intelligence` domain). The
// reactive consumer picks up outbox events matching the trigger list and
// invokes `refresh(scope, payload)` for each.
//
// Sub-flags (OFF by default):
//   GREENHOUSE_PRODUCT_SYNC_ROLES
//   GREENHOUSE_PRODUCT_SYNC_TOOLS
//   GREENHOUSE_PRODUCT_SYNC_OVERHEADS
//   GREENHOUSE_PRODUCT_SYNC_SERVICES
//
// Enrollment plan: roles first, validate 48h, then tools, then overheads,
// then services. Each sub-flag can be toggled independently.

// ── Trigger event list ────────────────────────────────────────────────────
// Includes every lifecycle event emitted by the 4 source catalogs that
// impacts the product_catalog snapshot. Sellable role pricing events trigger
// rematerialization because the role's `default_unit_price` is sourced from
// the latest USD pricing row.

const SOURCE_TRIGGER_EVENTS: readonly string[] = [
  // Sellable roles
  'commercial.sellable_role.created',
  'commercial.sellable_role.updated',
  'commercial.sellable_role.cost_updated',
  'commercial.sellable_role.pricing_updated',
  'commercial.sellable_role.deactivated',
  'commercial.sellable_role.reactivated',

  // AI Tools
  'ai_tool.created',
  'ai_tool.updated',
  'ai_tool.deactivated',
  'ai_tool.reactivated',

  // Overhead Addons (TASK-546 added full lifecycle publishers)
  'commercial.overhead_addon.created',
  'commercial.overhead_addon.updated',
  'commercial.overhead_addon.deactivated',
  'commercial.overhead_addon.reactivated',

  // Services
  'service.created',
  'service.updated',
  'service.deactivated'
] as const

// ── Scope extraction ──────────────────────────────────────────────────────
// Map the event payload to a `{entityType, entityId}` tuple that the worker
// uses for logging and dedupe keys. The entityType aligns with
// `AutoMaterializableSourceKind` so the refresh dispatcher can cast safely.
const extractScope = (
  payload: Record<string, unknown>
): { entityType: string; entityId: string } | null => {
  const roleId = payload.roleId ?? payload.role_id

  if (typeof roleId === 'string' && roleId.length > 0) {
    return { entityType: 'sellable_role', entityId: roleId }
  }

  const toolId = payload.toolId ?? payload.tool_id

  if (typeof toolId === 'string' && toolId.length > 0) {
    return { entityType: 'tool', entityId: toolId }
  }

  const moduleId = payload.moduleId ?? payload.module_id ?? payload.serviceId ?? payload.service_id

  if (typeof moduleId === 'string' && moduleId.length > 0) {
    return { entityType: 'service', entityId: moduleId }
  }

  const addonId = payload.addonId ?? payload.addon_id

  if (typeof addonId === 'string' && addonId.length > 0) {
    return { entityType: 'overhead_addon', entityId: addonId }
  }

  return null
}

// ── Handler dispatcher ────────────────────────────────────────────────────
type HandlerResult = {
  status: 'applied' | 'skipped_not_found' | 'skipped_not_sellable'
  result?: UpsertProductCatalogFromSourceResult
}

const runHandler = async (
  client: PoolClient,
  sourceKind: AutoMaterializableSourceKind,
  entityId: string
): Promise<HandlerResult> => {
  switch (sourceKind) {
    case 'sellable_role':
      return handleSellableRoleToProduct(client, entityId)
    case 'tool':
      return handleToolToProduct(client, entityId)
    case 'overhead_addon':
      return handleOverheadAddonToProduct(client, entityId)
    case 'service':
      return handleServiceToProduct(client, entityId)
  }
}

// ── Refresh ──────────────────────────────────────────────────────────────
// The second parameter (payload) is declared by `ProjectionDefinition` but
// unused here: handlers re-query the source table by id rather than trusting
// the outbox payload (which carries only the id anyway).
const refresh = async (
  scope: { entityType: string; entityId: string },
  _payload: Record<string, unknown>
): Promise<string | null> => {
  void _payload


  if (!isAutoMaterializableSourceKind(scope.entityType)) {
    return `skip:unknown_source_kind:${scope.entityType}`
  }

  if (!isProductSyncEnabled(scope.entityType)) {
    return `skip:flag_disabled:${scope.entityType}`
  }

  const handlerResult = await withTransaction(async client =>
    runHandler(client, scope.entityType as AutoMaterializableSourceKind, scope.entityId)
  )

  if (handlerResult.status !== 'applied') {
    return `skip:${handlerResult.status}:${scope.entityType}:${scope.entityId}`
  }

  const outcome = handlerResult.result?.outcome ?? 'unknown'
  const productId = handlerResult.result?.productId ?? 'unknown'

  return `${outcome}:${scope.entityType}:${scope.entityId}:${productId}`
}

export const sourceToProductCatalogProjection: ProjectionDefinition = {
  name: 'source_to_product_catalog',
  description:
    'TASK-546 Fase B: materialize greenhouse_commercial.product_catalog rows from the 4 source catalogs (sellable_roles, tool_catalog, overhead_addons, service_pricing). Gated by per-source sub-flags.',
  domain: 'cost_intelligence',
  triggerEvents: [...SOURCE_TRIGGER_EVENTS],
  extractScope,
  refresh,
  maxRetries: 2
}

// Exposed for tests + Fase C reference. Callers should NEVER import this to
// run the projection — they should depend on `sourceToProductCatalogProjection`
// and go through the reactive worker.
export const SOURCE_TO_PRODUCT_CATALOG_TRIGGER_EVENTS = SOURCE_TRIGGER_EVENTS
