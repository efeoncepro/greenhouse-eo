import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  createHiringApplication,
  createHiringOpening,
  createTalentDemand,
  reconcileCandidateFacet,
} from '../store'

import {
  assignCandidateTest,
  getAssessmentById,
  resolveAssessmentByToken,
  saveResponse,
  startAssessment,
} from './instances'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live regression guard for TASK-1360 Slice 3 (tokenized instances + responses). Sets up a real
// application, exercises the token flow, verifies the token hash never leaks. Cleans up (cascade).
describe.skipIf(!hasPgConfig)('assessment instances — live PG (TASK-1360)', () => {
  const created = { demandId: '', openingId: '', facetId: '', applicationId: '', assessmentId: '' }

  afterAll(async () => {
    // Deleting the application cascades to assessment + responses (ON DELETE CASCADE).
    if (created.applicationId)
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
        [created.applicationId],
      ).catch(() => undefined)
    if (created.facetId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`, [
        created.facetId,
      ]).catch(() => undefined)
    if (created.openingId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [
        created.openingId,
      ]).catch(() => undefined)
    if (created.demandId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [
        created.demandId,
      ]).catch(() => undefined)

    const ids = [created.demandId, created.openingId, created.facetId, created.applicationId, created.assessmentId].filter(
      Boolean,
    )

    if (ids.length)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`, [
        ids,
      ]).catch(() => undefined)
  })

  it('assigns a tokenized candidate test; the token resolves and the hash never leaks', async () => {
    const profile = await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE active = true LIMIT 1`,
    )

    const identityProfileId = profile[0]?.profile_id ?? ''

    expect(identityProfileId).not.toBe('')

    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'LIVE-TEST AM (assessment)',
      },
      'user-live-test',
    )

    created.demandId = demand.demandId

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'LIVE-TEST opening' },
      'user-live-test',
    )

    created.openingId = opening.openingId
    const facet = await reconcileCandidateFacet({ identityProfileId, source: 'manual' }, 'user-live-test')

    created.facetId = facet.candidateFacetId

    const app = await createHiringApplication(
      { openingId: opening.openingId, identityProfileId, candidateFacetId: facet.candidateFacetId },
      'user-live-test',
    )

    created.applicationId = app.applicationId

    const { assessment, token } = await assignCandidateTest(
      { applicationId: app.applicationId, templateId: 'atpl-account-manager-l2', timeLimitMinutes: 45 },
      'user-live-test',
    )

    created.assessmentId = assessment.assessmentId
    expect(assessment.publicId).toMatch(/^EO-ASM-/)
    expect(assessment.status).toBe('assigned')
    // The token hash must NEVER appear in the view model.
    expect(JSON.stringify(assessment)).not.toContain(token)
    expect(Object.keys(assessment)).not.toContain('accessTokenHash')

    // Correct token resolves; a wrong token does not.
    const resolved = await resolveAssessmentByToken(token)

    expect(resolved?.assessmentId).toBe(assessment.assessmentId)
    expect(await resolveAssessmentByToken('not-the-token')).toBeNull()
  })

  it('start moves to in_progress and a response can be saved; open-only guard holds', async () => {
    const started = await startAssessment(created.assessmentId)

    expect(started.status).toBe('in_progress')
    expect(started.startedAt).not.toBeNull()

    // A skill@intermedio open_text answer is queued for human rating (not auto-scored).
    const compId = (
      await runGreenhousePostgresQuery<{ competency_id: string }>(
        `SELECT competency_id FROM greenhouse_hiring.hiring_competency WHERE key = 'copywriting' LIMIT 1`,
      )
    )[0].competency_id

    const resp = await saveResponse({
      assessmentId: created.assessmentId,
      competencyId: compId,
      questionType: 'open_text',
      answer: { text: 'Mi propuesta de copy...' },
    })

    expect(resp.needsHumanRating).toBe(true)
    expect(resp.autoScore).toBeNull()

    const detail = await getAssessmentById(created.assessmentId)

    expect(detail?.status).toBe('in_progress')
  })
})
