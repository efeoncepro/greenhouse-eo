import 'server-only'

import { createHash } from 'node:crypto'

import type {
  DecideHiringApplicationInput,
  DecideHiringApplicationResult,
  HiringApplication,
  HiringDecision,
  HiringDecisionCause,
} from '@/types/hiring'

import { decideHiringApplication } from './decide'
import { HiringNotFoundError, HiringValidationError } from './errors'
import { getHiringApplicationById } from './store'

/**
 * TASK-1773 — el eje de desenlace gana su carril gobernado.
 *
 * El cierre de una postulación se podía operar desde el portal y desde ningún otro lado: ni por
 * `api/platform/app/**`, ni por MCP, ni por Nexa. Violación directa de Full API Parity, y el agravante es
 * que ninguna de las cuatro tasks del eje lo declaró como pendiente.
 *
 * 🔴 **La propuesta es EFÍMERA, no una entidad.** El Banco de Talento persiste sus invitaciones en
 * `talent_pool_invitation` porque una invitación ES una entidad con ciclo de vida propio. Una propuesta de
 * decisión no lo es: nace y muere dentro de un gesto humano. Por eso acá el guard es un **digest del
 * estado actual** en vez de una fila — `propose` lo calcula, `confirm` lo recalcula, y si el mundo cambió
 * entre medio (otra persona decidió, la postulación se archivó) las huellas no coinciden y falla.
 *
 * Eso mantiene `Migration: none` y evita una tabla que habría que limpiar.
 *
 * 🔴 **Este módulo NO reimplementa reglas de decisión.** Toda la validación —causa obligatoria en
 * `not_selected` y prohibida en el resto, destino, idempotencia, historial append-only— vive en
 * `decideHiringApplication` y ahí se queda. Acá sólo se revalida que el efecto propuesto siga siendo el
 * mismo antes de delegar.
 *
 * 🔴 **El cierre MASIVO por capacidad NO se federa** (decisión del 2026-08-23, `TASK-1762`): su gate es
 * una confirmación humana contra un digest fresco, y bajo el AI Act la selección es alto riesgo con
 * supervisión obligatoria. Este módulo cubre la decisión INDIVIDUAL. Del cierre de cohorte, un agente
 * puede leer el `preview` y el `status`; jamás dispararlo.
 */

/** Lo que un consumer federado puede leer del desenlace. Sin PII del candidato. */
export interface HiringApplicationOutcomeView {
  applicationId: string
  openingId: string
  stage: HiringApplication['stage']
  decision: HiringDecision | null
  decisionCause: HiringDecisionCause | null
  decidedAt: string | null
  decidedBy: string | null
  /** TERCER eje, ortogonal: archivar NUNCA declara desenlace. */
  archivedAt: string | null
  /** `true` cuando `stage === 'closed'`, que la base garantiza ⟺ desenlace declarado. */
  closed: boolean
}

const toOutcomeView = (application: HiringApplication): HiringApplicationOutcomeView => ({
  applicationId: application.applicationId,
  openingId: application.openingId,
  stage: application.stage,
  decision: application.decision,
  decisionCause: application.decisionCause,
  decidedAt: application.decisionAt,
  decidedBy: application.decisionBy,
  archivedAt: application.archivedAt,
  closed: application.stage === 'closed',
})

const requireApplication = async (applicationId: string): Promise<HiringApplication> => {
  const safeId = applicationId.trim()

  if (!safeId) {
    throw new HiringValidationError('La postulación es obligatoria.', 'hiring_application_id_required')
  }

  const application = await getHiringApplicationById(safeId)

  if (!application) {
    throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
  }

  return application
}

/** Lectura federada del desenlace. */
export const readHiringApplicationOutcome = async (
  applicationId: string,
): Promise<HiringApplicationOutcomeView> => toOutcomeView(await requireApplication(applicationId))

/**
 * Huella del efecto: estado ACTUAL + efecto propuesto. Si cualquiera de los dos cambia, cambia la huella.
 *
 * Incluye el estado actual a propósito: si otra persona decide entre `propose` y `confirm`, la huella
 * recalculada no coincide y la confirmación falla en vez de pisar una decisión ajena.
 */
const computeEffectDigest = (
  application: HiringApplication,
  decision: HiringDecision,
  cause: HiringDecisionCause | null,
): string => {
  const material = [
    application.applicationId,
    application.stage,
    application.decision ?? '',
    application.decisionCause ?? '',
    application.archivedAt ?? '',
    decision,
    cause ?? '',
  ].join('|')

  return `hdp-${createHash('sha256').update(material).digest('hex').slice(0, 24)}`
}

export interface HiringDecisionProposal {
  applicationId: string
  effectDigest: string
  current: HiringApplicationOutcomeView
  proposed: { decision: HiringDecision; cause: HiringDecisionCause | null }
  /** `true` cuando la postulación YA tiene desenlace: confirmar la re-decide, no la cierra por primera vez. */
  alreadyClosed: boolean
}

/** `propose` — LEE y calcula. Nunca muta. */
export const proposeHiringApplicationDecision = async ({
  applicationId,
  decision,
  cause = null,
}: {
  applicationId: string
  decision: HiringDecision
  cause?: HiringDecisionCause | null
}): Promise<HiringDecisionProposal> => {
  const application = await requireApplication(applicationId)
  const current = toOutcomeView(application)

  return {
    applicationId: application.applicationId,
    effectDigest: computeEffectDigest(application, decision, cause),
    current,
    proposed: { decision, cause },
    alreadyClosed: current.closed,
  }
}

/**
 * `confirm` — revalida la huella contra el estado de AHORA y delega en el command canónico.
 *
 * La revalidación va antes de la escritura y NO dentro de la transacción del command: si el estado cambió,
 * queremos fallar sin abrir transacción. El command conserva su propio `FOR UPDATE` y su replay por
 * `idempotencyKey`, así que la carrera fina sigue cubierta donde siempre estuvo.
 */
export const confirmHiringApplicationDecision = async ({
  applicationId,
  effectDigest,
  input,
  actorUserId,
}: {
  applicationId: string
  effectDigest: string
  input: DecideHiringApplicationInput
  actorUserId: string | null
}): Promise<DecideHiringApplicationResult> => {
  const application = await requireApplication(applicationId)
  const expected = computeEffectDigest(application, input.decision, input.cause ?? null)

  if (expected !== effectDigest.trim()) {
    throw new HiringValidationError(
      'El estado de la postulación cambió después de proponer la decisión. Vuelve a proponerla para ver el efecto vigente.',
      'hiring_decision_proposal_stale',
      409,
    )
  }

  return decideHiringApplication(application.applicationId, input, actorUserId)
}
