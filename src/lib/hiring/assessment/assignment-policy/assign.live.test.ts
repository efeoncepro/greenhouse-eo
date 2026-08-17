import { Client } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  createHiringApplication,
  createHiringOpening,
  createTalentDemand,
  reconcileCandidateFacet,
} from '../../store'

import { assignAssessmentFromPolicy } from './assign'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1719 — gate de SQL vivo (ISSUE-071 / TASK-893). Los tests unitarios de `assign.test.ts`
 * mockean `client.query` con regex sobre el texto del SQL: ejercitan la lógica TS, **jamás el
 * SQL real ni las constraints**. Este archivo cierra ese hueco.
 *
 * Es exactamente el test que la auditoría adversarial exigía: con el código previo al
 * forward-fix, el happy path revienta con `23514`
 * (`hiring_assessment_assignment_assigned_instance_ck`) porque el ledger escribía
 * `outcome='assigned'` con `assessment_id=NULL` antes de crear la instancia. Ningún test
 * mockeado podía verlo.
 *
 * Ciclo cubierto contra PG real: `assigned` → replay `already_assigned` → `blocked: volume_cap`
 * + el CHECK de autoridad de `attempt_seq` en la DB.
 *
 * Se corre con las credenciales del runtime (`greenhouse_app`), que es el perfil de producción
 * y NO tiene DELETE sobre el ledger ni sobre la policy (por diseño: "DELETE nunca"). La
 * limpieza abre una conexión aparte con el perfil `ops`, que es lo que haría un operador.
 */

const OPS_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
const OPS_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
const canCleanUp = Boolean(OPS_USER && OPS_PASSWORD && process.env.GREENHOUSE_POSTGRES_HOST)

const created = {
  demandId: '',
  openingId: '',
  policyId: '',
  facetIds: [] as string[],
  applicationIds: [] as string[],
}

/** Teardown con el perfil `ops`: el runtime no puede borrar ledger ni policy (grants). */
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

describe.skipIf(!hasPgConfig || !canCleanUp)('assessment assignment — live PG (TASK-1719)', () => {
  afterAll(async () => {
    // Orden obligatorio: todas las FK del ledger son ON DELETE RESTRICT.
    const assessmentIds = created.applicationIds.length
      ? await runGreenhousePostgresQuery<{ assessment_id: string }>(
          `SELECT assessment_id FROM greenhouse_hiring.hiring_assessment WHERE application_id = ANY($1::text[])`,
          [created.applicationIds],
        ).catch(() => [])
      : []

    await runAsOps([
      {
        text: `DELETE FROM greenhouse_hiring.hiring_assessment_assignment WHERE policy_id = $1`,
        values: [created.policyId],
      },
      {
        text: `DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = ANY($1::text[])`,
        values: [created.applicationIds],
      },
      {
        text: `DELETE FROM greenhouse_hiring.hiring_opening_assessment_policy WHERE policy_id = $1`,
        values: [created.policyId],
      },
      {
        text: `DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = ANY($1::text[])`,
        values: [created.facetIds],
      },
      { text: `DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, values: [created.openingId] },
      { text: `DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, values: [created.demandId] },
      {
        text: `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
        values: [
          [
            ...created.applicationIds,
            ...assessmentIds.map(row => row.assessment_id),
            created.openingId,
            created.demandId,
          ].filter(Boolean),
        ],
      },
    ])
  })

  it('asigna de verdad contra PG: crea la instancia y cierra el ledger sin violar ningún CHECK', async () => {
    const profiles = await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT profile_id FROM greenhouse_core.identity_profiles
       WHERE active = true AND canonical_email IS NOT NULL AND canonical_email <> ''
       ORDER BY profile_id LIMIT 2`,
    )

    expect(profiles.length).toBe(2)

    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'LIVE-TEST AM (assignment policy)',
      },
      'user-live-test',
    )

    created.demandId = demand.demandId

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'LIVE-TEST opening (assignment policy)' },
      'user-live-test',
    )

    created.openingId = opening.openingId

    for (const profile of profiles) {
      const facet = await reconcileCandidateFacet({ identityProfileId: profile.profile_id, source: 'manual' }, 'user-live-test')

      created.facetIds.push(facet.candidateFacetId)

      const application = await createHiringApplication(
        {
          openingId: opening.openingId,
          identityProfileId: profile.profile_id,
          candidateFacetId: facet.candidateFacetId,
          stage: 'shortlisted',
        },
        'user-live-test',
      )

      created.applicationIds.push(application.applicationId)
    }

    // La policy se inserta directo: lo que este test ejercita es el command de ASSIGNMENT, no
    // el command de policy (que además escribe en una tabla de eventos append-only imposible
    // de limpiar). Cap = 1 para poder observar la auto-detención con dos postulaciones.
    const policyRows = await runGreenhousePostgresQuery<{ policy_id: string }>(
      `INSERT INTO greenhouse_hiring.hiring_opening_assessment_policy
         (opening_id, template_id, mode, state, trigger_stage, time_limit_minutes,
          template_content_digest, enabled_at, volume_cap_per_window, volume_window_minutes, created_by)
       VALUES ($1, 'atpl-account-manager-l2', 'on_stage_entry', 'enabled', 'shortlisted', 45,
               'live-test-digest', NOW(), 1, 60, 'user-live-test')
       RETURNING policy_id`,
      [opening.openingId],
    )

    created.policyId = policyRows[0].policy_id

    const result = await assignAssessmentFromPolicy({
      applicationId: created.applicationIds[0],
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(result.status).toBe('assigned')

    // El ledger NO miente: `assigned` siempre trae su instancia (el CHECK que el happy path
    // violaba antes del forward-fix).
    const ledger = await runGreenhousePostgresQuery<{ outcome: string; assessment_id: string | null }>(
      `SELECT outcome, assessment_id FROM greenhouse_hiring.hiring_assessment_assignment
       WHERE application_id = $1 AND superseded_at IS NULL`,
      [created.applicationIds[0]],
    )

    expect(ledger).toHaveLength(1)
    expect(ledger[0].outcome).toBe('assigned')
    expect(ledger[0].assessment_id).not.toBeNull()
  })

  it('el replay del mismo trigger devuelve already_assigned: una sola fila, un solo correo', async () => {
    const replay = await assignAssessmentFromPolicy({
      applicationId: created.applicationIds[0],
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(replay.status).toBe('already_assigned')

    const rows = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment
       WHERE application_id = $1`,
      [created.applicationIds[0]],
    )

    expect(rows[0].total).toBe(1)

    const instances = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1`,
      [created.applicationIds[0]],
    )

    expect(instances[0].total).toBe(1)
  })

  it('el cap de volumen se cuenta contra PG real: la segunda postulación queda blocked', async () => {
    const blocked = await assignAssessmentFromPolicy({
      applicationId: created.applicationIds[1],
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(blocked).toMatchObject({ status: 'blocked', reasonCode: 'volume_cap' })

    const instances = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1`,
      [created.applicationIds[1]],
    )

    expect(instances[0].total).toBe(0)
  })

  it('la DB rechaza attempt_seq > 1 desde la automatización (ADR D2 capa 3, no sólo en TS)', async () => {
    await expect(
      runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_hiring.hiring_assessment_assignment
           (application_id, policy_id, policy_version, trigger_stage, attempt_seq, origin, outcome)
         VALUES ($1, $2, 1, 'shortlisted', 2, 'stage_auto', 'blocked')`,
        [created.applicationIds[1], created.policyId],
      ),
    ).rejects.toMatchObject({ code: '23514' })
  })
})
