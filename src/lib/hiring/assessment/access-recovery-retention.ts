import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1746 follow-up — la purga de la auditoría de recuperación de acceso gana su puerta.
 *
 * `greenhouse_hiring.purge_assessment_access_recovery(application_id, reason_code, actor)` existía desde
 * la migración de TASK-1746, con TODA la defensa adentro: valida el motivo, exige actor, toma `FOR UPDATE`,
 * se niega si la persona fue seleccionada o tiene retención laboral, exige que la retención esté vencida de
 * verdad, y audita con el id de postulación **hasheado** para no dejar PII en el rastro.
 *
 * Lo único que nunca existió fue el invocador. Consecuencia: cuando un candidato retiraba su consentimiento,
 * NADA purgaba sus filas — el derecho no tenía vía de ejercicio. Este módulo es esa vía.
 *
 * 🔴 La función está **revocada a `greenhouse_runtime`** y sólo `greenhouse_ops` puede ejecutarla: por diseño
 * es un acto de operador, no algo que el portal dispare solo. Por eso el consumidor es un CLI gobernado
 * (`pnpm hiring:assessment:purge-access-recovery`) y no una ruta.
 */

export const ACCESS_RECOVERY_PURGE_REASONS = ['consent_withdrawn', 'retention_expired'] as const
export type AccessRecoveryPurgeReason = (typeof ACCESS_RECOVERY_PURGE_REASONS)[number]

export const ACCESS_RECOVERY_PURGE_ALLOWLIST_SUFFIX = '.access-recovery-purge-allowlist.json'

export interface AccessRecoveryPurgeCandidate {
  applicationId: string
  reason: AccessRecoveryPurgeReason
  recoveryRowCount: number
  /** Vencimiento más lejano del lote: si es futuro, la fila todavía no es purgable. */
  retentionExpiresAt: string | null
}

export interface AccessRecoveryPurgePlan {
  consentWithdrawn: AccessRecoveryPurgeCandidate[]
  retentionExpired: AccessRecoveryPurgeCandidate[]
}

/**
 * Plan READ-ONLY. No escribe nada y no decide nada: enumera lo que la función ACEPTARÍA purgar.
 * El veredicto real lo sigue teniendo la función, que revalida en su propia transacción.
 */
export const planAccessRecoveryPurge = async (): Promise<AccessRecoveryPurgePlan> => {
  const rows = await runGreenhousePostgresQuery<{
    application_id: string
    reason: AccessRecoveryPurgeReason
    recovery_row_count: number
    retention_expires_at: string | null
  }>(
    `WITH scoped AS (
       SELECT r.application_id,
              count(*)::int AS recovery_row_count,
              max(r.retention_expires_at) AS retention_expires_at,
              bool_or(r.retention_class <> 'hiring_candidate_recovery') AS has_other_class,
              bool_or(r.retention_expires_at IS NULL OR r.retention_expires_at > NOW()) AS has_pending
         FROM greenhouse_hiring.hiring_assessment_access_recovery r
        GROUP BY r.application_id
     )
     SELECT s.application_id,
            CASE WHEN f.consent_status = 'withdrawn' THEN 'consent_withdrawn' ELSE 'retention_expired' END AS reason,
            s.recovery_row_count,
            s.retention_expires_at::text AS retention_expires_at
       FROM scoped s
       JOIN greenhouse_hiring.hiring_application app ON app.application_id = s.application_id
       JOIN greenhouse_hiring.candidate_facet f ON f.candidate_facet_id = app.candidate_facet_id
      WHERE (
              -- Consentimiento retirado: la persona lo pidió. Nunca aplica a seleccionados ni a retención laboral.
              f.consent_status = 'withdrawn'
              AND app.stage <> 'selected' AND coalesce(app.decision, '') <> 'selected'
              AND NOT s.has_other_class
            )
         OR (
              -- Retención vencida: sólo procesos cerrados sin juicio pendiente y sin filas todavía vigentes.
              (app.stage IN ('rejected', 'withdrawn') OR coalesce(app.decision, '') IN ('rejected', 'withdrawn'))
              AND NOT s.has_pending AND NOT s.has_other_class
            )
      ORDER BY s.application_id`,
  )

  const plan: AccessRecoveryPurgePlan = { consentWithdrawn: [], retentionExpired: [] }

  for (const row of rows) {
    const candidate: AccessRecoveryPurgeCandidate = {
      applicationId: row.application_id,
      reason: row.reason,
      recoveryRowCount: row.recovery_row_count,
      retentionExpiresAt: row.retention_expires_at,
    }

    if (row.reason === 'consent_withdrawn') plan.consentWithdrawn.push(candidate)
    else plan.retentionExpired.push(candidate)
  }

  return plan
}

export interface AccessRecoveryPurgeResult {
  applicationId: string
  reason: AccessRecoveryPurgeReason
  purgedRows: number
  error: string | null
}

/**
 * Aplica la purga **de a una postulación**, nunca en lote ciego. Un fallo NO aborta el resto: se registra y
 * se sigue, porque cada aplicación es una decisión independiente y frenar todo por una escondería las demás.
 *
 * Sin allowlist no se purga nada: la ausencia de entradas devuelve una lista vacía, no "todas".
 */
export const applyAccessRecoveryPurge = async (
  allowlist: readonly { applicationId: string; reason: AccessRecoveryPurgeReason }[],
  actorUserId: string,
): Promise<AccessRecoveryPurgeResult[]> => {
  if (!actorUserId.trim()) throw new Error('applyAccessRecoveryPurge exige un actor humano identificable.')

  const results: AccessRecoveryPurgeResult[] = []

  for (const entry of allowlist) {
    try {
      const rows = await runGreenhousePostgresQuery<{ purged: number }>(
        `SELECT greenhouse_hiring.purge_assessment_access_recovery($1, $2, $3) AS purged`,
        [entry.applicationId, entry.reason, actorUserId],
      )

      results.push({
        applicationId: entry.applicationId,
        reason: entry.reason,
        purgedRows: rows[0]?.purged ?? 0,
        error: null,
      })
    } catch (error) {
      results.push({
        applicationId: entry.applicationId,
        reason: entry.reason,
        purgedRows: 0,
        error: error instanceof Error ? error.message : 'error desconocido',
      })
    }
  }

  return results
}
