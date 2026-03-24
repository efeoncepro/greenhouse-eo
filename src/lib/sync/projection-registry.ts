import 'server-only'

/**
 * Projection Registry — maps domain events to serving projections that need refresh.
 *
 * Each projection declares:
 * - Which outbox event types trigger a refresh
 * - How to extract the entity scope from the event payload (e.g., organizationId, memberId)
 * - The refresh function to call (idempotent, safe for re-runs)
 * - Max retries before dead-lettering
 *
 * The reactive consumer iterates this registry instead of hardcoding handlers.
 */

export interface ProjectionDefinition {
  /** Unique name for logging and observability */
  name: string

  /** Human description */
  description: string

  /** Domain event types that trigger this projection */
  triggerEvents: string[]

  /** Extract entity scope from event payload. Returns null to skip. */
  extractScope: (payload: Record<string, unknown>) => { entityType: string; entityId: string } | null

  /** Idempotent refresh function. Receives the scoped entity. */
  refresh: (scope: { entityType: string; entityId: string }, payload: Record<string, unknown>) => Promise<string | null>

  /** Max retries before marking as dead-letter (default: 2) */
  maxRetries?: number
}

// ── Registry ──

const registry: ProjectionDefinition[] = []

export const registerProjection = (def: ProjectionDefinition): void => {
  registry.push(def)
}

export const getRegisteredProjections = (): readonly ProjectionDefinition[] => registry

export const getProjectionsForEvent = (eventType: string): ProjectionDefinition[] =>
  registry.filter(p => p.triggerEvents.includes(eventType))

export const getAllTriggerEventTypes = (): string[] =>
  [...new Set(registry.flatMap(p => p.triggerEvents))]
