import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AssessmentAssignmentReasonCode,
  AssessmentAssignmentTrigger,
  OpeningAssessmentPolicy,
  OpeningAssessmentPolicyMode,
  OpeningAssessmentPolicyState,
} from '@/types/hiring-assessment-policy'

import { HiringNotFoundError } from '../../errors'
import { OPEN_ASSESSMENT_INSTANCE_STATUSES } from '../instances'
import { resolveRecipientReadiness } from './assign'
import { resolveActivePolicyForApplication, resolveTemplateContentDigest } from './readers'

/**
 * TASK-1719 Slice 2 — EL digest del efecto propuesto.
 *
 * ⚠️ UNA SOLA FÓRMULA, DOS MITADES. `buildAssignmentEffectMaterial` la usan `propose` y
 * `confirm` — a propósito. Si cada mitad armara su propio material (aunque fuera "el mismo"
 * campo a campo), cualquier divergencia futura rompería la detección de stale **en silencio**:
 * el confirm compararía un digest que describe otra cosa y ejecutaría un efecto distinto del
 * que la persona aprobó, sin que ningún test de una mitad sola lo delate. Por eso el material
 * NO se arma inline en ningún caller: se pide acá.
 *
 * **NUNCA meter PII en el material.** Ni email, ni nombre, ni token: sólo IDs, versiones,
 * digests y booleanos. El digest viaja al cliente y queda en el ledger.
 */

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
const int = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0)

/**
 * Material EXACTO del digest. Nada más, nada menos: agregar un campo sin recomputar los
 * digests vivos invalida todas las propuestas abiertas (que es el comportamiento correcto —
 * `superseded` — pero hay que saberlo antes de tocarlo).
 */
export interface AssignmentEffectMaterial {
  policyId: string
  policyVersion: number
  /**
   * ⚠️ `policyState` y `policyMode` VAN EN EL DIGEST aunque `policy_version` no los versione.
   * `markPolicyEnabled`/`markPolicyDisabled` cambian el estado SIN incrementar la versión, así
   * que sin estos dos campos el digest era ciego al cambio más peligroso que existe: proponer
   * con la policy en `draft` (el preview dice `policy_disabled` — "no va a pasar nada"),
   * habilitarla, y confirmar contra un digest idéntico ⇒ el efecto ejecutado NO es el que la
   * persona aprobó, y sale un correo real a un candidato real.
   */
  policyState: OpeningAssessmentPolicyState
  policyMode: OpeningAssessmentPolicyMode
  templateId: string
  /** Digest del CONTENIDO resuelto hoy (readers.ts): ciego a IDs, sensible a editar preguntas. */
  templateContentDigest: string
  /** Etapa declarada por la policy; `manual` cuando la policy no declara trigger. */
  triggerStage: AssessmentAssignmentTrigger
  timeLimitMinutes: number | null
  applicationStage: string
  applicationDecided: boolean
  recipientReady: boolean
  /** Instancia ABIERTA (bloqueante). Predicado EXACTO de `OPEN_ASSESSMENT_INSTANCE_STATUSES`. */
  existingOpenAssessment: boolean
  /** Instancia `scored` (informativa, NO bloqueante). Ver `EXISTING_INSTANCE_STATUSES`. */
  existingScoredAssessment: boolean
}

/**
 * Hash del efecto que el operador VIO. Objeto explícito y ordenado: no se serializa el
 * material tal cual porque el orden de claves de un objeto construido en otro lado no está
 * garantizado, y un digest sensible al orden de inserción sería un falso `stale`.
 */
export const computeAssignmentEffectDigest = (material: AssignmentEffectMaterial): string => {
  const ordered = {
    policyId: material.policyId,
    policyVersion: material.policyVersion,
    policyState: material.policyState,
    policyMode: material.policyMode,
    templateId: material.templateId,
    templateContentDigest: material.templateContentDigest,
    triggerStage: material.triggerStage,
    timeLimitMinutes: material.timeLimitMinutes,
    applicationStage: material.applicationStage,
    applicationDecided: material.applicationDecided,
    recipientReady: material.recipientReady,
    existingOpenAssessment: material.existingOpenAssessment,
    existingScoredAssessment: material.existingScoredAssessment,
  }

  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex')
}

export interface AssignmentEffectContext {
  applicationId: string
  policy: OpeningAssessmentPolicy
  material: AssignmentEffectMaterial
  digest: string
  /** Display PII-FREE para el preview (título interno de la vacante, nunca el candidato). */
  openingTitle: string
  templateName: string
  templateVersion: number
  templateStatus: string
  /** Razón exacta del fallo de readiness (`missing_email` vs `unverified_recipient`). */
  recipientBlockReason: AssessmentAssignmentReasonCode | null
}

/**
 * Estados que el preview LEE. **No es un predicado, son dos**, y la diferencia es el punto:
 *
 * - `OPEN_ASSESSMENT_INSTANCE_STATUSES` (`assigned|sent|in_progress|submitted`) = instancia
 *   abierta ⇒ BLOQUEANTE, porque es EXACTAMENTE el predicado del índice parcial
 *   `hiring_assessment_open_instance_unique_idx` y el que `insertCandidateTest` honra. Lo que el
 *   preview marca como bloqueo es entonces lo mismo que el command haría.
 * - `scored` ⇒ INFORMATIVO. El command NO lo ve (una instancia corregida liberó el slot), así
 *   que crearía una instancia nueva. Marcarlo como bloqueo era una MENTIRA operativa: el preview
 *   decía "no va a pasar nada", el operador confirmaba igual y le llegaba una segunda prueba a
 *   alguien ya evaluado. Un retake es legítimo — pero tiene que ser una decisión, no una sorpresa.
 *
 * ⚠️ `readers.ts` (`resolveApplicationsAwaitingAssignment`) SÍ trata `scored` como "ya tiene
 * evaluación" y esa divergencia es DELIBERADA: ese reader responde "¿a quién le falta ser
 * evaluado?" (una persona corregida ya no falta), mientras que éste responde "¿el command
 * crearía una instancia?" (con `scored`, sí). NUNCA unificarlos "por consistencia": responden
 * preguntas distintas.
 */
const EXISTING_INSTANCE_STATUSES = [...OPEN_ASSESSMENT_INSTANCE_STATUSES, 'scored'] as const

/**
 * Arma el material leyendo el estado VIGENTE en PostgreSQL. Devuelve `null` cuando la vacante
 * no declara policy activa — el caller decide qué significa eso (para `propose` es un 409; para
 * `confirm` es que el efecto aprobado dejó de existir ⇒ `superseded`).
 *
 * Lanza `HiringNotFoundError` si la postulación no existe: eso no es "sin policy", es un id roto.
 */
export const buildAssignmentEffectMaterial = async (
  applicationId: string,
  client: PoolClient | null = null,
): Promise<AssignmentEffectContext | null> => {
  const appRows = await runQuery<{
    application_id: unknown
    opening_id: unknown
    stage: unknown
    decision: unknown
    internal_title: unknown
    canonical_email: unknown
  }>(
    client,
    `SELECT app.application_id, app.opening_id, app.stage, app.decision,
            op.internal_title, ip.canonical_email
     FROM greenhouse_hiring.hiring_application app
     JOIN greenhouse_hiring.hiring_opening op ON op.opening_id = app.opening_id
     JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = app.identity_profile_id
     WHERE app.application_id = $1
     LIMIT 1`,
    [applicationId],
  )

  const app = appRows[0]

  if (!app) {
    throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
  }

  const policy = await resolveActivePolicyForApplication(applicationId, client)

  if (!policy) return null

  const templateRows = await runQuery<{ name: unknown; version: unknown; status: unknown }>(
    client,
    `SELECT name, version, status FROM greenhouse_hiring.hiring_assessment_template
     WHERE template_id = $1 LIMIT 1`,
    [policy.templateId],
  )

  const template = templateRows[0]
  const content = await resolveTemplateContentDigest(policy.templateId, client)

  const instanceRows = await runQuery<{ instance_status: unknown }>(
    client,
    `SELECT status AS instance_status FROM greenhouse_hiring.hiring_assessment
     WHERE application_id = $1 AND template_id = $2 AND method = 'candidate_test'
       AND status = ANY($3::text[])`,
    [applicationId, policy.templateId, [...EXISTING_INSTANCE_STATUSES]],
  )

  const instanceStatuses = instanceRows.map(row => str(row.instance_status))

  // El email crudo se usa acá y muere acá: al material sólo entra el booleano.
  const readiness = resolveRecipientReadiness(app.canonical_email == null ? null : String(app.canonical_email))

  const material: AssignmentEffectMaterial = {
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    policyState: policy.state,
    policyMode: policy.mode,
    templateId: policy.templateId,
    templateContentDigest: content.digest,
    triggerStage: policy.triggerStage ?? 'manual',
    timeLimitMinutes: policy.timeLimitMinutes,
    applicationStage: str(app.stage),
    applicationDecided: app.decision != null,
    recipientReady: readiness.ok,
    existingOpenAssessment: instanceStatuses.some(status =>
      (OPEN_ASSESSMENT_INSTANCE_STATUSES as readonly string[]).includes(status),
    ),
    existingScoredAssessment: instanceStatuses.includes('scored'),
  }

  return {
    applicationId: str(app.application_id),
    policy,
    material,
    digest: computeAssignmentEffectDigest(material),
    openingTitle: str(app.internal_title),
    templateName: str(template?.name),
    templateVersion: int(template?.version) || 1,
    templateStatus: str(template?.status),
    recipientBlockReason: readiness.ok ? null : readiness.reasonCode,
  }
}

/**
 * Razón por la que ESTE efecto no terminaría en una asignación. Es una señal de PREVIEW, no la
 * decisión: la decisión canónica la toma `resolveAssignmentIntent` dentro de la transacción del
 * command. Sirve para que el operador vea el bloqueo antes de confirmar en vez de descubrirlo
 * en el outcome.
 */
export const deriveAssignmentPreviewBlocker = (
  context: AssignmentEffectContext,
): AssessmentAssignmentReasonCode | null => {
  if (context.policy.state !== 'enabled') return 'policy_disabled'
  if (context.templateStatus !== 'active') return 'template_inactive'
  if (context.material.applicationDecided) return 'application_decided'
  if (context.recipientBlockReason) return context.recipientBlockReason
  // SÓLO la instancia ABIERTA bloquea. `existingScoredAssessment` viaja en el preview como
  // advertencia y NO como bloqueo: el command sí asignaría (retake legítimo), y declarar un
  // bloqueo que el command no honra es peor que no declarar nada.
  if (context.material.existingOpenAssessment) return 'existing_open_instance'

  return null
}
