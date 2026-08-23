import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { OpeningAssessmentPolicy, OpeningAssessmentTriggerStage } from '@/types/hiring-assessment-policy'
import type { HiringApplicationStage } from '@/types/hiring'

import { activeProcessPredicate } from '../../active-process'
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
 * (module, competency, question) **junto con el CONTENIDO de cada pregunta**. No congela nada
 * — el snapshot inmutable por instancia es requisito duro antes de expandir (ADR D4) — pero
 * permite detectar drift barato: hay competencias con UNA sola pregunta activa, y archivarla
 * deja el módulo vacío sin ruido.
 *
 * El contenido entra al hash a propósito: hashear sólo IDs deja el digest CIEGO a editar el
 * `prompt`, las alternativas, el tipo o el nivel de una pregunta existente — que es justo el
 * riesgo D4 (dos candidatos "del mismo test" rindiendo exámenes distintos con el mismo
 * `template_id` y la misma versión). Un cambio de contenido sin cambio de ID es el caso que un
 * detector de drift tiene que ver.
 */
export const resolveTemplateContentDigest = async (
  templateId: string,
  client: PoolClient | null = null,
): Promise<{ digest: string; moduleCount: number; questionCount: number; emptyModuleCount: number }> => {
  const rows = await runQuery<{
    module_id: unknown
    competency_id: unknown
    question_id: unknown
    level: unknown
    type: unknown
    prompt: unknown
    options_json: unknown
  }>(client, PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL, [templateId])

  const lines = rows.map(row => {
    const content = createHash('sha256')
      .update(
        [
          str(row.level),
          str(row.type),
          str(row.prompt),
          // `options_json` llega como objeto (jsonb) o string según el driver; se normaliza para
          // que el digest no cambie por la representación, sólo por el contenido real.
          typeof row.options_json === 'string' ? row.options_json : JSON.stringify(row.options_json ?? null),
        ].join('|'),
      )
      .digest('hex')

    return `${str(row.module_id)}:${str(row.competency_id)}:${str(row.question_id) || '-'}:${
      row.question_id == null ? '-' : content
    }`
  })

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
 * consumer reactivo y la reconciliación (ADR D0a).
 *
 * **ALCANCE DECLARADO (Delta 2026-08-17).** Esta reconciliación recupera **sólo** a quien
 * SIGUE en la etapa trigger: el evento que se perdió (coalescing, worker caído, dead-letter)
 * mientras la postulación no se movió. A quien cruzó la etapa trigger y ya avanzó — el
 * `shortlisted → interview` dentro de la ventana de coalescing — **este reader no lo ve, y no
 * debe verlo**: su etapa vigente ya no es la del trigger, y el propio command lo resolvería
 * `stale: stage_changed`. Ese caso NO se recupera solo; es
 * `resolveApplicationsMissedTriggerAwaitingHuman` + decisión humana.
 *
 * **Delta TASK-1772 — la condición de «sigue en proceso» son DOS columnas, no una.** Este reader
 * preguntaba sólo `decision IS NULL`, así que una postulación ARCHIVADA —retirada de la vista a
 * propósito, sin declarar desenlace— seguía calificando para recibir una prueba. Es la novena
 * ocurrencia del mismo defecto y la causa de `ISSUE-162`. Hoy consume `activeProcessPredicate`.
 *
 * ⚠️ **La PROCEDENCIA no entra acá, y es deliberado.** «¿sigue en proceso?» y «¿es dato real?» son
 * preguntas ortogonales que comparten una mitad (`archived_at`); fundirlas produciría un predicado
 * que responde las dos a medias. Y hay evidencia concreta: el carril vivo de `TASK-1771`
 * (`dead-end-supersede.live.test.ts`) ejercita este reader con `dataOrigin: 'smoke_test'` NO
 * archivado y asserta que lo devuelve. Filtrar procedencia acá rompería la única prueba que
 * demuestra que liberar una clave la devuelve de verdad a la cola. Donde la procedencia SÍ importa
 * —la cola de callejones— se compone aparte y su exclusión se reporta (`dead-ends.ts`).
 *
 * Deriva TODO del estado vigente en PostgreSQL:
 * - la etapa actual de la postulación es la `trigger_stage` de la policy (nunca `payload.stage`);
 * - la postulación sigue en proceso activo (`decision IS NULL AND archived_at IS NULL`);
 * - no existe una instancia de esa plantilla en un estado que ya cuenta como asignada
 *   (`assigned|sent|in_progress|submitted|scored`);
 * - no hay una fila VIGENTE del ledger para (application, policy, versión, etapa) — un
 *   outcome terminal ya registrado no se reintenta hasta que alguien lo supersede
 *   explícitamente, para que un `blocked: volume_cap` no se convierta en un bucle de correos.
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
       AND ${activeProcessPredicate('app')}
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_hiring.hiring_assessment a
         WHERE a.application_id = app.application_id
           AND a.template_id = $3
           AND a.method = 'candidate_test'
           AND a.status IN ('assigned', 'sent', 'in_progress', 'submitted', 'scored')
       )
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_hiring.hiring_assessment_assignment asg
         WHERE asg.application_id = app.application_id
           AND asg.policy_id = $4
           AND asg.policy_version = $5
           AND asg.trigger_stage = $2
           AND asg.superseded_at IS NULL
       )
     ORDER BY app.updated_at
     LIMIT $6`,
    [policy.openingId, policy.triggerStage, policy.templateId, policy.policyId, policy.policyVersion, limit],
  )

  return rows.map(row => ({
    applicationId: str(row.application_id),
    openingId: str(row.opening_id),
    stage: policy.triggerStage as OpeningAssessmentTriggerStage,
  }))
}

/**
 * Etapas que están AGUAS ABAJO de cada etapa trigger en la progresión candidate-facing. Se
 * declaran explícitas en vez de derivarse por índice del array de etapas: el orden de
 * `HIRING_APPLICATION_STAGES` mezcla progresión con salidas (`rejected`, `withdrawn`,
 * `closed`), y una lista implícita por posición es justo el tipo de cosa que se rompe en
 * silencio cuando alguien agrega una etapa.
 */
// TASK-1765 — `closed` NO entra acá, y el motivo importa más que la línea.
//
// Se agregó primero razonando que, como el command de decisión pasó a escribir siempre
// `stage='closed'`, omitirlo vaciaría esta cola. Ese razonamiento era erróneo: la query que consume
// este mapa filtra además `AND app.decision IS NULL`, así que una postulación DECIDIDA nunca aparece
// acá — con `closed` en la lista o sin él. La entrada habría sido inerte y su comentario habría
// mentido, que es peor que no tenerla.
//
// Y cuando entre el `CHECK` del invariante (`(stage='closed') = (decision IS NOT NULL)`), la
// combinación `closed AND decision IS NULL` pasa a ser **irrepresentable**: la entrada moriría por
// construcción.
//
// Los espejos terminales sí se conservan mientras `TASK-1754` no los retire del enum de etapas:
// siguen existiendo en filas históricas, y ésas sí pueden tener `decision IS NULL`.
//
// TASK-1754 Slice F — reescrito, no podado. `client_review` figuraba como aguas ABAJO de
// `shortlisted`, y el colapso la absorbió DENTRO de `shortlisted`: dejarla habría contado como
// «avanzó más allá del gatillo» a quien sigue exactamente en la etapa del gatillo, mandando a la
// cola humana postulaciones que la reconciliación automática sí puede recuperar. Los espejos
// terminales (`selected`, `backup`, `handoff_ready`) salen porque el contract del enum los volvió
// irrepresentables: una fila no puede estar ahí ni histórica ni nuevamente.
const STAGES_DOWNSTREAM_OF_TRIGGER: Record<OpeningAssessmentTriggerStage, readonly HiringApplicationStage[]> = {
  shortlisted: ['interview', 'decision_pending'],
  interview: ['decision_pending'],
}

export interface ApplicationMissedTrigger extends ApplicationAwaitingAssignment {
  /** Etapa VIGENTE, ya posterior a la del trigger. */
  currentStage: string
}

/**
 * COLA HUMANA — postulaciones que la reconciliación automática NO puede recuperar: avanzaron
 * más allá de la etapa trigger sin que quedara ningún outcome de assignment registrado.
 *
 * Existe porque la promesa "la reconciliación atrapa lo que el coalescing perdió" sólo se
 * cumple mientras la postulación siga en la etapa trigger. Cuando ya avanzó, no hay rastro
 * durable de que cruzó esa etapa fuera del payload de `outbox_events` — y ese payload es
 * exactamente la fuente que el ADR declara no confiable para decidir etapa (D0a, invariante 1).
 * Consultarlo además significaría un seq scan de la tabla más caliente de la plataforma
 * (`outbox_events` no tiene índice por `event_type`, `aggregate_id` ni `payload`) sobre datos
 * con retención declarada como borrable a futuro.
 *
 * Por eso el reader deriva TODO del estado vigente y **no ejecuta nada**: entrega una lista
 * operable para que una persona decida si esa prueba todavía tiene sentido — decisión que
 * además roza una Open Question abierta del ADR (qué pasa al avanzar a `interview` con el test
 * de `shortlisted`). Sobre-incluye a quien llegó a la etapa posterior sin pasar por la trigger:
 * es deliberado, un falso positivo en una cola humana cuesta una mirada, un falso negativo
 * cuesta un candidato sin evaluar y sin señal.
 */
export const resolveApplicationsMissedTriggerAwaitingHuman = async (
  policyId: string,
  client: PoolClient | null = null,
  limit = 200,
): Promise<ApplicationMissedTrigger[]> => {
  const policy = await getPolicyById(policyId, client)

  if (!policy || policy.state === 'disabled' || !policy.triggerStage) return []

  const downstream = STAGES_DOWNSTREAM_OF_TRIGGER[policy.triggerStage]

  const rows = await runQuery<{ application_id: unknown; opening_id: unknown; stage: unknown }>(
    client,
    `SELECT app.application_id, app.opening_id, app.stage
     FROM greenhouse_hiring.hiring_application app
     WHERE app.opening_id = $1
       AND app.stage = ANY($2::text[])
       AND ${activeProcessPredicate('app')}
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_hiring.hiring_assessment a
         WHERE a.application_id = app.application_id
           AND a.template_id = $3
           AND a.method = 'candidate_test'
       )
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_hiring.hiring_assessment_assignment asg
         WHERE asg.application_id = app.application_id
           AND asg.policy_id = $4
       )
     ORDER BY app.updated_at
     LIMIT $5`,
    [policy.openingId, [...downstream], policy.templateId, policy.policyId, limit],
  )

  return rows.map(row => ({
    applicationId: str(row.application_id),
    openingId: str(row.opening_id),
    stage: policy.triggerStage as OpeningAssessmentTriggerStage,
    currentStage: str(row.stage),
  }))
}
