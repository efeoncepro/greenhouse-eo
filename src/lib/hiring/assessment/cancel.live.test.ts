import { Client } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { cancelCandidateTest } from './cancel'
import { resolveAssessmentByToken } from './instances'
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
 * TASK-1719 Slice 3 — guardia live contra PG real de la CANCELACIÓN Y SU RECUPERACIÓN.
 *
 * Verifica lo que los mocks no pueden: que cancelar libera de verdad **las dos llaves** que
 * bloquean re-asignar, contra las constraints reales.
 *
 * ⚠️ Este archivo ejercita `assignAssessmentFromPolicy` — el command GOBERNADO — a propósito.
 * La versión anterior recorría el camino legacy (`assignCandidateTest`), que no toca el ledger
 * de assignment: por eso pasaba en verde mientras el bug bloqueante seguía vivo. Cancelar
 * liberaba el índice de la instancia pero dejaba la fila del ledger `assigned`, vigente y
 * apuntando a la instancia muerta, así que re-asignar por el command devolvía `already_assigned`
 * con el assessmentId CANCELADO (200, sin instancia, sin correo) y el carril automático callaba.
 * Un test que no pasa por el ledger no puede ver eso.
 *
 * Se corre con las credenciales del runtime (`greenhouse_app`), que es el perfil de producción y
 * NO tiene DELETE sobre el ledger. La limpieza abre conexión aparte con `ops`.
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

describe.skipIf(!hasPgConfig || !canCleanUp)('assessment cancel — live PG (TASK-1719)', () => {
  afterAll(async () => {
    // Orden obligatorio: el ledger referencia application con ON DELETE RESTRICT, y las
    // instancias cuelgan de la application por CASCADE.
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

  it('el CHECK de status acepta `cancelled` y el índice de instancia abierta lo EXCLUYE', async () => {
    const check = await runGreenhousePostgresQuery<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
       WHERE conname = 'hiring_assessment_status_check'`,
    )

    expect(check[0]?.def).toContain('cancelled')

    const index = await runGreenhousePostgresQuery<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'hiring_assessment_open_instance_unique_idx'`,
    )

    // El slot único NO puede incluir `cancelled`: liberar (application, template) es la MITAD
    // estructural de la recuperación. La otra mitad es el supersede del ledger (test siguiente).
    expect(index[0]?.indexdef).toBeDefined()
    expect(index[0]?.indexdef).not.toContain('cancelled')
  })

  it('el runtime PUEDE escribir superseded_at/outcome/outcome_reason del ledger (GRANT column-scoped)', async () => {
    // Si el grant no cubriera estas columnas, el supersede reventaría con 42501 EN PRODUCCIÓN,
    // dentro de la tx de cancelar — o sea: cancelar dejaría de funcionar del todo.
    const grants = await runGreenhousePostgresQuery<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges
        WHERE table_schema = 'greenhouse_hiring'
          AND table_name = 'hiring_assessment_assignment'
          AND grantee = 'greenhouse_runtime'
          AND privilege_type = 'UPDATE'`,
    )

    const columns = grants.map(row => row.column_name)

    expect(columns).toEqual(expect.arrayContaining(['superseded_at', 'outcome', 'outcome_reason', 'updated_at']))
  })

  it('asignar por el command gobernado → cancelar → re-asignar crea una instancia NUEVA', async () => {
    // ⚠️ SÓLO identidades SINTÉTICAS. Una asignación exitosa publica `hiring.assessment.assigned`
    // y el publisher del outbox está VIVO en esta base: la projection le manda al candidato el
    // LINK de su prueba. Un fixture que tomara "el primer perfil activo" le escribiría a una
    // persona real.
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
        requestedRole: 'LIVE-TEST AM (cancel)',
      },
      'user-live-test',
    )

    created.demandId = demand.demandId

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'LIVE-TEST opening (cancel)' },
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

    // Cap holgado: el cap cuenta también la asignación cancelada (cancelar no des-envía el
    // correo que ya salió), así que con cap=1 la re-asignación quedaría `blocked: volume_cap`
    // y este test no probaría lo que dice probar.
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

    const first = await assignAssessmentFromPolicy({
      applicationId: app.applicationId,
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(first.status).toBe('assigned')

    const firstAssessmentId = 'assessmentId' in first ? String(first.assessmentId) : ''

    assessmentIds.push(firstAssessmentId)

    // Antes de cancelar: el replay devuelve `already_assigned` (el ledger ocupa la llave).
    const replay = await assignAssessmentFromPolicy({
      applicationId: app.applicationId,
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(replay.status).toBe('already_assigned')

    const cancelled = await cancelCandidateTest(
      { assessmentId: firstAssessmentId, reasonCode: 'wrong_template', expectedStatus: 'assigned' },
      'user-live-test',
    )

    expect(cancelled.outcome).toBe('cancelled')
    expect(cancelled.assessment.status).toBe('cancelled')

    // LLAVE 2 — el ledger quedó superseded y con outcome honesto.
    const ledgerAfterCancel = await runGreenhousePostgresQuery<{
      outcome: string
      outcome_reason: string | null
      superseded_at: string | null
    }>(
      `SELECT outcome, outcome_reason, superseded_at FROM greenhouse_hiring.hiring_assessment_assignment
        WHERE assessment_id = $1`,
      [firstAssessmentId],
    )

    expect(ledgerAfterCancel).toHaveLength(1)
    expect(ledgerAfterCancel[0].outcome).toBe('cancelled')
    expect(ledgerAfterCancel[0].outcome_reason).toBe('operator_cancelled')
    expect(ledgerAfterCancel[0].superseded_at).not.toBeNull()

    // EL TEST QUE FALTABA: re-asignar por el COMMAND GOBERNADO tiene que crear una instancia
    // NUEVA. Con el bug, esto devolvía `already_assigned` + el assessmentId cancelado.
    const second = await assignAssessmentFromPolicy({
      applicationId: app.applicationId,
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(second.status).toBe('assigned')

    const secondAssessmentId = 'assessmentId' in second ? String(second.assessmentId) : ''

    assessmentIds.push(secondAssessmentId)
    expect(secondAssessmentId).not.toBe('')
    expect(secondAssessmentId).not.toBe(firstAssessmentId)

    // Dos filas de ledger: la superseded (evidencia) y la vigente nueva. Nunca se borra nada.
    const ledgerRows = await runGreenhousePostgresQuery<{ total: number; active: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE superseded_at IS NULL)::int AS active
         FROM greenhouse_hiring.hiring_assessment_assignment WHERE application_id = $1`,
      [created.applicationId],
    )

    expect(ledgerRows[0].total).toBe(2)
    expect(ledgerRows[0].active).toBe(1)

    // Y la instancia cancelada sigue como evidencia, con su token muerto.
    const instances = await runGreenhousePostgresQuery<{ status: string; access_token_hash: string | null }>(
      `SELECT status, access_token_hash FROM greenhouse_hiring.hiring_assessment
        WHERE application_id = $1 ORDER BY created_at`,
      [created.applicationId],
    )

    expect(instances.map(row => row.status)).toEqual(['cancelled', 'assigned'])
    expect(instances[0].access_token_hash).toBeNull()
  })

  it('cancelar de nuevo es no-op idempotente y NO vuelve a tocar el ledger', async () => {
    const again = await cancelCandidateTest(
      { assessmentId: assessmentIds[0], reasonCode: 'wrong_template' },
      'user-live-test',
    )

    expect(again.outcome).toBe('already_cancelled')

    // El token de la instancia VIGENTE (la segunda) sigue vivo: el no-op no arrastró nada.
    const active = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment
        WHERE application_id = $1 AND superseded_at IS NULL`,
      [created.applicationId],
    )

    expect(active[0].total).toBe(1)
  })

  it('cancelar la instancia vigente vuelve a liberar la llave (el ciclo es repetible)', async () => {
    await cancelCandidateTest({ assessmentId: assessmentIds[1], reasonCode: 'sent_in_error' }, 'user-live-test')

    const active = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment
        WHERE application_id = $1 AND superseded_at IS NULL`,
      [created.applicationId],
    )

    expect(active[0].total).toBe(0)

    // Y el token de esa instancia también murió (no queda ningún link vivo colgando).
    const rows = await runGreenhousePostgresQuery<{ access_token_hash: string | null }>(
      `SELECT access_token_hash FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
      [assessmentIds[1]],
    )

    expect(rows[0]?.access_token_hash).toBeNull()
    expect(await resolveAssessmentByToken('cualquier-token-invalido')).toBeNull()
  })
})
