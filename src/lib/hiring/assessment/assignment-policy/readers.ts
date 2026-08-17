import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { OpeningAssessmentPolicy, OpeningAssessmentTriggerStage } from '@/types/hiring-assessment-policy'

import { PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL } from '../public-taking'
import { findActivePolicyForOpening, getPolicyById } from './store'

// TASK-1719 Slice 1 — Readers de la policy. Acá vive EL predicado canónico: el mismo que
// consume el command, el consumer reactivo (Slice 4) y la reconciliación. ADR D0a: la etapa
// trigger se deriva SIEMPRE del estado vigente en PostgreSQL, NUNCA de `payload.stage` — el
// consumer reactivo hace coalescing por scope y conserva el último payload, así que la etapa
// intermedia se pierde en silencio.

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient | null,
  text: string,
  values: unknown[],
): Promise<T[]> => {
  if (client) {
    const result = await client.query(text, values)

    return result.rows as T[]
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const str = (v: unknown): string => (v == null ? '' : String(v))

/**
 * Policy vigente de un opening (draft o enabled). Devuelve `null` si la vacante no declara
 * prueba o si su policy fue deshabilitada — el caller decide, nunca se infiere una plantilla.
 */
export const resolveActivePolicyForOpening = async (
  openingId: string,
  client: PoolClient | null = null,
): Promise<OpeningAssessmentPolicy | null> => findActivePolicyForOpening(openingId, client)

/** Policy vigente de la vacante a la que pertenece una postulación exacta. */
export const resolveActivePolicyForApplication = async (
  applicationId: string,
  client: PoolClient | null = null,
): Promise<OpeningAssessmentPolicy | null> => {
  const rows = await runQuery<{ opening_id: unknown }>(
    client,
    `SELECT opening_id FROM greenhouse_hiring.hiring_application WHERE application_id = $1 LIMIT 1`,
    [applicationId],
  )

  if (!rows[0]) return null

  return findActivePolicyForOpening(str(rows[0].opening_id), client)
}

/**
 * Digest del cuestionario que HOY resolvería la plantilla. Corre la MISMA resolución en vivo
 * que `listPublicAssessmentQuestions` (SQL compartido) y hashea la lista ordenada de
 * (module, competency, question). No congela nada — el snapshot inmutable por instancia es
 * requisito duro antes de expandir (ADR D4) — pero permite detectar drift barato: hay
 * competencias con UNA sola pregunta activa, y archivarla deja el módulo vacío sin ruido.
 */
export const resolveTemplateContentDigest = async (
  templateId: string,
  client: PoolClient | null = null,
): Promise<{ digest: string; moduleCount: number; questionCount: number; emptyModuleCount: number }> => {
  const rows = await runQuery<{ module_id: unknown; competency_id: unknown; question_id: unknown }>(
    client,
    PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL,
    [templateId],
  )

  const lines = rows.map(
    row => `${str(row.module_id)}:${str(row.competency_id)}:${str(row.question_id) || '-'}`,
  )

  const modules = new Set(rows.map(row => str(row.module_id)))
  const emptyModules = new Set(rows.filter(row => row.question_id == null).map(row => str(row.module_id)))

  return {
    digest: createHash('sha256').update(lines.join('\n')).digest('hex'),
    moduleCount: modules.size,
    questionCount: rows.filter(row => row.question_id != null).length,
    emptyModuleCount: emptyModules.size,
  }
}

export interface ApplicationAwaitingAssignment {
  applicationId: string
  openingId: string
  stage: OpeningAssessmentTriggerStage
}

/**
 * PREDICADO CANÓNICO — postulaciones de la policy que HOY cumplen la condición de trigger y
 * todavía no tienen un resultado terminal de assignment. Es el mismo predicado que usan el
 * consumer reactivo y la reconciliación: la reconciliación no es una red de seguridad
 * opcional, es la que atrapa el trigger que el coalescing del lane se comió (ADR D0a).
 *
 * Deriva TODO del estado vigente en PostgreSQL:
 * - la etapa actual de la postulación es la `trigger_stage` de la policy (nunca `payload.stage`);
 * - la postulación no tiene decisión formal (`decision IS NULL`);
 * - no existe una instancia de esa plantilla en un estado que ya cuenta como asignada
 *   (`assigned|sent|in_progress|submitted|scored`).
 *
 * Slice 2 agrega la exclusión por ledger vigente (un outcome terminal registrado no se
 * reintenta hasta que alguien lo supersede).
 */
export const resolveApplicationsAwaitingAssignment = async (
  policyId: string,
  client: PoolClient | null = null,
  limit = 200,
): Promise<ApplicationAwaitingAssignment[]> => {
  const policy = await getPolicyById(policyId, client)

  if (!policy || policy.state !== 'enabled' || !policy.triggerStage) return []

  const rows = await runQuery<{ application_id: unknown; opening_id: unknown }>(
    client,
    `SELECT app.application_id, app.opening_id
     FROM greenhouse_hiring.hiring_application app
     WHERE app.opening_id = $1
       AND app.stage = $2
       AND app.decision IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_hiring.hiring_assessment a
         WHERE a.application_id = app.application_id
           AND a.template_id = $3
           AND a.method = 'candidate_test'
           AND a.status IN ('assigned', 'sent', 'in_progress', 'submitted', 'scored')
       )
     ORDER BY app.updated_at
     LIMIT $4`,
    [policy.openingId, policy.triggerStage, policy.templateId, limit],
  )

  return rows.map(row => ({
    applicationId: str(row.application_id),
    openingId: str(row.opening_id),
    stage: policy.triggerStage as OpeningAssessmentTriggerStage,
  }))
}
