/**
 * TASK-1777 — La condición de disparo del drill-down de enlaces. EL CORAZÓN DE LA TASK.
 *
 * Pedir el detalle nominal (`referring_domains` + `anchors` + movimiento) cuesta ~USD 0.05–0.10
 * por target. Lo caro no es el detalle: es pedirlo para toda la cartera todas las semanas
 * aunque nada se haya movido. Este predicado decide si vale la pena bajar, leyendo el
 * `new_lost_delta` que el snapshot semanal YA persiste y el delta de dominios referentes
 * contra el snapshot anterior.
 *
 * 🔴 Predicado PURO: sin red, sin DB, sin reloj. Es la pieza que controla el gasto y por eso
 * existe y está testeada ANTES de que exista código capaz de gastar (Slice ordering hard rule).
 *
 * Reglas (Detailed Spec §1):
 *   - snapshot `partial` (delta vacío/no confiable) → NO disparar: disparar "por si acaso"
 *     convierte una falla del proveedor en gasto;
 *   - primera vez (sin drill-down previo) → disparar UNA vez: sin línea base no hay delta;
 *   - movimiento de backlinks (new+lost) o de dominios referentes sobre el umbral → disparar;
 *   - si no → `skipped_no_movement`, que es INFORMACIÓN ("el perfil estuvo estable"), no un hueco.
 */

import 'server-only'

/** Umbrales por configuración; el operador los confirma antes del flip (Out-of-band). */
export const BACKLINK_DRILLDOWN_MIN_BACKLINK_MOVEMENT_KNOB = 'GROWTH_SEO_BACKLINK_DRILLDOWN_MIN_BACKLINK_MOVEMENT'
export const BACKLINK_DRILLDOWN_MIN_REFDOMAIN_MOVEMENT_KNOB = 'GROWTH_SEO_BACKLINK_DRILLDOWN_MIN_REFDOMAIN_MOVEMENT'

export const DEFAULT_MIN_BACKLINK_MOVEMENT = 10
export const DEFAULT_MIN_REFDOMAIN_MOVEMENT = 3

export interface DrillDownConfig {
  /** new + lost backlinks de la ventana del proveedor que ameritan detalle. */
  minBacklinkMovement: number
  /** |Δ referring_domains| contra el snapshot anterior que amerita detalle. */
  minReferringDomainMovement: number
}

const asPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export const resolveDrillDownConfig = (env: NodeJS.ProcessEnv = process.env): DrillDownConfig => ({
  minBacklinkMovement: asPositiveInt(env[BACKLINK_DRILLDOWN_MIN_BACKLINK_MOVEMENT_KNOB], DEFAULT_MIN_BACKLINK_MOVEMENT),
  minReferringDomainMovement: asPositiveInt(
    env[BACKLINK_DRILLDOWN_MIN_REFDOMAIN_MOVEMENT_KNOB],
    DEFAULT_MIN_REFDOMAIN_MOVEMENT
  )
})

/** Vista del snapshot que el predicado necesita (lo carga el pase, no el predicado). */
export interface DrillDownSnapshotView {
  referringDomains: number | null
  /** `new_lost_delta` tal como se persiste: `{}` cuando el delta no llegó (snapshot partial). */
  newLostDelta: Record<string, unknown>
}

export type DrillDownDecision =
  | { drill: true; reason: 'first_time' | 'backlink_movement' | 'referring_domain_movement' }
  | { drill: false; reason: 'partial_snapshot' | 'no_movement' }

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * Decide si un snapshot amerita drill-down.
 *
 * `previous` es el snapshot inmediatamente anterior del mismo target (null si no existe);
 * `hasPriorDetail` dice si ese target ya tuvo algún drill-down (la regla de primera vez).
 */
export const shouldDrillDownBacklinks = (
  input: {
    snapshot: DrillDownSnapshotView
    previous: { referringDomains: number | null } | null
    hasPriorDetail: boolean
  },
  config: DrillDownConfig
): DrillDownDecision => {
  const delta = input.snapshot.newLostDelta ?? {}
  const newBacklinks = toFiniteNumber(delta.newBacklinks)
  const lostBacklinks = toFiniteNumber(delta.lostBacklinks)

  // Delta ausente = snapshot `partial`: sin dato confiable NO se decide gastar. Va ANTES que
  // la regla de primera vez a propósito — una falla del proveedor en el primer snapshot de un
  // target no debe convertirse en gasto "por si acaso".
  if (newBacklinks === null && lostBacklinks === null) {
    return { drill: false, reason: 'partial_snapshot' }
  }

  // Primera vez: sin línea base no hay delta que medir. Una vez, para fundar la base.
  if (!input.hasPriorDetail) {
    return { drill: true, reason: 'first_time' }
  }

  const backlinkMovement = Math.abs(newBacklinks ?? 0) + Math.abs(lostBacklinks ?? 0)

  if (backlinkMovement >= config.minBacklinkMovement) {
    return { drill: true, reason: 'backlink_movement' }
  }

  const current = input.snapshot.referringDomains
  const previous = input.previous?.referringDomains ?? null

  if (current !== null && previous !== null && Math.abs(current - previous) >= config.minReferringDomainMovement) {
    return { drill: true, reason: 'referring_domain_movement' }
  }

  return { drill: false, reason: 'no_movement' }
}
