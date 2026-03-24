import 'server-only'

/**
 * Projection Registry — maps domain events to serving projections that need refresh.
 *
 * Each projection declares:
 * - Which outbox event types trigger a refresh
 * - How to extract the entity scope from the event payload
 * - The refresh function to call (idempotent, safe for re-runs)
 * - Max retries before dead-lettering
 * - Domain partition for parallel cron execution
 */

export type ProjectionDomain = 'organization' | 'people' | 'finance' | 'notifications' | 'delivery'

export interface ProjectionDefinition {
  /** Unique name for logging and observability */
  name: string

  /** Human description */
  description: string

  /** Domain partition — crons can filter by domain for parallel execution */
  domain: ProjectionDomain

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

export const getProjectionsForEvent = (eventType: string, domain?: ProjectionDomain): ProjectionDefinition[] =>
  registry.filter(p =>
    p.triggerEvents.includes(eventType) &&
    (domain === undefined || p.domain === domain)
  )

export const getAllTriggerEventTypes = (domain?: ProjectionDomain): string[] =>
  [...new Set(
    registry
      .filter(p => domain === undefined || p.domain === domain)
      .flatMap(p => p.triggerEvents)
  )]

export const getRegisteredDomains = (): ProjectionDomain[] =>
  [...new Set(registry.map(p => p.domain))]
