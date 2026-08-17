import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  ConfirmEvaluationDossierInput,
  DossierProposal,
  DossierProposalDecision,
  DossierProposalStatus,
  EvaluationDossierDraft
} from '@/types/hiring-dossier-ai'
import { DOSSIER_PROPOSAL_DECISIONS } from '@/types/hiring-dossier-ai'

import {
  HIRING_APPLICATION_NOTE_BODY_MAX,
  recordHiringApplicationNote,
  type HiringApplicationNote
} from '../application-notes'
import { HiringValidationError } from '../errors'
import { lockDossierProposalForUpdate, markDossierProposalDecided } from './store'

// ══════════════════════════════════════════════════════════════════════════
// TASK-1735 — Confirmación humana del dossier (el ÚNICO write que materializa el
// borrador agéntico como nota). propose→confirm→execute: el LLM propuso evidencia;
// acá un humano (capability-gated en la ruta) confirma o rechaza. Terminal-once con
// FOR UPDATE en una tx única; la propuesta original queda inmutable en el ledger.
// ══════════════════════════════════════════════════════════════════════════

interface DossierTransition {
  next: DossierProposalStatus
  /** false = no-op idempotente (misma decisión ya aplicada); no re-ejecutar el efecto. */
  apply: boolean
}

/** State machine pura del ledger (espejo de assessment/ai/state.ts). */
export const resolveDossierProposalTransition = (
  current: DossierProposalStatus,
  decision: DossierProposalDecision
): DossierTransition => {
  const target: DossierProposalStatus = decision === 'confirm' ? 'confirmed' : 'rejected'

  if (current === 'proposed') {
    return { next: target, apply: true }
  }

  if (current === target) {
    return { next: current, apply: false }
  }

  throw new HiringValidationError(
    `No se puede ${decision === 'confirm' ? 'confirmar' : 'rechazar'} una propuesta que ya está ${current === 'confirmed' ? 'confirmada' : 'rechazada'}.`,
    'hiring_dossier_invalid_transition',
    409
  )
}

/**
 * Render markdown es-CL del borrador estructurado — ÍNTEGRO, sin recorte.
 *
 * NUNCA truncar acá: hasta TASK-1735 este render cortaba en silencio a
 * `HIRING_APPLICATION_NOTE_BODY_MAX` y persistía el análisis confirmado a mitad de frase
 * (el panel no lo delataba porque renderiza desde `proposedJson`, pero todo consumer del
 * `bodyMd` — API, export, Nexa, MCP — leía un documento cortado). El techo se subió a
 * 20000 y el exceso ahora falla LOUD en `assertDossierBodyWithinLimit`; el humano edita
 * el cuerpo antes de confirmar en vez de perder evidencia sin aviso.
 */
export const renderEvaluationDossierMarkdown = (draft: EvaluationDossierDraft): string => {
  const lines: string[] = ['## Resumen ejecutivo', '', draft.resumenEjecutivo]

  if (draft.coherencias.length > 0) {
    lines.push('', '## Coherencias CV ↔ assessment', '')
    draft.coherencias.forEach(claim => lines.push(`- ${claim.afirmacion}\n  - Evidencia: ${claim.evidencia}`))
  }

  if (draft.gaps.length > 0) {
    lines.push('', '## Gaps y red flags', '')
    draft.gaps.forEach(claim => lines.push(`- ${claim.afirmacion}\n  - Evidencia: ${claim.evidencia}`))
  }

  if (draft.focosEntrevista.length > 0) {
    lines.push('', '## Focos sugeridos para la entrevista', '')
    draft.focosEntrevista.forEach(item => lines.push(`- ${item}`))
  }

  if (draft.noVerificable.length > 0) {
    lines.push('', '## No verificable con las fuentes', '')
    draft.noVerificable.forEach(item => lines.push(`- ${item}`))
  }

  return lines.join('\n')
}

/**
 * Guard del write path: el cuerpo que se va a materializar cabe en la nota, o se aborta con
 * error accionable. Truncar en silencio pierde evidencia del análisis; fallar loud le dice al
 * humano exactamente cuánto sobra para que lo edite antes de confirmar.
 */
export const assertDossierBodyWithinLimit = (bodyMd: string): void => {
  if (bodyMd.length <= HIRING_APPLICATION_NOTE_BODY_MAX) return

  throw new HiringValidationError(
    `El análisis tiene ${bodyMd.length} caracteres y el máximo de la nota es ${HIRING_APPLICATION_NOTE_BODY_MAX}. Edita el cuerpo antes de confirmar: no se guarda recortado.`,
    'hiring_dossier_body_too_long',
    400
  )
}

export interface ConfirmEvaluationDossierResult {
  proposal: DossierProposal
  /** Nota materializada (solo cuando decision=confirm aplicó; reject/no-op → null). */
  note: HiringApplicationNote | null
}

/**
 * Command `confirmEvaluationDossier`: tx única — marca la propuesta terminal-once y, si
 * confirma, materializa la nota vía `recordHiringApplicationNote` (source='agent', kind
 * derivado del packet, provenance completo en context_json) en la MISMA tx. El humano
 * puede editar el cuerpo (`editedBodyMd`); la propuesta original queda inmutable.
 * NO se gatea por el flag: un humano siempre puede drenar la cola de propuestas.
 */
export const confirmEvaluationDossier = async (
  input: ConfirmEvaluationDossierInput
): Promise<ConfirmEvaluationDossierResult> => {
  if (!input.actorUserId) {
    throw new HiringValidationError('Falta el usuario que decide.', 'hiring_dossier_missing_actor', 401)
  }

  if (!DOSSIER_PROPOSAL_DECISIONS.includes(input.decision)) {
    throw new HiringValidationError('La decisión no es válida.', 'hiring_dossier_invalid_decision', 400)
  }

  if (!input.proposalId || typeof input.proposalId !== 'string') {
    throw new HiringValidationError('Falta el identificador de la propuesta.', 'hiring_invalid_input', 400)
  }

  return withGreenhousePostgresTransaction(async client => {
    const proposal = await lockDossierProposalForUpdate(client, input.proposalId)
    const transition = resolveDossierProposalTransition(proposal.status, input.decision)

    // Idempotente: misma decisión ya aplicada → devolver el estado actual sin re-ejecutar.
    if (!transition.apply) {
      return { proposal, note: null }
    }

    let note: HiringApplicationNote | null = null

    if (input.decision === 'confirm') {
      const dossier = proposal.proposed.dossier as EvaluationDossierDraft | undefined

      if (!dossier || typeof dossier.resumenEjecutivo !== 'string') {
        throw new HiringValidationError(
          'La propuesta no tiene un borrador válido para confirmar.',
          'hiring_dossier_invalid_draft',
          409
        )
      }

      const sources = (proposal.proposed.sources ?? {}) as Record<string, unknown>
      const bodyMd = input.editedBodyMd?.trim() || renderEvaluationDossierMarkdown(dossier)

      // Fail loud antes del insert: nunca se recorta el análisis para que quepa.
      assertDossierBodyWithinLimit(bodyMd)

      // Kind derivado del packet: con CV en las fuentes es análisis CV↔assessment;
      // sin CV, es una revisión del assessment.
      const kind = typeof sources.cvContentHash === 'string' && sources.cvContentHash ? 'cv_analysis' : 'assessment_review'

      note = await recordHiringApplicationNote(
        {
          applicationId: proposal.applicationId,
          kind,
          bodyMd,
          authorUserId: input.actorUserId,
          source: 'agent',
          contextJson: {
            dossierProposalId: proposal.proposalId,
            inputDigest: proposal.inputDigest,
            model: proposal.model,
            promptVersion: proposal.promptVersion
          }
        },
        client
      )
    }

    const decided = await markDossierProposalDecided(client, {
      proposalId: proposal.proposalId,
      status: transition.next as 'confirmed' | 'rejected',
      decisionNote: input.decisionNote?.trim() || null,
      actorUserId: input.actorUserId
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringApplication,
        aggregateId: decided.applicationId,
        eventType: EVENT_TYPES.hiringApplicationDossierConfirmed,
        payload: {
          proposalId: decided.proposalId,
          applicationId: decided.applicationId,
          decision: input.decision,
          status: decided.status,
          noteId: note?.noteId ?? null,
          actorUserId: input.actorUserId
        }
      },
      client
    )

    return { proposal: decided, note }
  })
}
