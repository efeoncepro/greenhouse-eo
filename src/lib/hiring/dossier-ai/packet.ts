import 'server-only'

import { createHash } from 'node:crypto'

import { redactCandidateContactText } from '@/lib/hiring/candidate-review/parser'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  DossierPacketCompetencyResult,
  DossierPacketResponse,
  EvaluationDossierPacket
} from '@/types/hiring-dossier-ai'

import { resolveHiringApplicationDocuments } from '../documents'
import { HiringNotFoundError, HiringValidationError } from '../errors'
import { getHiringApplicationById } from '../store'

// ══════════════════════════════════════════════════════════════════════════
// TASK-1735 — Assembler del packet al provider LLM. Allowlist EXPLÍCITA:
// (a) texto redactado del CV desde la proyección TASK-1718 (NUNCA el PDF crudo),
// (b) assessment: competency results + respuestas con score efectivo + rationaleRef,
// (c) journey: stages con timestamps, fuente y decisión.
// PROHIBIDO: nombre completo, email, teléfono, identidad legal, self-ID demográfico —
// este assembler NI SIQUIERA los consulta (cero queries a identity_profiles).
// ══════════════════════════════════════════════════════════════════════════

const MAX_CV_CHARS = 20000
const MAX_ANSWER_CHARS = 4000
const MAX_PROMPT_CHARS = 2000

/**
 * Extrae SOLO el texto de la respuesta (espejo de score-response.ts): `answer.text` o
 * `answer.value` si son string; si no, serialización acotada. Texto NO confiable.
 */
const extractAnswerText = (answer: Record<string, unknown>): string => {
  // Auditoría talent 2026-08-16: la respuesta del candidato es texto libre y puede
  // contener su email/teléfono — pasa por el mismo redactor de contacto que el CV.
  const raw =
    typeof answer.text === 'string'
      ? answer.text
      : typeof answer.value === 'string'
        ? answer.value
        : JSON.stringify(answer ?? {})

  return redactCandidateContactText(raw).slice(0, MAX_ANSWER_CHARS)
}

const num = (value: unknown): number | null => {
  if (value == null) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

type ProjectionRow = {
  content_hash: string
  status: string
  text_content: string | null
}

type ResponseRow = {
  response_id: string
  competency_key: string
  question_prompt: string | null
  answer_json: unknown
  effective_score: unknown
  rationale_ref: string | null
}

type CompetencyResultRow = {
  competency_key: string
  score: unknown
}

const cvNotReady = (cvStatus: string): HiringValidationError =>
  new HiringValidationError(
    'El CV de la postulación aún no tiene proyección de revisión lista.',
    'hiring_dossier_cv_not_ready',
    409,
    { cvStatus }
  )

/**
 * Ensambla el packet minimizado del dossier. Falla honesto con `hiring_dossier_cv_not_ready`
 * (409) si el CV no está en estado `ready` en la proyección redactada de TASK-1718.
 */
export const assembleEvaluationDossierPacket = async (applicationId: string): Promise<EvaluationDossierPacket> => {
  if (!applicationId || typeof applicationId !== 'string') {
    throw new HiringValidationError('Falta el identificador de la postulación.', 'hiring_invalid_input', 400)
  }

  const application = await getHiringApplicationById(applicationId)

  if (!application) {
    throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
  }

  // ── (a) CV: proyección minimizada/redactada TASK-1718 — NUNCA el PDF crudo ──
  const documents = await resolveHiringApplicationDocuments({ applicationId })
  const cvFile = documents.files.find(file => file.kind === 'cv') ?? null

  if (!cvFile) throw cvNotReady('unavailable')
  if (cvFile.status === 'pending') throw cvNotReady('pending')

  if (cvFile.status === 'quarantined' || cvFile.status === 'legacy_unscanned' || cvFile.scan?.verdict !== 'clean') {
    throw cvNotReady('blocked')
  }

  const projections = await runGreenhousePostgresQuery<ProjectionRow>(
    `SELECT content_hash, status, text_content
       FROM greenhouse_hiring.candidate_document_review_projection
      WHERE asset_id = $1
      ORDER BY extracted_at DESC, projection_id DESC
      LIMIT 1`,
    [cvFile.assetId]
  )

  const projection = projections[0] ?? null

  if (!projection) throw cvNotReady('pending')
  if (projection.status !== 'ready' || !projection.text_content) throw cvNotReady(projection.status)

  // ── (b) Assessment: respuestas con score efectivo + rationaleRef (ID, nunca el cuerpo) ──
  const responseRows = await runGreenhousePostgresQuery<ResponseRow>(
    `SELECT r.response_id,
            c.key AS competency_key,
            q.prompt AS question_prompt,
            r.answer_json,
            COALESCE(r.human_score, r.auto_score) AS effective_score,
            p.proposal_id AS rationale_ref
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = r.assessment_id
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = r.competency_id
       LEFT JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
       LEFT JOIN LATERAL (
         SELECT proposal_id FROM greenhouse_hiring.hiring_assessment_ai_proposal
          WHERE kind = 'response_score' AND target_ref = r.response_id
          ORDER BY created_at DESC LIMIT 1
       ) p ON TRUE
      WHERE a.application_id = $1 AND a.status = 'scored'
      ORDER BY c.key, r.created_at`,
    [applicationId]
  )

  const responses: DossierPacketResponse[] = responseRows.map(row => ({
    responseId: row.response_id,
    competencyKey: row.competency_key,
    prompt: (row.question_prompt ?? '').slice(0, MAX_PROMPT_CHARS),
    answerText: extractAnswerText((row.answer_json ?? {}) as Record<string, unknown>),
    effectiveScore: num(row.effective_score),
    rationaleRef: row.rationale_ref ?? null
  }))

  const competencyRows = await runGreenhousePostgresQuery<CompetencyResultRow>(
    `SELECT c.key AS competency_key, ROUND(AVG(cr.score)::numeric, 2) AS score
       FROM greenhouse_hiring.hiring_competency_result cr
       JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = cr.assessment_id
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = cr.competency_id
      WHERE a.application_id = $1 AND a.status = 'scored'
      GROUP BY c.key
      ORDER BY c.key`,
    [applicationId]
  )

  const competencyResults: DossierPacketCompetencyResult[] = competencyRows.map(row => ({
    competencyKey: row.competency_key,
    score: num(row.score) ?? 0
  }))

  // ── (c) Journey: stages con timestamps, fuente y decisión (sin PII) ──
  // Journey sintético (no hay tabla de stage-history): postulación + etapa vigente.
  const stages: Array<{ stage: string; at: string }> = [
    { stage: 'applied', at: application.createdAt },
    { stage: application.stage, at: application.updatedAt }
  ]

  return {
    schemaVersion: 'hiring_evaluation_dossier_packet.v1',
    applicationId: application.applicationId,
    cv: {
      contentHash: projection.content_hash,
      text: projection.text_content.slice(0, MAX_CV_CHARS)
    },
    assessment: {
      competencyResults,
      responses,
      overallScore: application.score
    },
    journey: {
      appliedAt: application.createdAt,
      source: application.source,
      currentStage: application.stage,
      stages,
      decision: application.decision
        ? { decision: application.decision, decisionAt: application.decisionAt }
        : null
    }
  }
}

/**
 * Digest de idempotencia del propose: sha256 de {cvContentHash, responseIds+scores efectivos,
 * stages/decisión, modelo EFECTIVO resuelto, prompt version}. Mismo estado de fuentes →
 * mismo digest → misma propuesta activa, sin segunda llamada al provider.
 */
export const computeDossierInputDigest = (
  packet: EvaluationDossierPacket,
  effectiveModel: string,
  promptVersion: string
): string => {
  const material = {
    cvContentHash: packet.cv.contentHash,
    responses: packet.assessment.responses.map(response => ({
      id: response.responseId,
      score: response.effectiveScore
    })),
    overallScore: packet.assessment.overallScore,
    journey: {
      currentStage: packet.journey.currentStage,
      decision: packet.journey.decision?.decision ?? null
    },
    model: effectiveModel,
    promptVersion
  }

  return createHash('sha256').update(JSON.stringify(material)).digest('hex')
}
