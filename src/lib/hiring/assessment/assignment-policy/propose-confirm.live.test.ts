import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { resolveLiveTestCandidateFixtures } from '../../live-test-identity'
import { createHiringApplication, createHiringOpening, createTalentDemand } from '../../store'

import { confirmAssessmentAssignment } from './confirm-assignment'
import { buildAssignmentEffectMaterial } from './proposal-digest'
import { createAssignmentProposal } from './proposal-store'
import { proposeAssessmentAssignment } from './propose-assignment'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1719 Slice 2 — gate de SQL vivo del ledger de PROPUESTAS (ISSUE-071 / TASK-893).
 *
 * `propose-confirm.test.ts` mockea `client.query` con regex sobre el TEXTO del SQL: ejercita la
 * lógica TS y **jamás el SQL real, el índice parcial ni los GRANTs por columna**. Este archivo
 * cierra ese hueco. Lo que sólo se ve contra PostgreSQL de verdad:
 *
 * - `ON CONFLICT (application_id, effect_digest) WHERE status = 'proposed'`: si el predicado del
 *   arbiter no coincide EXACTAMENTE con el del índice parcial, Postgres tira `42P10` — con el
 *   test mockeado en verde.
 * - `status = ANY($3::text[])` + los casts/`jsonb` del store: alineación de tipos real.
 * - El `UPDATE` acotado por columna: escribir `effect_digest` o `expires_at` desde runtime es
 *   `42501`. El digest es inmutable ESTRUCTURALMENTE, no por convención.
 * - Que el `expired` COMMITEE: el 409 se lanza fuera de la transacción justamente para que la
 *   fila no vuelva a `proposed` por rollback. Se verifica releyendo la fila.
 *
 * Corre con las credenciales del runtime (`greenhouse_app` → rol `greenhouse_runtime`), que es
 * el perfil de producción y NO tiene DELETE sobre estos ledgers (por diseño). La limpieza abre
 * una conexión aparte con el perfil `ops`, que es lo que haría un operador.
 */

const OPS_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
const OPS_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
const canCleanUp = Boolean(OPS_USER && OPS_PASSWORD && process.env.GREENHOUSE_POSTGRES_HOST)

const ACTOR = 'user-live-test-proposal'

const created = {
  demandId: '',
  openingId: '',
  policyId: '',
  applicationIds: [] as string[],
  proposalIds: [] as string[],
}

/**
 * Statements con el perfil `ops`. `swallow` es para el teardown (best-effort); el arrange de un
 * test usa `swallow: false` para que un fallo de preparación NO se disfrace de aserción rota.
 */
const runAsOps = async (
  statements: { text: string; values: unknown[] }[],
  options: { swallow?: boolean } = {},
): Promise<void> => {
  const swallow = options.swallow ?? true

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
      if (swallow) {
        await client.query(statement.text, statement.values).catch(() => undefined)
      } else {
        await client.query(statement.text, statement.values)
      }
    }
  } finally {
    await client.end()
  }
}

type ProposalRowSnapshot = {
  proposal_id: string
  application_id: string
  status: string
  effect_digest: string
  confirmed_by: string | null
  confirmed_at: Date | null
  assignment_id: string | null
  policy_version: number
}

/** Relectura CRUDA de la fila: el punto del gate vivo es mirar la base, no el objeto normalizado. */
const readProposalRow = async (proposalId: string): Promise<ProposalRowSnapshot | undefined> => {
  const rows = await runGreenhousePostgresQuery<ProposalRowSnapshot>(
    `SELECT proposal_id, application_id, status, effect_digest, confirmed_by, confirmed_at,
            assignment_id, policy_version
     FROM greenhouse_hiring.hiring_assessment_assignment_proposal
     WHERE proposal_id = $1`,
    [proposalId],
  )

  return rows[0]
}

const countProposals = async (applicationId: string): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment_proposal
     WHERE application_id = $1`,
    [applicationId],
  )

  return rows[0]?.total ?? 0
}

describe.skipIf(!hasPgConfig || !canCleanUp)(
  'assessment assignment proposal (propose → confirm) — live PG (TASK-1719 Slice 2)',
  () => {
    beforeAll(async () => {
      // ⚠️ FIXTURE RESTRINGIDO A IDENTIDADES SINTÉTICAS, a propósito y por dos razones:
      //
      // 1. **El confirm manda un correo de verdad.** `assigned` publica
      //    `hiring.assessment.assigned`, y la projection `hiring_assessment_assigned_email`
      //    (`sync/projections/hiring-lifecycle-emails.ts`) le manda al candidato el link de la
      //    prueba. El publisher del outbox corre cada 2 min sobre esta misma base. Correr el
      //    happy path sobre una persona real le escribiría de verdad.
      // 2. **No crear identidad nueva.** Se reusa una `candidate_facet` existente en vez de
      //    reconciliarla: una facet nueva dispara el outbox y el ops-worker le materializa un
      //    `talent_pool_membership` (+ activity + consent) que el teardown NO puede borrar
      //    (`ON DELETE RESTRICT`) ⇒ huérfanos garantizados.
      //
      // Los `t872p-*@efeoncepro.com` quedan fuera aposta: son los que toma `assign.live.test.ts`.
      // Si el filtro deja de encontrar 3, el test FALLA fuerte acá — nunca degrada a personas
      // reales en silencio.
      // Fixture AISLADO por archivo (2026-08-23): antes esto tomaba `ORDER BY ip.profile_id LIMIT n`
      // sobre un pool compartido de 3 perfiles sintéticos, y los tres archivos de assignment-policy
      // tomaban los mismos. En paralelo se pisaban y las propuestas se invalidaban entre sí. Razón
      // completa en `live-test-identity.ts`.
      const profiles = await resolveLiveTestCandidateFixtures('assignment-propose-confirm', 3)

      expect(profiles.length).toBe(3)

      // TASK-1739 — procedencia DECLARADA al NACER. Sin `dataOrigin` el registro nace `real`, o sea
      // una vacante VISIBLE en la MISMA instancia que comparten dev, staging y producción. Y si el
      // teardown muere a mitad (se cae el proxy, se aborta la corrida), lo que queda es
      // indistinguible de un candidato de verdad: ninguna señal posterior recupera la procedencia
      // con certeza. Declararlo acá es lo único que no depende de que la limpieza alcance a correr.
      const demand = await createTalentDemand(
        {
          stakeholderType: 'internal',
          engagementType: 'on_going',
          fulfillmentMode: 'internal_hire',
          demandOrigin: 'capacity_gap',
          requestedRole: 'LIVE-TEST AM (assignment proposal)',
          dataOrigin: 'smoke_test',
        },
        ACTOR,
      )

      created.demandId = demand.demandId

      const opening = await createHiringOpening(
        { demandId: demand.demandId, internalTitle: 'LIVE-TEST opening (assignment proposal)', dataOrigin: 'smoke_test' },
        ACTOR,
      )

      created.openingId = opening.openingId

      for (const profile of profiles) {
        const application = await createHiringApplication(
          {
            openingId: opening.openingId,
            identityProfileId: profile.profileId,
            candidateFacetId: profile.candidateFacetId,
            stage: 'shortlisted',
          },
          ACTOR,
        )

        created.applicationIds.push(application.applicationId)
      }

      // La policy se inserta directo: lo que este archivo ejercita es el ledger de PROPUESTAS,
      // no el command de policy (que además escribe en una tabla de eventos append-only). Cap
      // holgado: el confirm es `origin='manual'` y el cap sólo aplica a la automatización, pero
      // un cap de 1 dejaría el test acoplado a esa regla.
      const policyRows = await runGreenhousePostgresQuery<{ policy_id: string }>(
        `INSERT INTO greenhouse_hiring.hiring_opening_assessment_policy
           (opening_id, template_id, mode, state, trigger_stage, time_limit_minutes,
            template_content_digest, enabled_at, volume_cap_per_window, volume_window_minutes, created_by)
         VALUES ($1, 'atpl-account-manager-l2', 'on_stage_entry', 'enabled', 'shortlisted', 45,
                 'live-test-digest', NOW(), 10, 60, $2)
         RETURNING policy_id`,
        [opening.openingId, ACTOR],
      )

      created.policyId = policyRows[0].policy_id
    })

    afterAll(async () => {
      // Orden obligatorio por FK (todas `ON DELETE RESTRICT` salvo `hiring_assessment`, que
      // cuelga de la postulación con CASCADE):
      //   proposal → assignment → application (cascade: hiring_assessment) → policy → opening →
      //   demand.
      // La propuesta va PRIMERO: referencia application, policy Y assignment.
      // `candidate_facet` NO se toca: el fixture reusa facets preexistentes de personas reales.
      const assessmentIds = created.applicationIds.length
        ? await runGreenhousePostgresQuery<{ assessment_id: string }>(
            `SELECT assessment_id FROM greenhouse_hiring.hiring_assessment WHERE application_id = ANY($1::text[])`,
            [created.applicationIds],
          ).catch(() => [])
        : []

      // El ledger de assignment también emite eventos con SU id como `aggregate_id`
      // (`assignment_recorded`, `auto_assignment_blocked`). Sin esto quedan huérfanos `pending`
      // apuntando a un assignment que el teardown ya borró.
      const assignmentIds = created.applicationIds.length
        ? await runGreenhousePostgresQuery<{ assignment_id: string }>(
            `SELECT assignment_id FROM greenhouse_hiring.hiring_assessment_assignment
             WHERE application_id = ANY($1::text[])`,
            [created.applicationIds],
          ).catch(() => [])
        : []

      await runAsOps([
        {
          text: `DELETE FROM greenhouse_hiring.hiring_assessment_assignment_proposal WHERE application_id = ANY($1::text[])`,
          values: [created.applicationIds],
        },
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
        { text: `DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, values: [created.openingId] },
        { text: `DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, values: [created.demandId] },
        {
          text: `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
          values: [
            [
              ...created.applicationIds,
              ...created.proposalIds,
              ...assessmentIds.map(row => row.assessment_id),
              ...assignmentIds.map(row => row.assignment_id),
              created.openingId,
              created.demandId,
            ].filter(Boolean),
          ],
        },
      ])
    })

    it('propose escribe la propuesta contra PG: el INSERT con arbiter del índice PARCIAL no revienta con 42P10', async () => {
      const { proposal, created: wasCreated } = await proposeAssessmentAssignment({
        applicationId: created.applicationIds[0],
        actorUserId: ACTOR,
      })

      created.proposalIds.push(proposal.proposalId)

      expect(wasCreated).toBe(true)
      expect(proposal.status).toBe('proposed')
      // sha256 hex: el digest viaja al cliente y queda en el ledger.
      expect(proposal.effectDigest).toHaveLength(64)
      // Mundo sano: sin bloqueo de preview (policy enabled + plantilla activa + email válido).
      expect(proposal.preview.blockingReasonCode).toBeNull()

      const row = await readProposalRow(proposal.proposalId)

      expect(row).toBeDefined()
      expect(row?.status).toBe('proposed')
      expect(row?.application_id).toBe(created.applicationIds[0])
      expect(row?.confirmed_by).toBeNull()
      expect(row?.assignment_id).toBeNull()
    })

    it('propose es idempotente por digest: reabrir el diálogo devuelve la MISMA propuesta, no una fila nueva', async () => {
      const again = await proposeAssessmentAssignment({
        applicationId: created.applicationIds[0],
        actorUserId: ACTOR,
      })

      expect(again.created).toBe(false)
      expect(again.proposal.proposalId).toBe(created.proposalIds[0])
      expect(await countProposals(created.applicationIds[0])).toBe(1)
    })

    it('la CARRERA del índice parcial se resuelve en la base: ON CONFLICT DO NOTHING + relectura de la ganadora', async () => {
      // El command corta antes del INSERT (`findActiveAssignmentProposal`), así que la rama del
      // `ON CONFLICT` sólo la ejercita un writer concurrente. Se invoca el store directo: es el
      // único camino que prueba que el predicado del arbiter calza con el del índice parcial.
      const context = await buildAssignmentEffectMaterial(created.applicationIds[0])

      expect(context).not.toBeNull()
      expect(context?.digest).toBe((await readProposalRow(created.proposalIds[0]))?.effect_digest)

      const raced = await withGreenhousePostgresTransaction(async (client) =>
        createAssignmentProposal(client, {
          applicationId: created.applicationIds[0],
          policyId: created.policyId,
          policyVersion: context!.policy.policyVersion,
          effectDigest: context!.digest,
          preview: {
            openingTitle: context!.openingTitle,
            templateName: context!.templateName,
            templateVersion: context!.templateVersion,
            policyVersion: context!.policy.policyVersion,
            mode: context!.policy.mode,
            triggerStage: context!.material.triggerStage,
            timeLimitMinutes: context!.policy.timeLimitMinutes,
            recipientReady: context!.material.recipientReady,
            existingOpenAssessment: context!.material.existingOpenAssessment,
            existingScoredAssessment: context!.material.existingScoredAssessment,
            blockingReasonCode: null,
          },
          proposedBy: 'user-live-test-racer',
          expiresAt: new Date(Date.now() + 30 * 60_000),
        }),
      )

      expect(raced.created).toBe(false)
      expect(raced.proposal.proposalId).toBe(created.proposalIds[0])
      // El perdedor de la carrera NO deja rastro: sigue habiendo una sola propuesta.
      expect(await countProposals(created.applicationIds[0])).toBe(1)
    })

    it('confirm es ONE-SHOT: ejecuta el efecto, cierra la propuesta y el segundo confirm no re-asigna', async () => {
      const confirmed = await confirmAssessmentAssignment({
        proposalId: created.proposalIds[0],
        applicationId: created.applicationIds[0],
        actorUserId: ACTOR,
      })

      expect(confirmed.alreadyConfirmed).toBe(false)
      expect(confirmed.result?.status).toBe('assigned')
      expect(confirmed.assignmentId).toBeTruthy()

      // El UPDATE acotado escribió las 5 columnas concedidas — y sólo esas.
      const row = await readProposalRow(created.proposalIds[0])

      expect(row?.status).toBe('confirmed')
      expect(row?.confirmed_by).toBe(ACTOR)
      expect(row?.confirmed_at).not.toBeNull()
      expect(row?.assignment_id).toBe(confirmed.assignmentId)

      const replay = await confirmAssessmentAssignment({
        proposalId: created.proposalIds[0],
        applicationId: created.applicationIds[0],
        actorUserId: ACTOR,
      })

      expect(replay.alreadyConfirmed).toBe(true)
      // `result: null` = ESTA llamada no ejecutó nada; el correo no se manda dos veces.
      expect(replay.result).toBeNull()
      expect(replay.assignmentId).toBe(confirmed.assignmentId)

      const instances = await runGreenhousePostgresQuery<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1`,
        [created.applicationIds[0]],
      )

      expect(instances[0].total).toBe(1)

      const assignments = await runGreenhousePostgresQuery<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment
         WHERE application_id = $1`,
        [created.applicationIds[0]],
      )

      expect(assignments[0].total).toBe(1)
    })

    it('el vencimiento se ENFORCEA y COMMITEA: el confirm rechaza y deja la fila `expired` en la base', async () => {
      const { proposal } = await proposeAssessmentAssignment({
        applicationId: created.applicationIds[1],
        actorUserId: ACTOR,
      })

      created.proposalIds.push(proposal.proposalId)

      // `expires_at` se fuerza con el perfil `ops` porque el runtime NO puede escribir esa
      // columna — y eso mismo es la prueba de que el GRANT está acotado (ver abajo).
      await expect(
        runGreenhousePostgresQuery(
          `UPDATE greenhouse_hiring.hiring_assessment_assignment_proposal
             SET expires_at = NOW() - INTERVAL '1 minute' WHERE proposal_id = $1`,
          [proposal.proposalId],
        ),
      ).rejects.toMatchObject({ code: '42501' })

      await runAsOps(
        [
          {
            text: `UPDATE greenhouse_hiring.hiring_assessment_assignment_proposal
                     SET expires_at = NOW() - INTERVAL '1 minute' WHERE proposal_id = $1`,
            values: [proposal.proposalId],
          },
        ],
        { swallow: false },
      )

      await expect(
        confirmAssessmentAssignment({
          proposalId: proposal.proposalId,
          applicationId: created.applicationIds[1],
          actorUserId: ACTOR,
        }),
      ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_expired', statusCode: 409 })

      // NO cosmético: la transición sobrevivió al 409 porque el throw ocurre fuera de la tx.
      const row = await readProposalRow(proposal.proposalId)

      expect(row?.status).toBe('expired')
      expect(row?.confirmed_by).toBeNull()
      expect(row?.assignment_id).toBeNull()

      // Y no se ejecutó ningún efecto.
      const instances = await runGreenhousePostgresQuery<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1`,
        [created.applicationIds[1]],
      )

      expect(instances[0].total).toBe(0)
    })

    it('digest stale: si el mundo cambia entre el preview y el confirm, la propuesta muere `superseded` y no se ejecuta nada', async () => {
      const { proposal } = await proposeAssessmentAssignment({
        applicationId: created.applicationIds[2],
        actorUserId: ACTOR,
      })

      created.proposalIds.push(proposal.proposalId)

      const before = await readProposalRow(proposal.proposalId)

      // Cambia el efecto: `timeLimitMinutes` entra al material del digest. Se toca la fila de
      // policy directo (con `ops`) en vez de usar el command para no ensuciar la tabla de
      // eventos append-only de la policy, que no se puede limpiar.
      await runAsOps(
        [
          {
            text: `UPDATE greenhouse_hiring.hiring_opening_assessment_policy
                     SET time_limit_minutes = 90 WHERE policy_id = $1`,
            values: [created.policyId],
          },
        ],
        { swallow: false },
      )

      const recomputed = await buildAssignmentEffectMaterial(created.applicationIds[2])

      expect(recomputed?.digest).not.toBe(before?.effect_digest)

      await expect(
        confirmAssessmentAssignment({
          proposalId: proposal.proposalId,
          applicationId: created.applicationIds[2],
          actorUserId: ACTOR,
        }),
      ).rejects.toMatchObject({ code: 'assessment_assignment_proposal_stale', statusCode: 409 })

      const row = await readProposalRow(proposal.proposalId)

      expect(row?.status).toBe('superseded')
      expect(row?.assignment_id).toBeNull()
      // El digest de lo aprobado NO se reescribe: el ledger conserva qué vio la persona.
      expect(row?.effect_digest).toBe(before?.effect_digest)

      const instances = await runGreenhousePostgresQuery<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1`,
        [created.applicationIds[2]],
      )

      expect(instances[0].total).toBe(0)
    })

    it('pertenencia cruzada: confirmar con la application de otra postulación es 404, NUNCA 403', async () => {
      await expect(
        confirmAssessmentAssignment({
          proposalId: created.proposalIds[0],
          applicationId: created.applicationIds[1],
          actorUserId: ACTOR,
        }),
      ).rejects.toMatchObject({
        code: 'assessment_assignment_proposal_not_found',
        statusCode: 404,
      })
    })

    it('el GRANT está acotado de verdad: runtime NO puede reescribir `effect_digest` (inmutabilidad estructural)', async () => {
      const before = await readProposalRow(created.proposalIds[0])

      await expect(
        runGreenhousePostgresQuery(
          `UPDATE greenhouse_hiring.hiring_assessment_assignment_proposal
             SET effect_digest = $2 WHERE proposal_id = $1`,
          [created.proposalIds[0], 'f'.repeat(64)],
        ),
      ).rejects.toMatchObject({ code: '42501' })

      // Las otras columnas inmutables del contrato, por el mismo camino.
      for (const column of ['preview_json', 'policy_version', 'proposed_by']) {
        await expect(
          runGreenhousePostgresQuery(
            `UPDATE greenhouse_hiring.hiring_assessment_assignment_proposal
               SET ${column} = ${column} WHERE proposal_id = $1`,
            [created.proposalIds[0]],
          ),
        ).rejects.toMatchObject({ code: '42501' })
      }

      const after = await readProposalRow(created.proposalIds[0])

      expect(after?.effect_digest).toBe(before?.effect_digest)
      expect(after?.policy_version).toBe(before?.policy_version)
    })
  },
)
