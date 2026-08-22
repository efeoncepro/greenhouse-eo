import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { createHiringApplication, createHiringOpening, createTalentDemand } from '../../store'

import { assignAssessmentFromPolicy, NEXT_ATTEMPT_AFTER_DEAD_END } from './assign'
import { confirmAssessmentAssignment } from './confirm-assignment'
import { proposeAssessmentAssignment } from './propose-assignment'
import { markPolicyEnabled } from './store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1755 — Gate de SQL vivo del callejón sin salida (ISSUE-071 / TASK-893).
 *
 * `attempt-retry.test.ts` ejercita la lógica contra un ledger en memoria. Contra PostgreSQL de
 * verdad se ven tres cosas que ningún mock puede mostrar:
 *
 * - `readAssignmentAttemptState`: SQL nuevo. Si la clave o los tipos no calzan, el resolver
 *   devuelve basura y el intento se escribe en el casillero equivocado — con el test mockeado
 *   en verde.
 * - `hiring_assessment_assignment_active_unique_idx`: que el intento 2 SÍ quepa junto a un
 *   intento 1 vigente. El índice es parcial y su predicado no incluye `attempt_seq` por
 *   accidente: si estuviera mal, esto revienta con `23505`.
 * - `CHECK (origin = 'manual' OR attempt_seq = 1)`: la red de la base bajo el límite de
 *   autoridad del ADR D2 capa 3.
 *
 * ⚠️ **FIXTURE RESTRINGIDO A IDENTIDADES SINTÉTICAS, y por la razón más cara que hay:** el
 * ciclo termina en `assigned`, que publica `hiring.assessment.assigned`, y la projection
 * `hiring_assessment_assigned_email` le manda al candidato el link de la prueba. El publisher
 * del outbox corre cada 2 minutos sobre ESTA misma base. Por eso (a) el fixture sólo toma
 * perfiles sintéticos y FALLA FUERTE si no los encuentra —nunca degrada a personas reales en
 * silencio—, y (b) el evento se borra dentro del propio test, no en el `afterAll`: dejar la
 * ventana abierta hasta el teardown es apostarle al reloj del publisher.
 *
 * Corre con las credenciales del runtime (`greenhouse_app`), que NO tiene DELETE sobre estos
 * ledgers por diseño. La limpieza abre una conexión aparte con el perfil `ops`.
 */

const OPS_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
const OPS_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
const canCleanUp = Boolean(OPS_USER && OPS_PASSWORD && process.env.GREENHOUSE_POSTGRES_HOST)

const ACTOR = 'user-live-test-1755'

const created = {
  demandId: '',
  openingId: '',
  policyId: '',
  applicationIds: [] as string[],
}

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

type LedgerSnapshot = {
  assignment_id: string
  attempt_seq: number
  outcome: string
  outcome_reason: string | null
  assessment_id: string | null
  superseded_at: Date | null
  origin: string
  trigger_stage: string
}

/** Relectura CRUDA del ledger: el punto del gate vivo es mirar la base, no el objeto normalizado. */
const readManualLedger = async (applicationId: string): Promise<LedgerSnapshot[]> =>
  runGreenhousePostgresQuery<LedgerSnapshot>(
    `SELECT assignment_id, attempt_seq, outcome, outcome_reason, assessment_id, superseded_at,
            origin, trigger_stage
     FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE application_id = $1 AND trigger_stage = 'manual'
     ORDER BY attempt_seq`,
    [applicationId],
  )

/**
 * Retira el evento que dispara el correo al candidato, en el acto. NO espera al `afterAll`:
 * entre el assert y el teardown hay segundos, y el publisher corre cada 2 minutos.
 */
const dropAssignedEmailEvent = async (assessmentId: string): Promise<void> => {
  await runAsOps(
    [{ text: `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = $1`, values: [assessmentId] }],
    { swallow: false },
  )
}

const proposeAndConfirm = async (applicationId: string) => {
  const { proposal } = await proposeAssessmentAssignment({ applicationId, actorUserId: ACTOR })

  return confirmAssessmentAssignment({ proposalId: proposal.proposalId, applicationId, actorUserId: ACTOR })
}

describe.skipIf(!hasPgConfig || !canCleanUp)('assignment attempt retry — live PG (TASK-1755)', () => {
  beforeAll(async () => {
    const profiles = await runGreenhousePostgresQuery<{ profile_id: string; candidate_facet_id: string }>(
      `SELECT ip.profile_id, cf.candidate_facet_id
       FROM greenhouse_core.identity_profiles ip
       JOIN greenhouse_hiring.candidate_facet cf ON cf.identity_profile_id = ip.profile_id
       WHERE ip.active = true
         AND ip.canonical_email ILIKE '%@efeonce.org'
         AND ip.canonical_email ~* '^(task-[0-9]+|qa\\.careers\\+)'
       ORDER BY ip.profile_id LIMIT 2`,
    )

    // Falla FUERTE: sin identidades sintéticas este archivo no corre sobre personas reales.
    expect(profiles.length).toBe(2)

    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'LIVE-TEST AM (attempt retry)',
      },
      ACTOR,
    )

    created.demandId = demand.demandId

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'LIVE-TEST opening (attempt retry)' },
      ACTOR,
    )

    created.openingId = opening.openingId

    for (const profile of profiles) {
      const application = await createHiringApplication(
        {
          openingId: opening.openingId,
          identityProfileId: profile.profile_id,
          candidateFacetId: profile.candidate_facet_id,
          stage: 'shortlisted',
        },
        ACTOR,
      )

      created.applicationIds.push(application.applicationId)
    }

    // La policy nace en `draft`, que es el estado en que NACE toda policy y la causa más
    // frecuente del callejón. El test la habilita a mitad de camino, como haría el operador.
    const policyRows = await runGreenhousePostgresQuery<{ policy_id: string }>(
      `INSERT INTO greenhouse_hiring.hiring_opening_assessment_policy
         (opening_id, template_id, mode, state, trigger_stage, time_limit_minutes,
          template_content_digest, volume_cap_per_window, volume_window_minutes, created_by)
       VALUES ($1, 'atpl-account-manager-l2', 'manual', 'draft', 'shortlisted', 45,
               'live-test-digest-1755', 10, 60, $2)
       RETURNING policy_id`,
      [opening.openingId, ACTOR],
    )

    created.policyId = policyRows[0].policy_id
  })

  afterAll(async () => {
    const assessmentIds = created.applicationIds.length
      ? await runGreenhousePostgresQuery<{ assessment_id: string }>(
          `SELECT assessment_id FROM greenhouse_hiring.hiring_assessment WHERE application_id = ANY($1::text[])`,
          [created.applicationIds],
        ).catch(() => [])
      : []

    const assignmentIds = created.applicationIds.length
      ? await runGreenhousePostgresQuery<{ assignment_id: string }>(
          `SELECT assignment_id FROM greenhouse_hiring.hiring_assessment_assignment
           WHERE application_id = ANY($1::text[])`,
          [created.applicationIds],
        ).catch(() => [])
      : []

    const proposalIds = created.applicationIds.length
      ? await runGreenhousePostgresQuery<{ proposal_id: string }>(
          `SELECT proposal_id FROM greenhouse_hiring.hiring_assessment_assignment_proposal
           WHERE application_id = ANY($1::text[])`,
          [created.applicationIds],
        ).catch(() => [])
      : []

    // Orden obligatorio por FK: proposal → assignment → application (cascade: hiring_assessment)
    // → policy → opening → demand. `candidate_facet` NO se toca: el fixture reusa facets vivas.
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
            ...proposalIds.map(row => row.proposal_id),
            ...assessmentIds.map(row => row.assessment_id),
            ...assignmentIds.map(row => row.assignment_id),
            created.openingId,
            created.demandId,
            created.policyId,
          ].filter(Boolean),
        ],
      },
    ])
  })

  it('el ciclo completo contra PG: policy en `draft` bloquea, habilitarla ASIGNA en el intento 2', async () => {
    const applicationId = created.applicationIds[0]

    // 1. Primer intento con la policy recién nacida.
    const blocked = await proposeAndConfirm(applicationId)

    expect(blocked.result).toMatchObject({ status: 'blocked', reasonCode: 'policy_disabled' })

    // 2. El operador corrige la causa real, por el command verdadero.
    await withGreenhousePostgresTransaction(client =>
      markPolicyEnabled(client, created.policyId, {
        templateContentDigest: 'live-test-digest-1755',
        enabledBy: ACTOR,
      }),
    )

    // 3. Confirmar de nuevo. Antes de TASK-1755 el INSERT colisionaba con el intento 1 y el
    //    replay repetía `blocked` para siempre.
    const assigned = await proposeAndConfirm(applicationId)

    expect(assigned.result?.status).toBe('assigned')

    const assessmentId = assigned.result?.status === 'assigned' ? assigned.result.assessmentId : ''

    expect(assessmentId).toBeTruthy()

    // Se retira el correo YA, antes de cualquier otro assert.
    await dropAssignedEmailEvent(assessmentId)

    // 4. La base conserva los DOS intentos, ambos vigentes: el índice parcial los admite porque
    //    `attempt_seq` participa de la clave. Cero DELETE, cero UPDATE destructivo.
    const ledger = await readManualLedger(applicationId)

    expect(ledger.map(row => ({ attempt: row.attempt_seq, outcome: row.outcome }))).toEqual([
      { attempt: 1, outcome: 'blocked' },
      { attempt: 2, outcome: 'assigned' },
    ])
    expect(ledger.every(row => row.superseded_at === null)).toBe(true)
    expect(ledger[0].assessment_id).toBeNull()
    // `hiring_assessment_assignment_assigned_instance_ck`: un `assigned` sin instancia es un
    // ledger que miente, y la base lo impide.
    expect(ledger[1].assessment_id).toBe(assessmentId)
  })

  it('el `assigned` vigente sigue cerrando la puerta: ni fila nueva ni segunda prueba', async () => {
    const applicationId = created.applicationIds[0]

    const replay = await proposeAndConfirm(applicationId)

    expect(replay.result?.status).toBe('already_assigned')

    const ledger = await readManualLedger(applicationId)

    expect(ledger).toHaveLength(2)
    expect(ledger[1].outcome).toBe('assigned')

    const instances = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment
       WHERE application_id = $1 AND method = 'candidate_test'`,
      [applicationId],
    )

    expect(instances[0].total).toBe(1)
  })

  it('la base sostiene el límite de autoridad: un origen automático no escribe un intento > 1', async () => {
    // El command corta antes del INSERT, así que este assert prueba la guarda de TS. El CHECK
    // `(origin = 'manual' OR attempt_seq = 1)` es la red de abajo y se ejercita en
    // `assign.live.test.ts`; acá se cubre que el SENTINEL tampoco la puede cruzar.
    await expect(
      assignAssessmentFromPolicy({
        applicationId: created.applicationIds[1],
        policyId: created.policyId,
        origin: 'stage_auto',
        actorUserId: null,
        triggerStage: 'shortlisted',
        attemptSeq: NEXT_ATTEMPT_AFTER_DEAD_END,
      }),
    ).rejects.toMatchObject({ code: 'assessment_assignment_attempt_forbidden' })

    const ledger = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment
       WHERE application_id = $1`,
      [created.applicationIds[1]],
    )

    expect(ledger[0].total).toBe(0)
  })
})
