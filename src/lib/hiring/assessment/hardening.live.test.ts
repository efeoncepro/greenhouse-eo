import { randomUUID } from 'node:crypto'

import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { createHiringApplication, createHiringOpening, createTalentDemand, reconcileCandidateFacet } from '../store'
import { assignCandidateTest, assignInterviewerScorecard, listResponses, recordScorecardRating, resolveAssessmentByToken, saveResponse, startAssessment } from './instances'
import { createAiProposal } from './ai/proposal-store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1383 — Live guards del hardening contra PG real (gate TASK-893): idempotencia del
 * autosave (UNIQUE parciales), anti-anclaje real, expiración de token/time-limit, trigger de
 * inmutabilidad de templates, dedupe del ledger IA. Limpia sus propias filas.
 */
describe.skipIf(!hasPgConfig)('assessment hardening — live PG (TASK-1383)', () => {
  const profileId = `idp-hard1383-${randomUUID()}`

  const ids = {
    demandId: '', openingId: '', facetId: '', applicationId: '',
    testId: '', scorecardA: '', scorecardB: '', proposalId: '', competencyId: '',
  }

  afterAll(async () => {
    const aggregateIds = Object.values(ids).filter(Boolean)

    if (ids.proposalId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE proposal_id = $1`, [ids.proposalId]).catch(() => undefined)
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_hiring.hiring_assessment_response WHERE assessment_id = ANY($1::text[])`,
      [[ids.testId, ids.scorecardA, ids.scorecardB].filter(Boolean)],
    ).catch(() => undefined)
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = ANY($1::text[])`,
      [[ids.testId, ids.scorecardA, ids.scorecardB].filter(Boolean)],
    ).catch(() => undefined)
    if (ids.applicationId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`, [ids.applicationId]).catch(() => undefined)
    if (ids.facetId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`, [ids.facetId]).catch(() => undefined)
    if (ids.openingId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [ids.openingId]).catch(() => undefined)
    if (ids.demandId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [ids.demandId]).catch(() => undefined)
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [profileId]).catch(() => undefined)
    if (aggregateIds.length)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`, [aggregateIds]).catch(() => undefined)
  })

  it('seed: cadena sintética + candidate_test', async () => {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.identity_profiles (profile_id, profile_type, full_name, status, active, canonical_email)
       VALUES ($1, 'person', 'HARD-1383 (sintético)', 'active', true, $2)`,
      [profileId, `hard1383+${randomUUID().slice(0, 8)}@example.invalid`],
    )

    const demand = await createTalentDemand(
      { stakeholderType: 'internal', engagementType: 'on_going', fulfillmentMode: 'internal_hire', demandOrigin: 'capacity_gap', requestedRole: 'HARD-1383' },
      'user-live-test',
    )

    ids.demandId = demand.demandId

    const opening = await createHiringOpening({ demandId: demand.demandId, internalTitle: 'HARD-1383 opening' }, 'user-live-test')

    ids.openingId = opening.openingId

    const facet = await reconcileCandidateFacet({ identityProfileId: profileId, source: 'manual' }, 'user-live-test')

    ids.facetId = facet.candidateFacetId

    const app = await createHiringApplication(
      { openingId: opening.openingId, identityProfileId: profileId, candidateFacetId: facet.candidateFacetId, source: 'manual' },
      'user-live-test',
    )

    ids.applicationId = app.applicationId

    const tpl = await runGreenhousePostgresQuery<{ template_id: string }>(
      `SELECT template_id FROM greenhouse_hiring.hiring_assessment_template WHERE status = 'active' LIMIT 1`,
    )

    const { assessment, token } = await assignCandidateTest(
      { applicationId: app.applicationId, templateId: tpl[0].template_id, timeLimitMinutes: 60 },
      'user-live-test',
    )

    ids.testId = assessment.assessmentId

    // Token con vencimiento poblado + resoluble.
    const row = await runGreenhousePostgresQuery<{ token_expires_at: string | null }>(
      `SELECT token_expires_at FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
      [assessment.assessmentId],
    )

    expect(row[0].token_expires_at).not.toBeNull()
    expect(await resolveAssessmentByToken(token)).not.toBeNull()
  })

  it('autosave idempotente: 3 saves de la misma pregunta = 1 fila (y auto-start del timer)', async () => {
    const comp = await runGreenhousePostgresQuery<{ competency_id: string }>(
      `SELECT competency_id FROM greenhouse_hiring.hiring_competency LIMIT 1`,
    )

    ids.competencyId = comp[0].competency_id

    for (const answer of [{ v: 1 }, { v: 2 }, { v: 3 }]) {
      await saveResponse({
        assessmentId: ids.testId,
        competencyId: ids.competencyId,
        questionId: null,
        questionType: 'open_text',
        answer,
      })
    }

    const count = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hiring.hiring_assessment_response WHERE assessment_id = $1`,
      [ids.testId],
    )

    expect(count[0].n).toBe(1)

    const last = await runGreenhousePostgresQuery<{ answer_json: { v: number } }>(
      `SELECT answer_json FROM greenhouse_hiring.hiring_assessment_response WHERE assessment_id = $1`,
      [ids.testId],
    )

    expect(last[0].answer_json.v).toBe(3)

    // El primer save arrancó el timer.
    const status = await runGreenhousePostgresQuery<{ status: string; started_at: string | null }>(
      `SELECT status, started_at FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
      [ids.testId],
    )

    expect(status[0].status).toBe('in_progress')
    expect(status[0].started_at).not.toBeNull()
  })

  it('expiración: time-limit vencido → expired y el write se rechaza', async () => {
    // Simular que empezó hace 2 horas (limit 60 min).
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_hiring.hiring_assessment SET started_at = NOW() - INTERVAL '2 hours' WHERE assessment_id = $1`,
      [ids.testId],
    )

    await expect(
      saveResponse({ assessmentId: ids.testId, competencyId: ids.competencyId, questionId: null, questionType: 'open_text', answer: { late: true } }),
    ).rejects.toMatchObject({ code: 'assessment_not_open' })

    const status = await runGreenhousePostgresQuery<{ status: string }>(
      `SELECT status FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
      [ids.testId],
    )

    expect(status[0].status).toBe('expired')
    expect(await startAssessment(ids.testId).catch((e) => e.code)).toBe('assessment_not_startable')
  })

  it('anti-anclaje: evaluador con scorecard abierto NO ve ratings ajenos; al cerrar, sí', async () => {
    const a = await assignInterviewerScorecard(ids.applicationId, 'evaluator-A', 'user-live-test')
    const b = await assignInterviewerScorecard(ids.applicationId, 'evaluator-B', 'user-live-test')

    ids.scorecardA = a.assessmentId
    ids.scorecardB = b.assessmentId

    await recordScorecardRating(a.assessmentId, ids.competencyId, 80, 'evaluator-A')

    // B (scorecard abierto) mira la instancia de A → nada.
    expect(await listResponses(a.assessmentId, 'evaluator-B')).toHaveLength(0)

    // A mira su propia instancia → la ve.
    expect(await listResponses(a.assessmentId, 'evaluator-A')).toHaveLength(1)

    // B cierra la suya → ahora sí ve la de A.
    await recordScorecardRating(b.assessmentId, ids.competencyId, 70, 'evaluator-B')
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_hiring.hiring_assessment SET status = 'submitted', submitted_at = NOW() WHERE assessment_id = $1`,
      [b.assessmentId],
    )
    expect(await listResponses(a.assessmentId, 'evaluator-B')).toHaveLength(1)

    // Rating repetido del mismo evaluador+competencia = upsert (1 fila).
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_hiring.hiring_assessment SET status = 'in_progress' WHERE assessment_id = $1`,
      [b.assessmentId],
    )
    await recordScorecardRating(b.assessmentId, ids.competencyId, 75, 'evaluator-B')

    const count = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hiring.hiring_assessment_response WHERE assessment_id = $1`,
      [b.assessmentId],
    )

    expect(count[0].n).toBe(1)
  })

  it('inmutabilidad de templates: con instancias, contenido y módulos quedan congelados', async () => {
    const tpl = await runGreenhousePostgresQuery<{ template_id: string }>(
      `SELECT template_id FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
      [ids.testId],
    )

    const templateId = tpl[0].template_id

    await expect(
      runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_assessment_template SET name = name || ' (editado)' WHERE template_id = $1`,
        [templateId],
      ),
    ).rejects.toThrow(/inmutable/)

    await expect(
      runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_hiring.hiring_assessment_template_module WHERE template_id = $1`,
        [templateId],
      ),
    ).rejects.toThrow(/inmutable/)

    // El status SÍ es mutable (retirar): no lo persistimos, solo verificamos que no truena.
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_hiring.hiring_assessment_template SET status = status WHERE template_id = $1`,
      [templateId],
    )
  })

  it('dedupe del ledger IA: propose repetido con mismo digest retorna la proposal pendiente', async () => {
    const digest = `digest-hard1383-${randomUUID().slice(0, 8)}`

    const first = await createAiProposal(
      { kind: 'question_draft', targetRef: 'cmp-test', proposed: { q: 1 }, provider: 'test', model: 'test', promptVersion: 'v1', inputDigest: digest },
      'user-live-test',
    )

    ids.proposalId = first.proposalId

    const second = await createAiProposal(
      { kind: 'question_draft', targetRef: 'cmp-test', proposed: { q: 2 }, provider: 'test', model: 'test', promptVersion: 'v1', inputDigest: digest },
      'user-live-test',
    )

    expect(second.proposalId).toBe(first.proposalId)

    const count = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE input_digest = $1`,
      [digest],
    )

    expect(count[0].n).toBe(1)
  })
})
