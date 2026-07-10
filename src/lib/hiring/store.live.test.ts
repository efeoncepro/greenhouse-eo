import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  createHiringApplication,
  createHiringOpening,
  createTalentDemand,
  reconcileCandidateFacet,
  updateHiringApplicationStage,
  updateHiringOpening,
} from './store'
import { listPublicOpenings, publishOpening, unpublishOpening } from './publication'
import { isHiringError } from './errors'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live regression guard for TASK-353 store SQL semantics (ISSUE-071/893: COALESCE
// upsert + dedupe + CASE publish guard must be exercised against real PG, not mocks).
// Skipped in CI without PG; local-only. Cleans up its own rows + outbox events.
describe.skipIf(!hasPgConfig)('hiring store — live PG (TASK-353)', () => {
  const created = { demandId: '', openingId: '', facetId: '', applicationId: '' }
  let identityProfileId = ''

  afterAll(async () => {
    // Delete in FK order + the outbox events emitted by the chain.
    if (created.applicationId)
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
        [created.applicationId],
      ).catch(() => undefined)
    if (created.facetId)
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`,
        [created.facetId],
      ).catch(() => undefined)
    if (created.openingId)
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`,
        [created.openingId],
      ).catch(() => undefined)
    if (created.demandId)
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`,
        [created.demandId],
      ).catch(() => undefined)
    const ids = [created.demandId, created.openingId, created.facetId, created.applicationId].filter(Boolean)

    if (ids.length)
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
        [ids],
      ).catch(() => undefined)
  })

  it('resolves an existing identity_profile to anchor the candidate facet', async () => {
    const rows = await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE active = true LIMIT 1`,
    )

    identityProfileId = rows[0]?.profile_id ?? ''
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
      },
      'user-live-test',
    )

    created.demandId = demand.demandId
    expect(demand.publicId).toMatch(/^EO-TDM-/)
    expect(demand.status).toBe('draft')

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'LIVE-TEST internal codename', seniority: 'senior' },
      'user-live-test',
    )

    created.openingId = opening.openingId
    expect(opening.publicId).toMatch(/^EO-OPN-/)
    expect(opening.publicationStatus).toBe('draft')
  })

  it('reconcile candidate facet is an idempotent upsert that preserves data (COALESCE)', async () => {
    const facet = await reconcileCandidateFacet(
      { identityProfileId, source: 'manual', readiness: 'active', expectedRate: 1_500_000, expectedRateCurrency: 'CLP' },
      'user-live-test',
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
      'user-live-test',
    )

    created.applicationId = app.applicationId
    expect(app.publicId).toMatch(/^EO-APP-/)
    expect(app.stage).toBe('sourced')

    await expect(
      createHiringApplication(
        { openingId: created.openingId, identityProfileId, candidateFacetId: created.facetId },
        'user-live-test',
      ),
    ).rejects.toSatisfy((err: unknown) => isHiringError(err) && (err as { code: string }).code === 'hiring_application_duplicate')

    const staged = await updateHiringApplicationStage(created.applicationId, 'shortlisted', 'user-live-test')

    expect(staged.stage).toBe('shortlisted')
  })

  it('publish guard (422) requires public_title; publish/unpublish toggles the public listing', async () => {
    await expect(publishOpening(created.openingId, 'user-live-test')).rejects.toSatisfy(
      (err: unknown) => isHiringError(err) && (err as { code: string }).code === 'hiring_opening_missing_public_structured_fields',
    )

    // TASK-1371: el publish exige campos públicos estructurados completos (no basta el título).
    await updateHiringOpening(
      created.openingId,
      {
        publicTitle: 'Diseñador/a Senior (LIVE-TEST)',
        publicSummary: 'resumen público',
        publicDescription: 'Descripción pública de la vacante para el aviso de careers.',
        publicArea: 'Marketing',
        publicWorkMode: 'remote',
        publicHiringRegion: 'Chile',
        publicSkillTags: ['figma', 'design-systems'],
      },
      'user-live-test',
    )
    const published = await publishOpening(created.openingId, 'user-live-test')

    expect(published.publishedAt).not.toBeNull()

    const listed = await listPublicOpenings()

    expect(listed.some((o) => o.publicId === published.publicId)).toBe(true)

    await unpublishOpening(created.openingId, 'user-live-test', 'paused')
    const afterUnpublish = await listPublicOpenings()

    expect(afterUnpublish.some((o) => o.publicId === published.publicId)).toBe(false)
  })
})
