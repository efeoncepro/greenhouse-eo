import 'server-only'

/**
 * TASK-1762 Slice 1 — modelo de capacidad de una vacante.
 *
 * ADR: `docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md` (Accepted 2026-08-23).
 *
 * 🔴 **Este módulo NO es dueño del número de cupos.** El conteo vive en
 * `hiring_opening.requested_seats` desde `TASK-353`, y el operador lo lee y lo edita bajo la
 * etiqueta «Cupos» en el Demand Desk. Lo que esta capa aporta es la GOBERNANZA de ese número:
 * opt-in explícito, actor, razón y audit.
 *
 * Duplicar el conteo acá habría creado un segundo «Cupos» decidiendo el cierre de una cohorte real
 * mientras la pantalla que el operador usa muestra el primero — la misma clase de defecto que este
 * dominio ya corrigió tres veces (`sent` ≠ entregado; etapa ≠ desenlace; estado de la vacante ≠
 * desenlace de la persona).
 */

/**
 * Estado de gobernanza de una vacante.
 *
 * `unmanaged` es el estado por defecto y se deriva de la AUSENCIA de política vigente, nunca de un
 * `NULL` en un conteo. Una vacante sin política no tiene automatización de cierre, y esa ausencia
 * jamás se interpreta como «un cupo».
 */
export type OpeningCapacityManagementState = 'unmanaged' | 'managed'

export interface OpeningCapacityPolicy {
  openingId: string
  managedSince: string
  setByUserId: string
  reason: string
  policyVersion: number
}

export interface OpeningCapacityStatus {
  openingId: string
  publicId: string
  state: OpeningCapacityManagementState
  /**
   * Objetivo de cupos: `hiring_opening.requested_seats`. Se expone acá para que ningún consumidor
   * tenga que ir a buscarlo por su cuenta, pero el dueño del dato sigue siendo la vacante.
   */
  targetSeats: number
  /**
   * Cupos ocupados, DERIVADOS de decisiones vigentes `selected`. No existe contador mutable
   * paralelo: si alguien re-decide una candidatura, este número cambia solo.
   */
  occupiedSeats: number
  remainingSeats: number
  /** `true` sólo cuando la vacante está gobernada Y no quedan cupos. */
  capacityFilled: boolean
  /**
   * Candidaturas que siguen en proceso activo, con el predicado canónico
   * (`activeProcessPredicate`): sin desenlace vigente Y no archivadas. Es el tamaño máximo que
   * podría tener la cohorte de un cierre; la cohorte exacta la calcula el preview de Slice 2.
   */
  activeApplications: number
  policy: OpeningCapacityPolicy | null
}
