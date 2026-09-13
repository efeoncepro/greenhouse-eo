import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { QUESTION_LEVELS, QUESTION_TYPES, type CreateQuestionInput, type Question } from '@/types/hiring-assessment'
import { HiringNotFoundError, HiringValidationError } from '../errors'
import { canonicalAssessmentValue } from './questionnaire'
import { createQuestion, getQuestionById, transitionQuestionStatus } from './store'

export const questionContentDigest = (question: Pick<Question, 'competencyId' | 'level' | 'type' | 'prompt' | 'options' | 'answerKey' | 'rubric'>) =>
  createHash('sha256').update(JSON.stringify(canonicalAssessmentValue({
    competencyId: question.competencyId, level: question.level, type: question.type, prompt: question.prompt.trim(),
    options: question.options ?? [], answerKey: question.answerKey ?? {}, rubric: question.rubric ?? {},
  }))).digest('hex')

export interface ReviseQuestionInput {
  sourceQuestionId: string
  expectedSourceDigest: string
  question: CreateQuestionInput
  reason: string
}

/** Atomic draft revision: retain the source, retire it, create a successor in SME review.
 * No activation. Used questions and changed source content require a new human review.
 */
export const reviseUnpublishedQuestion = async (input: ReviseQuestionInput, actorUserId: string, externalClient: PoolClient | null = null): Promise<Question> => {
  if (typeof actorUserId !== 'string' || !actorUserId.trim() ||
      typeof input?.sourceQuestionId !== 'string' || !input.sourceQuestionId.trim() ||
      typeof input.expectedSourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedSourceDigest) ||
      typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000 ||
      typeof input.question?.prompt !== 'string' || !input.question.prompt.trim() ||
      typeof input.question.competencyKey !== 'string' || !input.question.competencyKey.trim() ||
      !QUESTION_LEVELS.includes(input.question.level) || !QUESTION_TYPES.includes(input.question.type)) {
    throw new HiringValidationError('La revisión requiere actor y motivo.', 'assessment_question_revision_invalid', 400)
  }

  const run = async (client: PoolClient): Promise<Question> => {
    await client.query('SELECT question_id FROM greenhouse_hiring.hiring_question WHERE question_id = $1 FOR UPDATE', [input.sourceQuestionId])
    const source = await getQuestionById(input.sourceQuestionId, client)

    if (!source) throw new HiringNotFoundError('La pregunta no existe.', 'assessment_question_not_found')
    const sourceDigest = questionContentDigest(source)

    if (sourceDigest !== input.expectedSourceDigest) {
      throw new HiringValidationError('La pregunta cambió desde la revisión.', 'assessment_question_revision_stale', 409)
    }

    const competency = (await client.query('SELECT key FROM greenhouse_hiring.hiring_competency WHERE competency_id = $1', [source.competencyId])).rows[0]

    if (competency?.key !== input.question.competencyKey) {
      throw new HiringValidationError('La revisión conserva la competencia original.', 'assessment_question_revision_competency', 409)
    }

    const targetDigest = questionContentDigest({
      ...input.question, competencyId: source.competencyId, options: input.question.options ?? [],
      answerKey: input.question.answerKey ?? {}, rubric: input.question.rubric ?? {},
    })

    const prior = (await client.query(`SELECT revision_question_id, target_digest FROM greenhouse_hiring.hiring_question_revision
      WHERE source_question_id = $1`, [source.questionId])).rows[0]

    if (prior) {
      if (prior.target_digest !== targetDigest) {
        throw new HiringValidationError('Existe otra revisión de esta pregunta.', 'assessment_question_revision_conflict', 409)
      }

      const successor = await getQuestionById(prior.revision_question_id, client)

      if (!successor || questionContentDigest(successor) !== targetDigest) {
        throw new HiringValidationError('La versión revisada cambió.', 'assessment_question_revision_stale', 409)
      }

      return successor
    }

    if (sourceDigest === targetDigest) return source

    if (!['draft', 'sme_review'].includes(source.status)) {
      throw new HiringValidationError('Sólo se revisan borradores no activos.', 'assessment_question_revision_not_draft', 409)
    }

    const used = await client.query(`SELECT 1 FROM greenhouse_hiring.hiring_assessment_response WHERE question_id = $1 LIMIT 1`, [source.questionId])

    if (used.rows.length) throw new HiringValidationError('La pregunta tiene respuestas.', 'assessment_question_revision_used', 409)
    const created = await createQuestion(input.question, actorUserId, client)
    const revised = await transitionQuestionStatus(created.questionId, 'sme_review', actorUserId, client)

    await transitionQuestionStatus(source.questionId, 'retired', actorUserId, client)
    await client.query(`INSERT INTO greenhouse_hiring.hiring_question_revision
      (source_question_id, revision_question_id, source_digest, target_digest, actor_user_id, reason)
      VALUES ($1,$2,$3,$4,$5,$6)`, [source.questionId, revised.questionId, sourceDigest, targetDigest, actorUserId, input.reason.trim()])

    return revised
  }

  return externalClient ? run(externalClient) : withGreenhousePostgresTransaction(run)
}
