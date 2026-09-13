import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import type { PoolClient } from 'pg'

import { resolveLiveTestCandidateFixture } from '@/lib/hiring/live-test-identity'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { insertCandidateTest, saveResponseWithClient } from './instances'
import { listPublicAssessmentQuestionsWithClient } from './public-taking'
import { submitAssessmentWithClient } from './scoring'
import { readQuestionnaireSnapshot } from './questionnaire'
import { findForbiddenKeys } from './public-boundary.contract'

// All demand/opening/application/assessment/question changes roll back together.
// The scoped synthetic identity is the only durable fixture. No assignment event or email is emitted.
const rollback = new Error('questionnaire-fixture-rollback')
const actor = 'test:questionnaire-snapshot:synthetic'

const setup = async (client: PoolClient, profileId: string, facetId: string) => {
  const id = randomUUID()

  const demand = (await client.query(`INSERT INTO greenhouse_hiring.talent_demand
    (stakeholder_type, engagement_type, fulfillment_mode, demand_origin, requested_role, data_origin)
    VALUES ('internal','on_going','internal_hire','manual_internal','Snapshot fixture','smoke_test') RETURNING demand_id`)).rows[0]

  const opening = (await client.query(`INSERT INTO greenhouse_hiring.hiring_opening
    (demand_id, internal_title, data_origin) VALUES ($1,'Snapshot fixture','smoke_test') RETURNING opening_id`, [demand.demand_id])).rows[0]

  const app = (await client.query(`INSERT INTO greenhouse_hiring.hiring_application
    (opening_id, identity_profile_id, candidate_facet_id) VALUES ($1,$2,$3) RETURNING application_id`, [opening.opening_id, profileId, facetId])).rows[0]

  const comp = (await client.query(`INSERT INTO greenhouse_hiring.hiring_competency (key,name,category)
    VALUES ($1,'Snapshot fixture','skill') RETURNING competency_id`, [`snapshot-fixture-${id}`])).rows[0]

  const template = (await client.query(`INSERT INTO greenhouse_hiring.hiring_assessment_template (name)
    VALUES ('Snapshot fixture') RETURNING template_id`)).rows[0]

  await client.query(`INSERT INTO greenhouse_hiring.hiring_assessment_template_module
    (template_id,competency_id,target_level,weight) VALUES ($1,$2,'avanzado',100)`, [template.template_id, comp.competency_id])

  const question = (await client.query(`INSERT INTO greenhouse_hiring.hiring_question
    (competency_id,level,type,prompt,options_json,answer_key_json,rubric_json,status,created_by)
    VALUES ($1,'avanzado','single_choice','Original fixture prompt','[{"id":"a"},{"id":"b"}]','{"correct":"a"}','{"guide":"Original private rubric"}','active',$2)
    RETURNING question_id`, [comp.competency_id, actor])).rows[0]

  return { applicationId: app.application_id, templateId: template.template_id, competencyId: comp.competency_id, questionId: question.question_id }
}

const rejectedWrite = async (client: PoolClient, work: () => Promise<unknown>, code: string) => {
  await client.query('SAVEPOINT rejected_write')

  try {
    await expect(work()).rejects.toMatchObject({ code })
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT rejected_write')
  }
}

const hasPgConfig = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('questionnaire snapshot — real PostgreSQL, rollback-only', () => {
  it('preserves original taking and objective correction after retirement/content drift; protects identity and immutability', async () => {
    const fixture = await resolveLiveTestCandidateFixture('questionnaire-snapshot-live')

    await expect(withGreenhousePostgresTransaction(async client => {
      const ids = await setup(client, fixture.profileId, fixture.candidateFacetId)
      const assigned = await insertCandidateTest(client, { ...ids, timeLimitMinutes: 75 }, actor)
      const assessment = assigned.assessment
      const snapshot = await readQuestionnaireSnapshot(assessment.assessmentId, client)

      expect(snapshot?.rows).toHaveLength(1)
      expect(snapshot?.rows[0].rubric_json).toEqual({ guide: 'Original private rubric' })
      const before = await listPublicAssessmentQuestionsWithClient(client, assessment)

      expect(findForbiddenKeys(before)).toEqual([])
      expect(JSON.stringify(before)).not.toContain('Original private rubric')

      await client.query(`UPDATE greenhouse_hiring.hiring_question SET prompt='Changed bank prompt',
        answer_key_json='{"correct":"b"}', rubric_json='{"guide":"Changed rubric"}', status='retired'
        WHERE question_id=$1`, [ids.questionId])
      const after = await listPublicAssessmentQuestionsWithClient(client, assessment)

      expect(after).toEqual(before)
      const replay = await insertCandidateTest(client, { ...ids, timeLimitMinutes: 75 }, actor)

      expect(replay.created).toBe(false)
      expect(replay.token).toBeNull()
      expect(replay.assessment.assessmentId).toBe(assessment.assessmentId)

      await rejectedWrite(client, () => client.query(`UPDATE greenhouse_hiring.hiring_assessment
        SET questionnaire_snapshot_json=NULL WHERE assessment_id=$1`, [assessment.assessmentId]), '23514')
      await rejectedWrite(client, () => client.query(`DELETE FROM greenhouse_hiring.hiring_question WHERE question_id=$1`, [ids.questionId]), '23503')
      await rejectedWrite(client, () => saveResponseWithClient(client, {
        assessmentId: assessment.assessmentId, competencyId: ids.competencyId, questionId: 'question-not-assigned', questionType: 'single_choice', answer: { selected: 'a' },
      }), 'assessment_question_not_found')
      await rejectedWrite(client, () => saveResponseWithClient(client, {
        assessmentId: assessment.assessmentId, competencyId: ids.competencyId, questionId: null, questionType: 'open_text', answer: { text: 'ad hoc' },
      }), 'assessment_question_not_found')

      const saved = await saveResponseWithClient(client, {
        assessmentId: assessment.assessmentId, competencyId: ids.competencyId, questionId: ids.questionId,
        questionType: 'open_text', answer: { selected: 'a' }, // caller type intentionally wrong
      })

      expect(saved.outcome).toBe('ok')
      expect(await submitAssessmentWithClient(client, assessment.assessmentId, actor)).toMatchObject({ outcome: 'ok' })

      const result = (await client.query(`SELECT r.auto_score, q.rubric_json FROM greenhouse_hiring.hiring_assessment_response r
        JOIN greenhouse_hiring.hiring_assessment_question q ON q.assessment_id=r.assessment_id AND q.question_id=r.question_id
        WHERE r.assessment_id=$1`, [assessment.assessmentId])).rows[0]

      expect(Number(result.auto_score)).toBe(100)
      expect(result.rubric_json).toEqual({ guide: 'Original private rubric' })
      throw rollback
    })).rejects.toBe(rollback)
  })
})
