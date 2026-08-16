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

const TRUNCATION_SUFFIX = '\n\n_(Contenido truncado al máximo de la nota.)_'

/** Render markdown es-CL del borrador estructurado, acotado al máximo del body de nota. */
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

  const rendered = lines.join('\n')

  if (rendered.length <= HIRING_APPLICATION_NOTE_BODY_MAX) return rendered

  return rendered.slice(0, HIRING_APPLICATION_NOTE_BODY_MAX - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX
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
