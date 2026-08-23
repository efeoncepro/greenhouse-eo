import { afterAll, describe, expect, it } from 'vitest'

import { resolveLiveTestIdentityProfileId } from '@/lib/hiring/live-test-identity'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { editorialOpeningFixture } from '@/lib/hiring/public-careers/editorial-opening.fixture'

import {
  createHiringApplication,
  createHiringOpening,
  createTalentDemand,
  reconcileCandidateFacet,
  updateHiringApplicationStage,
  updateHiringOpening
} from './store'
import { listPublicOpenings, publishOpening, unpublishOpening } from './publication'
import { isHiringError } from './errors'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live regression guard for TASK-353 store SQL semantics (ISSUE-071/893: COALESCE
// upsert + dedupe + CASE publish guard must be exercised against real PG, not mocks).
// Skipped in CI without PG; local-only. Cleans up its own rows + outbox events.
describe.skipIf(!hasPgConfig)('hiring store — live PG (TASK-353)', () => {
  const created = { demandId: '', openingId: '', facetId: '', applicationId: '' }
  let identityProfileId = ''

  afterAll(async () => {
    // Delete in FK order + the outbox events emitted by the chain.
    if (created.applicationId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`, [
        created.applicationId
      ]).catch(() => undefined)
    if (created.facetId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`, [
        created.facetId
      ]).catch(() => undefined)
    if (created.openingId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [
        created.openingId
      ]).catch(() => undefined)
    if (created.demandId)
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [
        created.demandId
      ]).catch(() => undefined)
    const ids = [created.demandId, created.openingId, created.facetId, created.applicationId].filter(Boolean)

    if (ids.length)
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
        [ids]
      ).catch(() => undefined)
  })

  it('resolves an existing identity_profile to anchor the candidate facet', async () => {
    const syntheticProfileId = await resolveLiveTestIdentityProfileId()

    identityProfileId = syntheticProfileId
    expect(identityProfileId).not.toBe('')
  })

  it('creates a talent demand + derived opening', async () => {
    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'LIVE-TEST Account Manager',
        requestedSkills: ['seo', 'copywriting'],
        dataOrigin: 'real', // TASK-1739 — publica: publishOpening rechaza vacantes no reales
      },
      'user-live-test'
    )

    created.demandId = demand.demandId
    expect(demand.publicId).toMatch(/^EO-TDM-/)
    expect(demand.status).toBe('draft')

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'LIVE-TEST internal codename', seniority: 'senior' , dataOrigin: 'real'},
      'user-live-test'
    )

    created.openingId = opening.openingId
    expect(opening.publicId).toMatch(/^EO-OPN-/)
    expect(opening.publicationStatus).toBe('draft')
  })

  it('reconcile candidate facet is an idempotent upsert that preserves data (COALESCE)', async () => {
    const facet = await reconcileCandidateFacet(
      {
        identityProfileId,
        source: 'manual',
        readiness: 'active',
        expectedRate: 1_500_000,
        expectedRateCurrency: 'CLP'
      },
      'user-live-test'
    )

    created.facetId = facet.candidateFacetId
    expect(facet.publicId).toMatch(/^EO-CND-/)
    expect(facet.expectedRate).toBe(1_500_000)

    // Second reconcile with a partial payload → same facet id, COALESCE preserves the rate.
    const again = await reconcileCandidateFacet({ identityProfileId, readiness: 'ready' }, 'user-live-test')

    expect(again.candidateFacetId).toBe(facet.candidateFacetId)
    expect(again.readiness).toBe('ready')
    expect(again.expectedRate).toBe(1_500_000)
  })

  it('creates an application and rejects a duplicate (structural dedupe → 409)', async () => {
    const app = await createHiringApplication(
      { openingId: created.openingId, identityProfileId, candidateFacetId: created.facetId, source: 'manual' },
      'user-live-test'
    )

    created.applicationId = app.applicationId
    expect(app.publicId).toMatch(/^EO-APP-/)
    expect(app.stage).toBe('sourced')

    await expect(
      createHiringApplication(
        { openingId: created.openingId, identityProfileId, candidateFacetId: created.facetId },
        'user-live-test'
      )
    ).rejects.toSatisfy(
      (err: unknown) => isHiringError(err) && (err as { code: string }).code === 'hiring_application_duplicate'
    )

    const staged = await updateHiringApplicationStage(created.applicationId, 'shortlisted', 'user-live-test')

    expect(staged.stage).toBe('shortlisted')
  })

  // TASK-1765 — cerrar deja de ser un cambio de etapa. Contra PG real, no contra mocks: lo que se
  // verifica es que la postulación NO quedó cerrada, y eso sólo lo prueba releer la fila.
  it('el cambio de etapa NO puede cerrar: 422 canónico y la fila queda intacta', async () => {
    await expect(
      updateHiringApplicationStage(created.applicationId, 'closed' as never, 'user-live-test')
    ).rejects.toSatisfy(
      (err: unknown) =>
        isHiringError(err) && (err as { code: string }).code === 'hiring_application_close_requires_outcome'
    )

    const [row] = await runGreenhousePostgresQuery<{ stage: string; decision: string | null }>(
      `SELECT stage, decision FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
      [created.applicationId]
    )

    expect(row?.stage).toBe('shortlisted')
    expect(row?.decision).toBeNull()
  })

  // TASK-1765 — la bicondicional de la causa vive en la BASE, no sólo en el command. Si alguien
  // encuentra otra vía de escritura, PostgreSQL sigue rechazando el par imposible.
  //
  // Los UPDATE fijan `stage = 'closed'` A PROPÓSITO: desde la migración del invariante conviven DOS
  // bicondicionales sobre la misma fila —`(stage='closed') = (decision IS NOT NULL)` y la de la
  // causa— y la del cierre se evalúa primero. Sin declarar la etapa, los tres casos morían con
  // `hiring_application_closed_outcome_check` y este test dejaba de ejercitar lo que dice ejercitar:
  // seguía VERDE la protección, pero en rojo el gate, y por el eje equivocado.
  it('la base rechaza `not_selected` sin causa y una causa sin `not_selected`', async () => {
    await expect(
      runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_application SET stage = 'closed', decision = 'not_selected', decision_cause = NULL
         WHERE application_id = $1`,
        [created.applicationId]
      )
    ).rejects.toThrow(/hiring_application_decision_cause_pairing_check/)

    await expect(
      runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_application SET stage = 'closed', decision = 'rejected', decision_cause = 'capacity_filled'
         WHERE application_id = $1`,
        [created.applicationId]
      )
    ).rejects.toThrow(/hiring_application_decision_cause_pairing_check/)

    await expect(
      runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_application SET stage = 'closed', decision = 'not_selected', decision_cause = 'porque_si'
         WHERE application_id = $1`,
        [created.applicationId]
      )
    ).rejects.toThrow(/hiring_application_decision_cause_check/)

    const [row] = await runGreenhousePostgresQuery<{ decision: string | null; decision_cause: string | null }>(
      `SELECT decision, decision_cause FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
      [created.applicationId]
    )

    expect(row?.decision).toBeNull()
    expect(row?.decision_cause).toBeNull()
  })

  // TASK-1765 — `archived_at` es ORTOGONAL: archivar no declara el desenlace de nadie ni mueve la
  // etapa. Es la garantía que TASK-1748 necesita para dejar de archivar escribiendo `closed`.
  it('`archived_at` se escribe sin tocar `stage` ni `decision`', async () => {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_hiring.hiring_application SET archived_at = NOW() WHERE application_id = $1`,
      [created.applicationId]
    )

    const [row] = await runGreenhousePostgresQuery<{
      stage: string
      decision: string | null
      archived_at: string | null
    }>(
      `SELECT stage, decision, archived_at FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
      [created.applicationId]
    )

    expect(row?.archived_at).not.toBeNull()
    expect(row?.stage).toBe('shortlisted')
    expect(row?.decision).toBeNull()

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_hiring.hiring_application SET archived_at = NULL WHERE application_id = $1`,
      [created.applicationId]
    )
  })

  it('publish guard (422) requires public_title; publish/unpublish toggles the public listing', async () => {
    await expect(publishOpening(created.openingId, 'user-live-test')).rejects.toSatisfy(
      (err: unknown) =>
        isHiringError(err) && (err as { code: string }).code === 'hiring_opening_missing_public_structured_fields'
    )

    // TASK-1371: el publish exige campos públicos estructurados completos (no basta el título).
    await updateHiringOpening(
      created.openingId,
      {
        publicTitle: 'Diseñador/a Senior (LIVE-TEST)',
        publicSummary: 'resumen público',
        publicDescription: 'Descripción pública de la vacante para el aviso de careers.',
        publicArea: 'Marketing',
        publicSeniority: 'Senior',
        publicWorkMode: 'remote',
        publicHiringRegion: 'Chile',
        publicSkillTags: ['figma', 'design-systems'],
        publicContent: editorialOpeningFixture.content,
        publicRemoteEligibleCountries: ['CL']
      },
      'user-live-test'
    )
    const published = await publishOpening(created.openingId, 'user-live-test')

    expect(published.publishedAt).not.toBeNull()

    const listed = await listPublicOpenings()

    expect(listed.some(o => o.publicId === published.publicId)).toBe(true)

    await expect(updateHiringOpening(created.openingId, { publicTitle: null }, 'user-live-test')).rejects.toSatisfy(
      (err: unknown) =>
        isHiringError(err) && (err as { code: string }).code === 'hiring_opening_missing_public_structured_fields'
    )

    const stillListed = await listPublicOpenings()

    expect(stillListed.some(o => o.publicId === published.publicId)).toBe(true)

    await unpublishOpening(created.openingId, 'user-live-test', 'paused')
    const afterUnpublish = await listPublicOpenings()

    expect(afterUnpublish.some(o => o.publicId === published.publicId)).toBe(false)
  })
})
