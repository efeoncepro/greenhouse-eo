import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { createHiringOpening, createTalentDemand, updateHiringOpening } from '@/lib/hiring/store'
import { publishOpening } from '@/lib/hiring/publication'

import { parsePublicHiringApplication } from './schema'
import { submitPublicHiringApplication } from './submit-application'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// TASK-1367 Slice 2 — live: chain completo del apply público (Person→facet→application) contra PG,
// incluye dedupe genérico + not_open + persistencia de links/consent/source. Skip sin PG.
describe.skipIf(!hasPgConfig)('submitPublicHiringApplication — live PG (TASK-1367)', () => {
  const email = `t1367_${Date.now()}@example.com`
  const state: { demandId?: string; openingId?: string; openingPublicId?: string; profileId?: string; facetId?: string; appIds: string[] } = { appIds: [] }

  afterAll(async () => {
    if (!hasPgConfig) return

    for (const id of state.appIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`, [id]).catch(() => undefined)
    }

    if (state.facetId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`, [state.facetId]).catch(() => undefined)
    if (state.profileId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [state.profileId]).catch(() => undefined)
    if (state.openingId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [state.openingId]).catch(() => undefined)
    if (state.demandId) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [state.demandId]).catch(() => undefined)
    const ids = [state.demandId, state.openingId, state.facetId, ...state.appIds].filter(Boolean)

    if (ids.length) await runGreenhousePostgresQuery(`DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`, [ids]).catch(() => undefined)
  })

  it('setup: demand → opening → publish', async () => {
    const demand = await createTalentDemand(
      { stakeholderType: 'internal', engagementType: 'on_going', fulfillmentMode: 'internal_hire', demandOrigin: 'capacity_gap', requestedRole: 'T1367 LIVE Account Manager' },
      'user-live-test',
    )

    state.demandId = demand.demandId
    const opening = await createHiringOpening({ demandId: demand.demandId, internalTitle: 'T1367 LIVE internal' }, 'user-live-test')

    state.openingId = opening.openingId
    await updateHiringOpening(opening.openingId, { publicTitle: 'Account Manager (T1367 LIVE)', publicSummary: 'resumen' }, 'user-live-test')
    const published = await publishOpening(opening.openingId, 'user-live-test')

    state.openingPublicId = published.publicId
    expect(published.publishedAt).not.toBeNull()
  })

  it('opening no publicado / inexistente → not_open (genérico)', async () => {
    const parsed = parsePublicHiringApplication({ openingPublicId: 'EO-OPN-inexistente', firstName: 'X', lastName: 'Y', email, consent: true })
    const result = await submitPublicHiringApplication(parsed!)

    expect(result.outcome).toBe('not_open')
  })

  it('apply válido → accepted; persiste Person + facet (source/consent/links) + application', async () => {
    const parsed = parsePublicHiringApplication({
      openingPublicId: state.openingPublicId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email,
      portfolioUrl: 'https://ada.dev',
      linkedinUrl: 'https://linkedin.com/in/ada',
      consent: true,
      consentPolicyVersion: 'v1',
    })

    const result = await submitPublicHiringApplication(parsed!)

    expect(result.outcome).toBe('accepted')
    expect(result.applicationPublicId).toMatch(/^EO-APP-/)

    // Person creada por email.
    const prof = await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE LOWER(canonical_email) = $1 LIMIT 1`,
      [email],
    )

    state.profileId = prof[0]?.profile_id
    expect(state.profileId).toBeTruthy()

    // Facet con source/consent/links.
    const facet = await runGreenhousePostgresQuery<{ candidate_facet_id: string; source: string; consent_status: string; portfolio_url: string; linkedin_url: string }>(
      `SELECT candidate_facet_id, source, consent_status, portfolio_url, linkedin_url FROM greenhouse_hiring.candidate_facet WHERE identity_profile_id = $1`,
      [state.profileId],
    )

    state.facetId = facet[0]?.candidate_facet_id
    expect(facet[0]?.source).toBe('public_careers')
    expect(facet[0]?.consent_status).toBe('granted')
    expect(facet[0]?.portfolio_url).toBe('https://ada.dev')
    expect(facet[0]?.linkedin_url).toBe('https://linkedin.com/in/ada')

    const app = await runGreenhousePostgresQuery<{ application_id: string; source: string }>(
      `SELECT application_id, source FROM greenhouse_hiring.hiring_application WHERE identity_profile_id = $1`,
      [state.profileId],
    )

    app.forEach((a) => state.appIds.push(a.application_id))
    expect(app[0]?.source).toBe('public_careers')
  })

  it('re-apply mismo email+opening → accepted genérico, sin duplicar la application', async () => {
    const parsed = parsePublicHiringApplication({ openingPublicId: state.openingPublicId, firstName: 'Ada', lastName: 'Lovelace', email, consent: true })
    const result = await submitPublicHiringApplication(parsed!)

    expect(result.outcome).toBe('accepted') // genérico — nunca revela "ya postulaste"

    const count = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_hiring.hiring_application WHERE identity_profile_id = $1 AND opening_id = $2`,
      [state.profileId, state.openingId],
    )

    expect(count[0]?.n).toBe('1') // dedupe estructural: sigue habiendo 1
  })
})
