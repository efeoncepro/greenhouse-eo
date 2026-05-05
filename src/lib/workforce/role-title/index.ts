import 'server-only'

/**
 * TASK-785 — Workforce Role Title module.
 *
 * Contrato canonico de cargo laboral en Greenhouse. Reglas duras:
 *   - `members.role_title` es source of truth laboral. Solo HR-admin
 *     escribe via mutacion gobernada con razon + audit.
 *   - Entra/Graph escribe `identity_profiles.job_title` siempre y
 *     `members.role_title` SOLO cuando no hay override HR (last_human_update_at IS NULL
 *     OR source != 'hr_manual'). Drift se registra en review queue.
 *   - Resolver canonico devuelve cargo segun contexto sin que consumers
 *     reinventan fallback.
 *   - Audit log append-only con triggers anti-modify.
 */

export * from './errors'
export * from './types'
export { writeRoleTitleAuditEntry } from './audit'
