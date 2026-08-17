import 'server-only'

import { listAssignmentsForApplication } from '@/lib/hiring/assessment/assignment-policy/assignment-store'
import { assignAssessmentFromPolicy } from '@/lib/hiring/assessment/assignment-policy/assign'
import { resolveActivePolicyForApplication } from '@/lib/hiring/assessment/assignment-policy/readers'
import { wasEmailDeliveredForEntity } from '@/lib/email/delivery'
import { isHiringLifecycleEmailsEnabled } from '@/lib/hiring/notifications/config'
import { resolveHiringApplicationEmailContext } from '@/lib/hiring/notifications/recipient'
import { sendHiringStageAdvancedEmail } from '@/lib/hiring/notifications/send'

import { STAGE_CHANGE_ACTIONABLE_WINDOW_HOURS, isHiringStageTestAssignmentEnabled } from './config'

// ══════════════════════════════════════════════════════════════════════════════
// TASK-1719 Slices 4/5 — fan-in de la comunicación por cambio de etapa.
//
// UN SOLO consumer decide qué recibe el candidato cuando avanza de etapa. Antes había
// una projection que mandaba siempre el correo genérico; ahora esa decisión y la de
// asignar el test viven juntas, porque son la MISMA pregunta: "¿qué le llega a esta
// persona por este movimiento?". Separarlas es lo que produce cero correos o dos.
//
// Tres invariantes que gobiernan este archivo:
//
// 1. LA ETAPA SALE DE POSTGRES, NUNCA DEL PAYLOAD. El consumer reactivo agrupa por scope
//    y conserva el ÚLTIMO payload: dos movimientos de la misma postulación dentro de la
//    ventana entregan un solo refresh, y la etapa intermedia no está en él. Acá se re-lee
//    el estado vigente y se comunica ESE.
//
// 2. EL LEDGER SE ESCRIBE ANTES DE QUE SALGA CUALQUIER CORREO. No hace falta una tabla de
//    "intención de comunicación": `assignAssessmentFromPolicy` commitea su fila del ledger
//    dentro de su transacción, y el correo del test lo manda DESPUÉS otro consumer, al
//    procesar `hiring.assessment.assigned`. Si este proceso muere a mitad, el reintento
//    lee el ledger y sabe qué se decidió.
//
// 3. FALLO ⇒ REINTENTO SIN COMUNICAR. Cualquier excepción se propaga tal cual: el
//    dispatcher reintenta. Nunca se degrada al correo genérico "por si acaso" — eso
//    convertiría un error transitorio en una comunicación equivocada e irreversible.
// ══════════════════════════════════════════════════════════════════════════════

const LABEL = 'hiring_stage_changed_candidate_comms'

const hoursSince = (iso: unknown): number | null => {
  if (typeof iso !== 'string' || !iso) return null

  const at = Date.parse(iso)

  if (Number.isNaN(at)) return null

  return (Date.now() - at) / 3_600_000
}

/**
 * Degradar al correo genérico usando la etapa VIGENTE, no la del payload. Se sobrescribe
 * `stage` a propósito: el sender que se absorbe leía `payload.stage`, que bajo coalescing
 * puede ser una etapa distinta de la que realmente hay que comunicar.
 */
const sendGenericStageEmail = async (
  applicationId: string,
  payload: Record<string, unknown>,
  currentStage: string,
): Promise<string> => sendHiringStageAdvancedEmail(applicationId, { ...payload, stage: currentStage })

/**
 * ¿El `already_assigned` que devolvió el command es un replay de NUESTRA propia asignación,
 * o una instancia que ya existía por otra vía?
 *
 * La distinción decide si el candidato recibe cero, uno o dos correos, y el deduplicador de
 * emails NO la cubre: el correo del test y el de etapa viajan con `sourceEventId` distintos,
 * así que mandar los dos no se detecta como duplicado.
 *
 * - Replay de lo nuestro (la fila del ledger dice `assigned`) ⇒ el correo del test YA salió
 *   por esta misma llave. Callar.
 * - Instancia preexistente (`existing_open_instance`) ⇒ no se emite evento nuevo, o sea NO
 *   habrá correo de test por este movimiento. Degradar, o el avance sería silencioso.
 *
 * Se lee del LEDGER y no del resultado en memoria a propósito: el ledger es el hecho
 * durable, y sobrevive a un reintento en otro proceso.
 */
const testEmailAlreadyCoversThisMove = async (applicationId: string, assignmentId: string): Promise<boolean> => {
  const records = await listAssignmentsForApplication(applicationId)
  const record = records.find(entry => entry.assignmentId === assignmentId)

  if (!record) return false

  return record.outcome === 'assigned' && record.outcomeReason !== 'existing_open_instance'
}

/** Email transaccional que entrega el link de la prueba (`hiring-assessment-assigned` lane). */
const ASSESSMENT_ASSIGNED_EMAIL_TYPE = 'hiring_assessment_assigned'

/**
 * Segunda pregunta, distinta de la del ledger: ¿el candidato YA recibió el correo del test por
 * ESTA instancia, aunque la haya originado otra vía?
 *
 * Existe por la secuencia más natural que hay: el reclutador asigna la prueba a mano y en el
 * mismo minuto mueve al candidato a `interview`. El assign manual publica
 * `hiring.assessment.assigned` ⇒ sale el correo del test. Después entra el `stage_changed`, la
 * policy dispara, encuentra la instancia abierta y devuelve
 * `already_assigned / existing_open_instance` ⇒ acá se degradaba al genérico. Salían los DOS
 * correos, y el deduplicador no los ve: distinto `sourceEventId` y distinto `emailType`.
 *
 * El ledger no puede responder esto — la instancia manual no dejó fila propia — así que se
 * consulta el ledger de ENTREGAS por entidad (`assessment_id`), sin resolver ninguna dirección.
 * Si el correo del test ya salió, el movimiento YA fue comunicado: callar.
 */
const assessmentEmailAlreadyDelivered = async (assessmentId: string | null): Promise<boolean> => {
  if (!assessmentId) return false

  return wasEmailDeliveredForEntity(assessmentId, ASSESSMENT_ASSIGNED_EMAIL_TYPE)
}

/**
 * Handler canónico del cambio de etapa. Devuelve una descripción SIN PII (va al log
 * reactivo). Lanza sólo ante fallos reales: el dispatcher reintenta sin comunicar.
 */
export const resolveStageChangeCandidateComms = async (
  applicationId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  // El master de emails manda sobre todo: si está OFF, no se comunica nada por ningún
  // camino. Se evalúa primero para que apagarlo apague de verdad.
  if (!isHiringLifecycleEmailsEnabled()) return `${LABEL} skip: flag OFF`

  const ctx = await resolveHiringApplicationEmailContext(applicationId)

  if (!ctx) return `${LABEL} no-op: application ${applicationId} no existe`

  // Una postulación ya decidida no recibe ni test ni aviso de avance: su comunicación es
  // la de la decisión, que tiene su propio consumer.
  if (ctx.decision) return `${LABEL} no-op: application ${applicationId} ya decidida`

  // `_occurredAt` lo inyecta el consumer reactivo (`parsePayload`). Si faltara, `hoursSince`
  // devuelve null y la guarda NO actúa — por eso el consumer lo inyecta siempre y hay test
  // que lo cubre: una ventana que silenciosamente nunca dispara es peor que no tenerla.
  const ageHours = hoursSince(payload._occurredAt)

  if (ageHours !== null && ageHours > STAGE_CHANGE_ACTIONABLE_WINDOW_HOURS) {
    return `${LABEL} stale: evento de hace ${Math.round(ageHours)}h supera la ventana accionable — va a la cola humana`
  }

  const policy = await resolveActivePolicyForApplication(applicationId)

  const autoEligible =
    policy !== null &&
    policy.mode === 'on_stage_entry' &&
    policy.state === 'enabled' &&
    policy.triggerStage === ctx.stage &&
    isHiringStageTestAssignmentEnabled()

  if (!policy || !autoEligible) {
    return sendGenericStageEmail(applicationId, payload, ctx.stage)
  }

  // A partir de acá el command es el dueño de la decisión. Sus excepciones se propagan:
  // reintento sin comunicar (invariante 3).
  const result = await assignAssessmentFromPolicy({
    applicationId,
    policyId: policy.policyId,
    origin: 'stage_auto',
    actorUserId: null,
    triggerStage: ctx.stage as 'shortlisted' | 'interview',
  })

  if (result.status === 'assigned') {
    return `${LABEL} ${applicationId}: test asignado — el correo del test es la comunicación de este movimiento`
  }

  if (result.status === 'already_assigned') {
    if (await testEmailAlreadyCoversThisMove(applicationId, result.assignmentId)) {
      return `${LABEL} ${applicationId}: replay de una asignación propia — no se comunica de nuevo`
    }

    // La instancia existía por otra vía, PERO su correo ya salió: el candidato está comunicado.
    // Degradar acá sería el segundo correo del mismo movimiento.
    if (await assessmentEmailAlreadyDelivered(result.assessmentId)) {
      return `${LABEL} ${applicationId}: la instancia preexistente ya entregó su correo de test — no se comunica de nuevo`
    }

    const sent = await sendGenericStageEmail(applicationId, payload, ctx.stage)

    return `${LABEL} ${applicationId}: ya había instancia abierta, sin correo de test ⇒ degrada al genérico (${sent})`
  }

  // held | blocked | stale | cancelled — la automatización se detuvo. NUNCA se promete un
  // test que no existe: se degrada al correo genérico EN ESTA MISMA EJECUCIÓN, para que el
  // candidato no quede sin comunicación esperando algo que no va a llegar.
  const sent = await sendGenericStageEmail(applicationId, payload, ctx.stage)

  return `${LABEL} ${applicationId}: ${result.status}/${'reasonCode' in result ? result.reasonCode : 'sin razón'} ⇒ degrada al genérico (${sent})`
}
