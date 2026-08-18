import { Client } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { grantAssessmentAccommodation } from './accommodations'
import { getAssessmentById } from './instances'
import { resolveAssessmentTiming } from './public-taking'
import { assignAssessmentFromPolicy } from './assignment-policy/assign'
import {
  createHiringApplication,
  createHiringOpening,
  createTalentDemand,
  reconcileCandidateFacet,
} from '../store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const OPS_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
const OPS_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
const canCleanUp = Boolean(OPS_USER && OPS_PASSWORD && process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1719 — guardia live contra PG real del WRITE PATH de ajustes razonables.
 *
 * Verifica lo que los mocks no pueden: que el UPDATE de `accommodations_json` PASA de verdad
 * contra los GRANTs column-scoped del perfil de runtime (`greenhouse_app`), y que el tiempo
 * efectivo que ve el candidato sube — tanto en el lector TS (`resolveAssessmentTiming`) como
 * en el predicado SQL de vencimiento, que son dos implementaciones del mismo hecho y tienen
 * que coincidir o el candidato ve un contador y el sistema aplica otro.
 *
 * ⚠️ SÓLO identidades SINTÉTICAS. Este archivo ejercita `assignAssessmentFromPolicy`, que
 * publica `hiring.assessment.assigned`, y el publisher del outbox está VIVO en esta base: la
 * projection le manda al candidato el LINK de su prueba. Un fixture que tomara "el primer
 * perfil activo" le escribiría a una persona real.
 */

const created = {
  demandId: '',
  openingId: '',
  policyId: '',
  facetId: '',
  applicationId: '',
}

const assessmentIds: string[] = []

/** Teardown con el perfil `ops`: el runtime no puede borrar el ledger (grants por diseño). */
const runAsOps = async (statements: { text: string; values: unknown[] }[]): Promise<void> => {
  const client = new Client({
    host: process.env.GREENHOUSE_POSTGRES_HOST,
    port: Number(process.env.GREENHOUSE_POSTGRES_PORT ?? 5432),
    database: process.env.GREENHOUSE_POSTGRES_DATABASE,
    user: OPS_USER,
    password: OPS_PASSWORD,
    ssl: process.env.GREENHOUSE_POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })

  await client.connect()

  try {
    for (const statement of statements) {
      await client.query(statement.text, statement.values).catch(() => undefined)
    }
  } finally {
    await client.end()
  }
}

describe.skipIf(!hasPgConfig || !canCleanUp)('assessment accommodations — live PG (TASK-1719)', () => {
  afterAll(async () => {
    await runAsOps([
      {
        text: `DELETE FROM greenhouse_hiring.hiring_assessment_assignment WHERE application_id = $1`,
        values: [created.applicationId],
      },
      {
        text: `DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
        values: [created.applicationId],
      },
      {
        text: `DELETE FROM greenhouse_hiring.hiring_opening_assessment_policy WHERE policy_id = $1`,
        values: [created.policyId],
      },
      {
        text: `DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`,
        values: [created.facetId],
      },
      { text: `DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, values: [created.openingId] },
      { text: `DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, values: [created.demandId] },
      {
        text: `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
        values: [
          [created.demandId, created.openingId, created.facetId, created.applicationId, ...assessmentIds].filter(Boolean),
        ],
      },
    ])
  })

  it('el capability seed quedó aplicado en capabilities_registry', async () => {
    const rows = await runGreenhousePostgresQuery<{
      module: string
      allowed_actions: string[]
      allowed_scopes: string[]
      deprecated_at: string | null
    }>(
      `SELECT module, allowed_actions, allowed_scopes, deprecated_at
         FROM greenhouse_core.capabilities_registry
        WHERE capability_key = 'hiring.assessment.grant_accommodation'`,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].module).toBe('hiring')
    expect(rows[0].allowed_actions).toEqual(['execute'])
    expect(rows[0].allowed_scopes).toEqual(['tenant'])
    expect(rows[0].deprecated_at).toBeNull()
  })

  it('el perfil de RUNTIME puede escribir accommodations_json (GRANT column-scoped)', async () => {
    // Sin este grant el command reventaría con 42501 EN PRODUCCIÓN, dentro de la tx.
    const grants = await runGreenhousePostgresQuery<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges
        WHERE table_schema = 'greenhouse_hiring'
          AND table_name = 'hiring_assessment'
          AND grantee = 'greenhouse_runtime'
          AND privilege_type = 'UPDATE'`,
    )

    expect(grants.map(row => row.column_name)).toEqual(
      expect.arrayContaining(['accommodations_json', 'updated_at']),
    )
  })

  it('otorgar → releer: el tiempo efectivo que ve el candidato SUBE, y el SQL coincide', async () => {
    const profiles = await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT profile_id FROM greenhouse_core.identity_profiles
        WHERE active = true
          AND canonical_email IS NOT NULL AND canonical_email <> ''
          AND (canonical_email LIKE 't872p-%@efeoncepro.com' OR canonical_email LIKE 'task-%@efeonce.org')
        ORDER BY profile_id DESC LIMIT 1`,
    )

    expect(
      profiles.length,
      'No hay identidad sintética disponible. NUNCA relajes este filtro: mandaría el link de una prueba a un candidato real.',
    ).toBe(1)

    const identityProfileId = profiles[0].profile_id

    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'LIVE-TEST AM (accommodations)',
      },
      'user-live-test',
    )

    created.demandId = demand.demandId

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'LIVE-TEST opening (accommodations)' },
      'user-live-test',
    )

    created.openingId = opening.openingId

    const facet = await reconcileCandidateFacet({ identityProfileId, source: 'manual' }, 'user-live-test')

    created.facetId = facet.candidateFacetId

    const app = await createHiringApplication(
      {
        openingId: opening.openingId,
        identityProfileId,
        candidateFacetId: facet.candidateFacetId,
        stage: 'shortlisted',
      },
      'user-live-test',
    )

    created.applicationId = app.applicationId

    const policyRows = await runGreenhousePostgresQuery<{ policy_id: string }>(
      `INSERT INTO greenhouse_hiring.hiring_opening_assessment_policy
         (opening_id, template_id, mode, state, trigger_stage, time_limit_minutes,
          template_content_digest, enabled_at, volume_cap_per_window, volume_window_minutes, created_by)
       VALUES ($1, 'atpl-account-manager-l2', 'on_stage_entry', 'enabled', 'shortlisted', 45,
               'live-test-digest', NOW(), 5, 60, 'user-live-test')
       RETURNING policy_id`,
      [opening.openingId],
    )

    created.policyId = policyRows[0].policy_id

    const assigned = await assignAssessmentFromPolicy({
      applicationId: app.applicationId,
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(assigned.status).toBe('assigned')

    const assessmentId = 'assessmentId' in assigned ? String(assigned.assessmentId) : ''

    assessmentIds.push(assessmentId)

    // ── Antes: sin ajuste, el candidato ve el límite base ──
    const before = await getAssessmentById(assessmentId)

    expect(before).not.toBeNull()

    const timingBefore = resolveAssessmentTiming(before!)

    expect(timingBefore.baseMinutes).toBe(45)
    expect(timingBefore.extraMinutes).toBe(0)
    expect(timingBefore.effectiveMinutes).toBe(45)
    expect(timingBefore.hasAccommodation).toBe(false)

    // ── Otorgar ──
    const granted = await grantAssessmentAccommodation({
      assessmentId,
      extraMinutes: 30,
      actorUserId: 'user-live-test',
    })

    expect(granted.outcome).toBe('granted')

    // ── Después: RELECTURA desde PG (no del retorno del command) ──
    const after = await getAssessmentById(assessmentId)

    expect(after).not.toBeNull()
    expect(after!.accommodations).toEqual({
      extraMinutes: 30,
      grantedBy: 'user-live-test',
      grantedAt: granted.accommodations.grantedAt,
    })

    const timingAfter = resolveAssessmentTiming(after!)

    expect(timingAfter.effectiveMinutes).toBe(75)
    expect(timingAfter.extraMinutes).toBe(30)
    expect(timingAfter.hasAccommodation).toBe(true)

    // ── Y el SQL tiene que decir LO MISMO que el lector TS ──
    // Si divergieran, el candidato vería 75 min en pantalla y el expirador lo cortaría a los 45.
    const sqlRows = await runGreenhousePostgresQuery<{ effective_minutes: number }>(
      `SELECT (time_limit_minutes + GREATEST(0, COALESCE(
                CASE WHEN (accommodations_json->>'extraMinutes') ~ '^[0-9]+(\\.[0-9]+)?$'
                  THEN FLOOR((accommodations_json->>'extraMinutes')::numeric)::int END, 0)))::int AS effective_minutes
         FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
      [assessmentId],
    )

    expect(sqlRows[0].effective_minutes).toBe(timingAfter.effectiveMinutes)
  })

  it('re-otorgar REEMPLAZA contra PG real; el mismo monto es no-op', async () => {
    const assessmentId = assessmentIds[0]

    const replaced = await grantAssessmentAccommodation({
      assessmentId,
      extraMinutes: 60,
      actorUserId: 'user-live-test-2',
    })

    expect(replaced.outcome).toBe('replaced')
    expect(replaced.previousExtraMinutes).toBe(30)

    const after = await getAssessmentById(assessmentId)

    expect(after!.accommodations.extraMinutes).toBe(60)
    expect(after!.accommodations.grantedBy).toBe('user-live-test-2')
    expect(resolveAssessmentTiming(after!).effectiveMinutes).toBe(105)

    const unchanged = await grantAssessmentAccommodation({
      assessmentId,
      extraMinutes: 60,
      actorUserId: 'user-live-test-3',
    })

    expect(unchanged.outcome).toBe('unchanged')

    // El no-op no reescribió al otorgante: el trail refleja la decisión real.
    const stillSame = await getAssessmentById(assessmentId)

    expect(stillSame!.accommodations.grantedBy).toBe('user-live-test-2')
  })

  it('el evento quedó en el outbox con payload IDs-only y sin motivo', async () => {
    const rows = await runGreenhousePostgresQuery<{ payload_json: Record<string, unknown> }>(
      `SELECT payload_json FROM greenhouse_sync.outbox_events
        WHERE aggregate_id = $1 AND event_type = 'hiring.assessment.accommodation_granted'
        ORDER BY occurred_at`,
      [assessmentIds[0]],
    )

    // Dos otorgamientos reales (granted + replaced); el no-op NO publicó.
    expect(rows).toHaveLength(2)

    const payload = typeof rows[0].payload_json === 'string' ? JSON.parse(rows[0].payload_json) : rows[0].payload_json

    expect(Object.keys(payload).sort()).toEqual([
      'actorUserId',
      'applicationId',
      'assessmentId',
      'extraMinutes',
      'method',
      'previousExtraMinutes',
      'status',
      'templateId',
    ])
    expect(JSON.stringify(payload)).not.toMatch(/@|reason|motivo|token/i)
  })
})
