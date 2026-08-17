import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { listAssessmentsForApplication } from '../assessment'
import { resolveHiringApplicationDocuments } from '../documents'
import { HiringNotFoundError, HiringValidationError } from '../errors'
import { getHiringApplicationById, getHiringOpeningById, listHiringApplications } from '../store'
import {
  CANDIDATE_REVIEW_PURPOSES,
  type CandidateReviewApplicationList,
  type CandidateReviewCvStatus,
  type CandidateReviewPacket,
  type CandidateReviewPurpose
} from './contracts'
import { chunkCandidateText } from './parser'

type CandidateNameRow = { full_name: string | null }
type ProjectionRow = {
  content_hash: string
  status: 'ready' | 'ocr_required' | 'blocked' | 'failed' | 'stale'
  text_content: string | null
  source_updated_at: string
  extracted_at: string
  extraction_version: string
  redaction_policy_version: string
}

const candidateName = async (identityProfileId: string) => {
  const rows = await runGreenhousePostgresQuery<CandidateNameRow>(
    `SELECT full_name FROM greenhouse_core.identity_profiles WHERE profile_id=$1 LIMIT 1`,
    [identityProfileId]
  )

  return rows[0]?.full_name?.trim() || 'Candidato'
}

const latestProjection = async (assetId: string) => {
  const rows = await runGreenhousePostgresQuery<ProjectionRow>(
    `SELECT content_hash,status,text_content,source_updated_at,extracted_at,
            extraction_version,redaction_policy_version
       FROM greenhouse_hiring.candidate_document_review_projection
      WHERE asset_id=$1
      ORDER BY extracted_at DESC,projection_id DESC LIMIT 1`,
    [assetId]
  )

  return rows[0] ?? null
}

const resolveCv = async (applicationId: string) => {
  const documents = await resolveHiringApplicationDocuments({ applicationId })
  const cv = documents.files.find(file => file.kind === 'cv') ?? null

  if (!cv) return { status: 'unavailable' as const, cv: null, projection: null, documents }
  if (cv.status === 'pending') return { status: 'pending' as const, cv, projection: null, documents }

  if (cv.status === 'quarantined' || cv.status === 'legacy_unscanned' || cv.scan?.verdict !== 'clean') {
    return { status: 'blocked' as const, cv, projection: null, documents }
  }

  const projection = await latestProjection(cv.assetId)

  if (!projection) return { status: 'pending' as const, cv, projection: null, documents }

  const status: CandidateReviewCvStatus =
    projection.status === 'ready'
      ? 'ready'
      : projection.status === 'ocr_required'
        ? 'ocr_required'
        : projection.status === 'stale'
          ? 'stale'
          : 'blocked'

  return { status, cv, projection, documents }
}

export const listCandidateReviewApplications = async ({
  openingId,
  stage,
  limit = 25,
  offset = 0
}: {
  openingId: string
  stage?: string
  limit?: number
  offset?: number
}): Promise<CandidateReviewApplicationList> => {
  const boundedLimit = Math.min(Math.max(limit, 1), 50)
  const boundedOffset = Math.max(offset, 0)
  const opening = await getHiringOpeningById(openingId)

  if (!opening) throw new HiringNotFoundError('La vacante no existe.', 'hiring_opening_not_found')

  const applications = await listHiringApplications({
    openingId,
    ...(stage ? { stage: stage as never } : {}),
    limit: boundedLimit + 1,
    offset: boundedOffset
  })

  const page = applications.slice(0, boundedLimit)

  const items = await Promise.all(
    page.map(async application => ({
      applicationId: application.applicationId,
      openingId: application.openingId,
      openingTitle: opening.internalTitle,
      stage: application.stage,
      appliedAt: application.createdAt,
      candidate: { displayName: await candidateName(application.identityProfileId) },
      cvStatus: (await resolveCv(application.applicationId)).status
    }))
  )

  return { items, nextOffset: applications.length > boundedLimit ? boundedOffset + boundedLimit : null }
}

export const getCandidateReviewPacket = async ({
  applicationId,
  purpose,
  chunkIndex = 0,
  expectedContentHash
}: {
  applicationId: string
  purpose: CandidateReviewPurpose
  chunkIndex?: number
  expectedContentHash?: string
}): Promise<CandidateReviewPacket> => {
  if (!CANDIDATE_REVIEW_PURPOSES.includes(purpose)) {
    throw new HiringValidationError('La finalidad de revisión no es válida.', 'candidate_review_purpose_invalid', 400)
  }

  const application = await getHiringApplicationById(applicationId)

  if (!application) throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
  const opening = await getHiringOpeningById(application.openingId)

  if (!opening) throw new HiringNotFoundError('La vacante no existe.', 'hiring_opening_not_found')

  const [name, assessments, resolved] = await Promise.all([
    candidateName(application.identityProfileId),
    listAssessmentsForApplication(applicationId),
    resolveCv(applicationId)
  ])

  const projection = resolved.projection

  if (expectedContentHash && projection?.content_hash !== expectedContentHash) {
    throw new HiringValidationError(
      'El documento cambió; solicita el paquete nuevamente.',
      'candidate_review_stale',
      409
    )
  }

  const chunks =
    projection?.status === 'ready' && projection.text_content ? chunkCandidateText(projection.text_content) : []

  if (chunks.length && (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= chunks.length)) {
    throw new HiringValidationError('El chunk solicitado no existe.', 'candidate_review_chunk_invalid', 400)
  }

  return {
    schemaVersion: 'candidate-review-packet.v1',
    application: {
      applicationId: application.applicationId,
      openingId: application.openingId,
      openingTitle: opening.internalTitle,
      stage: application.stage,
      appliedAt: application.createdAt
    },
    candidate: { displayName: name },
    portfolioLinks: resolved.documents.links.map(link => ({ ...link, trust: 'untrusted_candidate_supplied' })),
    // TASK-1719 — Las evaluaciones `cancelled` NO entran al contexto del dossier IA.
    // Una cancelación es un acto ADMINISTRATIVO del operador (plantilla equivocada, duplicada,
    // enviada por error) y la instancia nunca tuvo respuestas: sólo se cancela pre-inicio.
    // Dejarla entrar invita a la inferencia adversa —"no completó la evaluación"— y convierte
    // un error nuestro en una señal negativa contra el candidato. Es exclusión DECLARADA, no
    // silenciosa: la fila cancelada sigue visible en Application 360 para el operador humano.
    assessments: assessments
      .filter(assessment => assessment.status !== 'cancelled')
      .map(assessment => ({
        assessmentId: assessment.publicId,
        method: assessment.method,
        status: assessment.status,
        submittedAt: assessment.submittedAt,
        updatedAt: assessment.updatedAt
      })),
    cv: {
      status: resolved.status,
      trust: 'untrusted_candidate_supplied',
      contentHash: projection?.content_hash ?? null,
      chunkIndex: chunks.length ? chunkIndex : null,
      chunkCount: chunks.length,
      text: chunks.length ? chunks[chunkIndex] : null
    },
    freshness: {
      sourceUpdatedAt: projection?.source_updated_at ?? application.updatedAt,
      projectedAt: projection?.extracted_at ?? null,
      extractionVersion: projection?.extraction_version ?? null,
      redactionPolicyVersion: projection?.redaction_policy_version ?? null
    }
  }
}
