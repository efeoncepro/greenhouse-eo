/**
 * TASK-1129 — Contrato de telemetría de turno de Nexa.
 *
 * Una respuesta de Nexa registra QUÉ runtime la produjo y bajo qué condiciones: versión/familia
 * del prompt (TASK-1124), provider plan + provider/modelo resuelto + failover (TASK-1091/1134),
 * latencias, tools usados + availability, outcome y resultado de sugerencias. Es **observabilidad**,
 * NO contenido de conversación: NUNCA incluye el prompt completo, el texto de respuesta, los tool
 * results crudos ni secretos. Tokens/costo quedan `null` hasta que el SDK exponga usage estable
 * (el `contractVersion` versiona el shape para esa evolución).
 *
 * Módulo de tipos puro (sin `server-only`): `NexaResponse` lo referencia y el cliente lo consume.
 */

export const NEXA_TURN_TELEMETRY_CONTRACT_VERSION = 'nexa-turn-telemetry.v1'

/** Outcome del turno. Por el flujo actual, solo `success`/`graceful_fallback`/`tool_degraded`
 *  llegan a persistirse (los hard-fail `provider_failed`/`aborted` lanzan antes de persistir y
 *  quedan cubiertos por `captureWithDomain('home')`, TASK-1131). El enum los declara igual. */
export type NexaTurnOutcome =
  | 'success'
  | 'graceful_fallback'
  | 'tool_degraded'
  | 'provider_failed'
  | 'aborted'

export type NexaSuggestionOutcome = 'generated' | 'empty' | 'failed'

export interface NexaTurnProviderStepTelemetry {
  providerKey: string
  model: string
  latencyMs: number
  ok: boolean
}

export interface NexaTurnToolTelemetry {
  toolName: string
  available: boolean
}

export interface NexaTurnTelemetry {
  contractVersion: string
  /** Governance del prompt con que se generó la respuesta. */
  promptVersion: string
  promptFamily: string
  /** Provider primario del plan (primer step). */
  primaryProvider: string
  /** Provider/modelo que terminó el turno (null solo si no resolvió ninguno). */
  resolvedProvider: string | null
  resolvedModel: string | null
  providerStepCount: number
  didFailover: boolean
  failoverFrom: string | null
  outcome: NexaTurnOutcome
  totalLatencyMs: number
  /** Nombres de tools invocados + cuántos (availability detallada en `detail.tools`). */
  toolsUsed: string[]
  toolCount: number
  suggestionCount: number
  suggestionOutcome: NexaSuggestionOutcome | null
  /** Detalle rico (sin contenido sensible): latencia por step, availability por tool, usage placeholder. */
  detail: {
    providerSteps: NexaTurnProviderStepTelemetry[]
    tools: NexaTurnToolTelemetry[]
    /** Placeholder de tokens/costo: el SDK aún no expone usage estable (contractVersion lo versiona). */
    usage: { tokens: number | null; costUsd: number | null }
  }
}
