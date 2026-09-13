import { randomUUID } from 'node:crypto'

import { expect, it } from 'vitest'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { createQuestion, getQuestionById, transitionQuestionStatus } from './store'
import { questionContentDigest, reviseUnpublishedQuestion } from './question-revisions'

const hasPgConfig = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

it.skipIf(!hasPgConfig)('revises an unpublished question atomically, replays once, and rejects stale/conflicting/active revisions', async () => {
  const rollback = new Error('revision-fixture-rollback')
  const actor = 'test:question-revision:synthetic'

  await expect(withGreenhousePostgresTransaction(async client => {
    const competencyKey = `revision-fixture-${randomUUID()}`

    await client.query(`INSERT INTO greenhouse_hiring.hiring_competency (key,name,category) VALUES ($1,'Revision fixture','skill')`, [competencyKey])
    const question = { competencyKey, level: 'avanzado' as const, type: 'open_text' as const, prompt: 'Original synthetic question' }
    const source = await createQuestion(question, actor, client)

    await transitionQuestionStatus(source.questionId, 'sme_review', actor, client)
    const input = { sourceQuestionId: source.questionId, expectedSourceDigest: questionContentDigest(source), question: { ...question, prompt: 'Revised synthetic question' }, reason: 'Rollback-only test' }
    const revised = await reviseUnpublishedQuestion(input, actor, client)

    expect(revised.status).toBe('sme_review')
    expect(revised.questionId).not.toBe(source.questionId)
    expect((await getQuestionById(source.questionId, client))?.status).toBe('retired')
    expect((await reviseUnpublishedQuestion(input, actor, client)).questionId).toBe(revised.questionId)
    await expect(reviseUnpublishedQuestion({ ...input, expectedSourceDigest: '0'.repeat(64) }, actor, client)).rejects.toMatchObject({ code: 'assessment_question_revision_stale' })
    await expect(reviseUnpublishedQuestion({ ...input, question: { ...question, prompt: 'Other revision' } }, actor, client)).rejects.toMatchObject({ code: 'assessment_question_revision_conflict' })

    const lineage = (await client.query(`SELECT * FROM greenhouse_hiring.hiring_question_revision WHERE source_question_id=$1`, [source.questionId])).rows

    expect(lineage).toHaveLength(1)
    expect(lineage[0]).toMatchObject({ revision_question_id: revised.questionId, actor_user_id: actor, target_digest: questionContentDigest(revised) })
    await transitionQuestionStatus(revised.questionId, 'active', actor, client)
    await expect(reviseUnpublishedQuestion({ ...input, sourceQuestionId: revised.questionId, expectedSourceDigest: questionContentDigest(revised), question: { ...question, prompt: 'Active change' } }, actor, client)).rejects.toMatchObject({ code: 'assessment_question_revision_not_draft' })
    throw rollback
  })).rejects.toBe(rollback)
})
