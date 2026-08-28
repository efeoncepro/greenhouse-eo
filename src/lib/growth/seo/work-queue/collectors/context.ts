import 'server-only'

/**
 * TASK-1700 — Contexto compartido por los colectores.
 *
 * Cada colector es independiente y aislado: recibe lo que necesita, devuelve
 * `{ items, health }` y **nunca lanza hacia el materializador**. Un origen caído degrada su
 * propia salud y no toca el score ni el orden de los demás.
 */

import type { SeoWorkQueueDecision, SeoWorkQueueOrigin } from '../contracts'
import type { OrgCtrCurve } from '../priority-score'
import type { PriorityScoreConfig } from '../score-versions'

export interface SeoWorkQueueCollectorContext {
  seoTargetId: string
  organizationId: string
  /** Curva de CTR propia, leída UNA vez por corrida y compartida por todos los colectores. */
  curve: OrgCtrCurve
  config: PriorityScoreConfig
  /**
   * Última decisión por sujeto. La clave es `${origin}::${normalizedKeyword}` — el MISMO
   * anclaje que usa `seo_work_queue_decisions`, porque los items se regeneran en cada
   * snapshot y una clave por `item_id` moriría mañana.
   */
  latestDecisions: Map<string, SeoWorkQueueDecision>
  env: NodeJS.ProcessEnv
}

export const decisionKey = (origin: SeoWorkQueueOrigin, normalizedKeyword: string): string =>
  `${origin}::${normalizedKeyword}`

/**
 * Decisiones que RETIRAN el sujeto de los snapshots siguientes.
 *
 * `dismissed` y `done` son terminales: reproponerlos convierte la cola en ruido y le enseña
 * al operador que decidir no sirve de nada. `deferred` y `accepted` siguen apareciendo a
 * propósito — "después" sin fecha no es "nunca", y algo aceptado sigue siendo trabajo vivo
 * hasta que alguien lo marque hecho.
 */
const TERMINAL_DECISIONS: ReadonlySet<SeoWorkQueueDecision> = new Set(['dismissed', 'done'])

export const isRetiredSubject = (
  ctx: SeoWorkQueueCollectorContext,
  origin: SeoWorkQueueOrigin,
  normalizedKeyword: string
): boolean => {
  const decision = ctx.latestDecisions.get(decisionKey(origin, normalizedKeyword))

  return decision !== undefined && TERMINAL_DECISIONS.has(decision)
}

/** Salud `ok` con conteo. Azúcar para no repetir el literal en seis colectores. */
export const healthy = (
  origin: SeoWorkQueueOrigin,
  itemCount: number,
  asOf: string | null = null
) => ({ origin, state: 'ok' as const, reason: null, asOf, itemCount })

/** Salud degradada/caída. `reason` es OBLIGATORIA: "degradado" sin razón es un hueco mudo. */
export const unhealthy = (
  origin: SeoWorkQueueOrigin,
  state: 'degraded' | 'down',
  reason: string,
  itemCount = 0,
  asOf: string | null = null
) => ({ origin, state, reason, asOf, itemCount })
