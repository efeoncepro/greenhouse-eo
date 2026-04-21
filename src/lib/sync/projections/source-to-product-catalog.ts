import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'

// TASK-545 Fase A: scaffolding for the source → product_catalog materializer.
//
// This projection listens to every source-catalog event that can create,
// update, or retire a row in `greenhouse_commercial.product_catalog`. In Fase
// A the consumer is intentionally a no-op: registering the projection is
// enough to prove the pipeline wires through, and handlers only get plugged
// in Fase B (TASK-546).
//
// Design contract for Fase B handlers:
//
//   type SourceHandler = {
//     sourceKind: ProductSourceKind
//     extract(event): GhOwnedFieldsSnapshot & { sourceId: string }
//     commit(tx, snapshot): Promise<{ created: boolean; productId: string }>
//   }
//
// Fase B will replace the stub consumer below with a switch on `eventType`
// that dispatches to the correct handler, computes the checksum via
// `computeGhOwnedFieldsChecksum`, performs the upsert, and emits
// `commercial.product_catalog.{created,updated,archived,unarchived}` via the
// publishers in `src/lib/commercial/product-catalog/product-catalog-events.ts`.
//
// Today the projection is deliberately event-complete (every source emit is
// listed as a trigger) but refresh is a no-op — the reactive worker will see
// each trigger event and log a ' scoped by source_ref' line without mutating
// anything. This is load-bearing for Fase A tests: the point is to verify the
// registry accepts the projection and the trigger list matches reality.

// ── Trigger event list ─────────────────────────────────────────────────────
// Only events that ACTUALLY EXIST today are listed. `commercial.tool.*` and
// `commercial.overhead_addon.*` + `commercial.service.*` are flagged as TODO
// because the publishers don't exist yet:
//   - tool-catalog uses `ai_tool.created` / `ai_tool.updated` via the aiTool
//     aggregate (from seed runs).
//   - overhead_addons-store upserts silently — no publisher today.
//   - service-catalog-store uses `service.created`, `service.updated`,
//     `service.deactivated` under the `service` aggregate.
//
// Fase B will either (a) add the missing publishers before swapping to the
// `commercial.*` namespace, or (b) map existing event types 1:1. For now we
// register the real ones.

const SOURCE_TRIGGER_EVENTS: readonly string[] = [
  // Sellable roles — existing publishers in sellable-roles-store.
  'commercial.sellable_role.created',
  'commercial.sellable_role.cost_updated',
  'commercial.sellable_role.pricing_updated',

  // Tools — existing publishers via tool-catalog-seed.
  'ai_tool.created',
  'ai_tool.updated',

  // Services — existing publishers via service-catalog-store.
  'service.created',
  'service.updated',
  'service.deactivated'

  // TODO Fase B (TASK-546): wire up once overhead-addons gains a publisher.
  // 'commercial.overhead_addon.created',
  // 'commercial.overhead_addon.updated',
  // 'commercial.overhead_addon.deactivated'
] as const

// ── Scope extraction ──────────────────────────────────────────────────────
// Pull the source id from the payload based on the event family. Returning
// null tells the reactive worker to skip without logging a failure.
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

// ── Refresh (no-op in Fase A) ──────────────────────────────────────────────
// The reactive worker logs `[source_to_product_catalog] scaffolded no-op for
// ${entityType}:${entityId}` and returns null (no downstream key to schedule).
// Fase B replaces this body with the actual upsert + publisher emit.
const refresh = async (
  scope: { entityType: string; entityId: string },
  payload: Record<string, unknown>
): Promise<string | null> => {
  if (process.env.NODE_ENV !== 'production') {
    const eventType = typeof payload.eventType === 'string' ? payload.eventType : 'unknown'

    // eslint-disable-next-line no-console
    console.info(
      `[source_to_product_catalog] scaffolded no-op (Fase A) for ${scope.entityType}:${scope.entityId} triggered by ${eventType}`
    )
  }

  return null
}

export const sourceToProductCatalogProjection: ProjectionDefinition = {
  name: 'source_to_product_catalog',
  description:
    'TASK-545 Fase A scaffolding: materialize greenhouse_commercial.product_catalog rows from the 4 source catalogs. Consumer is a no-op until TASK-546 plugs in the per-source handlers.',
  domain: 'cost_intelligence',
  triggerEvents: [...SOURCE_TRIGGER_EVENTS],
  extractScope,
  refresh,
  maxRetries: 2
}

// Exposed for tests + Fase B reference. Callers should NEVER import this to
// run the projection — they should depend on `sourceToProductCatalogProjection`
// and go through the reactive worker.
export const SOURCE_TO_PRODUCT_CATALOG_TRIGGER_EVENTS = SOURCE_TRIGGER_EVENTS
