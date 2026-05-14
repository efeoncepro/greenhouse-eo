import 'server-only'

/**
 * TASK-874 — kill switch del guard server-side que impide completar intake con
 * blockers críticos. Default ON para que la nueva regla sea efectiva; rollback
 * operativo: WORKFORCE_ACTIVATION_READINESS_GUARD_ENABLED=false.
 */
export const isWorkforceActivationReadinessGuardEnabled = (): boolean =>
  process.env.WORKFORCE_ACTIVATION_READINESS_GUARD_ENABLED !== 'false'
