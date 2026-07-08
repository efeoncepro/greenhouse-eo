import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  createHiringApplication,
  createHiringOpening,
  createTalentDemand,
  getHiringApplicationById,
  reconcileCandidateFacet,
} from '../store'

import { assignCandidateTest, saveResponse } from './instances'
import { finalizeAssessment, isAssessmentFullyScored, recordHumanScore, submitAssessment } from './scoring'
import { createQuestion, transitionQuestionStatus } from './store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live regression guard for TASK-1360 Slice 4 (objective auto-score + human queue + deterministic
// rollup to hiring_application). Full path against real PG. Cleans up (cascade + questions).
describe.skipIf(!hasPgConfig)('assessment scoring + rollup — live PG (TASK-1360)', () => {
  const c = { demandId: '', openingId: '', facetId: '', applicationId: '', assessmentId: '', qSeo: '', qCopy: '' }

  afterAll(async () => {
    if (c.applicationId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`, [
        c.applicationId,
      ]).catch(() => undefined)

    for (const [tbl, id] of [
      ['candidate_facet', c.facetId],
      ['hiring_opening', c.openingId],
      ['talent_demand', c.demandId],
    ] as const) {
      const col = tbl === 'candidate_facet' ? 'candidate_facet_id' : tbl === 'hiring_opening' ? 'opening_id' : 'demand_id'

      if (id) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.${tbl} WHERE ${col} = $1`, [id]).catch(() => undefined)
    }

    for (const qid of [c.qSeo, c.qCopy])
      if (qid) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_question WHERE question_id = $1`, [qid]).catch(() => undefined)
    const ids = [c.demandId, c.openingId, c.facetId, c.applicationId, c.assessmentId].filter(Boolean)

    if (ids.length)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`, [ids]).catch(() => undefined)
  })

  it('objective auto-scores at submit; open answers queue for human; finalize rolls up weighted to the application', async () => {
    const identityProfileId = (
      await runGreenhousePostgresQuery<{ profile_id: string }>(
        `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE active = true LIMIT 1`,
      )
    )[0].profile_id

    // Fixture pipeline.
    const demand = await createTalentDemand(
      { stakeholderType: 'internal', engagementType: 'on_going', fulfillmentMode: 'internal_hire', demandOrigin: 'capacity_gap', requestedRole: 'LIVE-TEST scoring' },
      'user-live-test',
    )

    c.demandId = demand.demandId
    const opening = await createHiringOpening({ demandId: demand.demandId, internalTitle: 'LIVE-TEST' }, 'user-live-test')

    c.openingId = opening.openingId
    const facet = await reconcileCandidateFacet({ identityProfileId, source: 'manual' }, 'user-live-test')

    c.facetId = facet.candidateFacetId

    const app = await createHiringApplication(
      { openingId: opening.openingId, identityProfileId, candidateFacetId: facet.candidateFacetId },
      'user-live-test',
    )

    c.applicationId = app.applicationId

    // Two questions in the AM template competencies: seo (single_choice, weight 8) + copywriting (open_text, weight 12).
    const qSeo = await createQuestion(
      { competencyKey: 'seo', level: 'nociones', type: 'single_choice', prompt: '¿Qué es un title tag?', options: [{ id: 'a' }, { id: 'b' }], answerKey: { correct: 'b' } },
      'user-live-test',
    )

    c.qSeo = qSeo.questionId
    await transitionQuestionStatus(qSeo.questionId, 'sme_review', 'user-live-test')
    await transitionQuestionStatus(qSeo.questionId, 'active', 'user-live-test')

    const qCopy = await createQuestion(
      { competencyKey: 'copywriting', level: 'intermedio', type: 'open_text', prompt: 'Reescribe este copy.', rubric: { guide: 'claridad + persuasión' } },
      'user-live-test',
    )

    c.qCopy = qCopy.questionId
    await transitionQuestionStatus(qCopy.questionId, 'sme_review', 'user-live-test')
    await transitionQuestionStatus(qCopy.questionId, 'active', 'user-live-test')

    const { assessment } = await assignCandidateTest({ applicationId: app.applicationId, templateId: 'atpl-account-manager-l2' }, 'user-live-test')

    c.assessmentId = assessment.assessmentId

    // Candidate answers: seo correct (→100), copy open (→human).
    await saveResponse({ assessmentId: assessment.assessmentId, competencyId: qSeo.competencyId, questionId: qSeo.questionId, questionType: 'single_choice', answer: { selected: 'b' } })
    await saveResponse({ assessmentId: assessment.assessmentId, competencyId: qCopy.competencyId, questionId: qCopy.questionId, questionType: 'open_text', answer: { text: 'copy reescrito' } })

    await submitAssessment(assessment.assessmentId, 'user-live-test')
    expect(await isAssessmentFullyScored(assessment.assessmentId)).toBe(false) // open pendiente

    // Human rates the open answer 80; now fully scored.
    const openResp = (
      await runGreenhousePostgresQuery<{ response_id: string }>(
        `SELECT response_id FROM greenhouse_hiring.hiring_assessment_response WHERE assessment_id = $1 AND needs_human_rating = TRUE LIMIT 1`,
        [assessment.assessmentId],
      )
    )[0]

    await recordHumanScore(openResp.response_id, 80, 'user-reviewer')
    expect(await isAssessmentFullyScored(assessment.assessmentId)).toBe(true)

    await finalizeAssessment(assessment.assessmentId, 'user-reviewer')

    // Rollup: weighted (seo=100*8 + copy=80*12)/(8+12) = 88, written to the application (advisory).
    const rolled = await getHiringApplicationById(c.applicationId)

    expect(rolled?.score).toBe(88)
    expect(rolled?.explainability).toHaveProperty('assessment')
    const assessmentBlock = (rolled?.explainability as { assessment?: { overallScore?: number } }).assessment

    expect(assessmentBlock?.overallScore).toBe(88)
  })
})
