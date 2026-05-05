import 'server-only'

/**
 * TASK-785 — Workforce Role Title canonical types.
 *
 * Tres capas distintas de "cargo" en Greenhouse:
 *   1. identity_profiles.job_title       (Entra/Graph enrichment)
 *   2. members.role_title                (HR operativo Greenhouse — source of truth laboral)
 *   3. client_team_assignments.role_title_override (titulo cliente-facing por asignacion)
 *
 * Este modulo gobierna la (2): mutacion + audit + drift detection vs (1).
 */

/** Origen del valor actual en `members.role_title`. */
export type RoleTitleSource =
  | 'unset'
  | 'entra'
  | 'hr_manual'
  | 'migration'
  | 'self_declared_pending'

/** Contexto en el que se consulta el cargo (resolver canonico). */
export type RoleTitleContext =
  | 'internal_profile'
  | 'client_assignment'
  | 'payroll_document'
  | 'commercial_cost'
  | 'staffing'
  | 'identity_admin'

/** Action en el audit log. */
export type RoleTitleAuditAction =
  | 'declared'
  | 'updated'
  | 'drift_proposed'
  | 'drift_accepted_entra'
  | 'drift_kept_hr'
  | 'drift_dismissed'
  | 'reverted'

/** Snapshot de cargo resuelto para un contexto. */
export interface RoleTitleResolution {
  /** Valor de cargo a mostrar / usar para el contexto. */
  value: string | null
  /** Source efectivo del valor resuelto. */
  source: RoleTitleSource
  /** Etiqueta humana corta del source para mostrar como contexto en UI. */
  sourceLabel: string
  /** Indica si hay drift sin resolver con Entra (solo relevante en internal_profile). */
  hasDriftWithEntra: boolean
  /** Cargo override de cliente cuando aplique (null fuera de client_assignment). */
  assignmentOverride?: string | null
}

/** Drift entre Entra y Greenhouse — input al detector. */
export interface RoleTitleDriftSignal {
  memberId: string
  currentRoleTitle: string | null
  currentSource: RoleTitleSource
  proposedFromEntra: string | null
  hasDrift: boolean
  driftKind: 'entra_overwrite_blocked' | 'entra_value_diverges' | 'entra_cleared_hr_value' | null
}

/** Mutation input — gobernada via capability + audit. */
export interface UpdateMemberRoleTitleInput {
  memberId: string
  newRoleTitle: string | null
  /** Razon del cambio (>= 10 chars). Queda en audit log. */
  reason: string
  /** Fecha efectiva del cambio (default: now). Para historico. */
  effectiveAt?: Date
  /** Actor HR que dispara el cambio (capability validada upstream). */
  actorUserId: string
  actorEmail?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}
