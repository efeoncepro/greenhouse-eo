import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { createHiringApplication, createHiringOpening, createTalentDemand } from '../../store'

import { assignAssessmentFromPolicy } from './assign'
import { countAssignedInWindow } from './assignment-store'
import { resolveAssignmentDeadEndsForPolicy } from './dead-ends'
import { activeProcessPredicate } from '../../active-process'
import { resolveApplicationsAwaitingAssignment } from './readers'
import { supersedeAssignmentDeadEnd } from './supersede-dead-end'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1771 Slice 4 — Gate de SQL vivo del supersede del carril automático.
 *
 * `supersede-dead-end.test.ts` ejercita la lógica contra un ledger en memoria. Contra PostgreSQL
 * de verdad se ven cuatro cosas que ningún mock puede mostrar:
 *
 * - que el `UPDATE` estampa `superseded_at` **dejando `outcome` y `outcome_reason` intactos** — el
 *   `GRANT UPDATE` es column-scoped, así que si el command intentara reescribir algo fuera de la
 *   lista, la base lo rechazaría;
 * - que liberar la clave **la devuelve de verdad** a `resolveApplicationsAwaitingAssignment`, que
 *   es el reader canónico y el único que prueba que la recuperación sirvió para algo;
 * - que el índice único parcial acepta la fila liberada sin colisionar;
 * - que el cap de volumen **no cambia** por un supersede (`countAssignedInWindow` no filtra
 *   `superseded_at` a propósito, y esa omisión es la que impide que liberar devuelva presupuesto).
 *
 * ⚠️ **Este gate NUNCA llega a `assigned`, y eso está ENFORCED, no declarado.** El ciclo termina
 * en el supersede; el segundo caso apaga la policy **antes** de reintentar y el test asserta cero
 * instancias. La primera versión decía esto mismo en un comentario y no lo hacía: con la clave ya
 * liberada y la policy habilitada, el reintento asignó de verdad y dejó un
 * `hiring.assessment.assigned` en estado `pending` apuntando a una instancia que el teardown ya
 * había borrado — a minutos de que el publisher (cada 2 min, sobre ESTA base) lo despachara. Se
 * retiró a mano con verify-then-delete. **Un comentario no es una guarda.**
 *
 * ⚠️ **Fixture restringido a identidades sintéticas y FALLA FUERTE si no las encuentra**
 * (ISSUE-159): hay UNA instancia Cloud SQL compartida por dev, staging y producción, así que un
 * fixture que tome «el primer perfil activo» fabrica actividad sobre una persona real.
 *
 * ⚠️ **Residuo cero en DOS ejes, no en uno.** Borrar lo creado no basta: hay que verificar que las
 * métricas globales vuelvan a su línea base. Superseder una fila la SACA del ledger vigente y por
 * eso la postulación ENTRA a `awaiting_terminal` (que cuenta postulaciones SIN fila vigente) — o
 * sea que una corrida que dejara residuo subiría esa señal de forma permanente y silenciosa. El
 * `afterAll` lo asserta.
 *
 * Corre con las credenciales del runtime (`greenhouse_app`), que NO tiene DELETE sobre estos
 * ledgers por diseño. La limpieza abre una conexión aparte con el perfil `ops`.
 */

const OPS_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
const OPS_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
const canCleanUp = Boolean(OPS_USER && OPS_PASSWORD && process.env.GREENHOUSE_POSTGRES_HOST)

const ACTOR = 'user-live-test-1771'

const created = {
  demandId: '',
  openingId: '',
  policyId: '',
  applicationId: '',
}

const baseline: { awaitingTerminal: Set<string> | null } = {
  awaitingTerminal: null,
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
  origin: string
  trigger_stage: string
  superseded_at: Date | null
}

/** Relectura CRUDA del ledger: el punto del gate vivo es mirar la base, no el objeto normalizado. */
const readLedger = async (): Promise<LedgerSnapshot[]> =>
  runGreenhousePostgresQuery<LedgerSnapshot>(
    `SELECT assignment_id, attempt_seq, outcome, outcome_reason, origin, trigger_stage, superseded_at
     FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE application_id = $1
     ORDER BY created_at`,
    [created.applicationId],
  )

/**
 * Espejo del predicado de `awaiting_terminal` de la señal, para medir el residuo real. Consume el
 * predicado CANÓNICO de proceso activo (TASK-1772) en vez de reescribirlo: la señal lo migró, y una
 * copia que dice «verbatim» sin serlo miente justo donde el test cree estar midiendo lo mismo.
 *
 * Devuelve IDS, no un total. Un TOTAL global es incomparable entre el `beforeAll` y el `afterAll`
 * de un live test: los otros archivos de esta carpeta corren EN PARALELO contra esta misma base y
 * mueven la señal legítimamente, así que el assert fallaba por que el vecino hiciera lo correcto.
 * Con ids el residuo propio se distingue del trabajo ajeno sin relajar nada.
 */
const listAwaitingTerminalApplicationIds = async (): Promise<Set<string>> => {
  const rows = await runGreenhousePostgresQuery<{ application_id: string }>(
    `SELECT app.application_id
       FROM greenhouse_hiring.hiring_application app
       JOIN greenhouse_hiring.hiring_opening_assessment_policy p
         ON p.opening_id = app.opening_id AND p.state = 'enabled' AND p.mode = 'on_stage_entry'
      WHERE ${activeProcessPredicate('app')}
        AND app.stage = p.trigger_stage
        AND NOT EXISTS (
              SELECT 1 FROM greenhouse_hiring.hiring_assessment a
               WHERE a.application_id = app.application_id AND a.template_id = p.template_id
                 AND a.method = 'candidate_test'
                 AND a.status IN ('assigned', 'sent', 'in_progress', 'submitted', 'scored'))
        AND NOT EXISTS (
              SELECT 1 FROM greenhouse_hiring.hiring_assessment_assignment asg
               WHERE asg.application_id = app.application_id AND asg.policy_id = p.policy_id
                 AND asg.policy_version = p.policy_version AND asg.trigger_stage = p.trigger_stage
                 AND asg.superseded_at IS NULL)`,
  )

  return new Set(rows.map(row => row.application_id))
}

/**
 * Habilitar la policy exige más que `state`: el `CHECK ..._enabled_digest_ck` de la base pide
 * `template_content_digest` **y** `enabled_at` no nulos. Es el nacimiento seguro del ADR D5.1
 * enforceado en la base —configurar no es habilitar— y el fixture lo respeta en vez de rodearlo.
 * Lo descubrió la base rechazando el atajo, que es exactamente para lo que existe este gate.
 */
const setPolicyState = async (state: 'draft' | 'enabled'): Promise<void> => {
  await runAsOps(
    [
      {
        text: `UPDATE greenhouse_hiring.hiring_opening_assessment_policy
                 SET state = $2,
                     enabled_by = CASE WHEN $2 = 'enabled' THEN $3 ELSE enabled_by END,
                     enabled_at = CASE WHEN $2 = 'enabled' THEN NOW() ELSE enabled_at END,
                     updated_at = NOW()
               WHERE policy_id = $1`,
        values: [created.policyId, state, ACTOR],
      },
    ],
    { swallow: false },
  )
}

describe.skipIf(!hasPgConfig || !canCleanUp)('assignment dead-end supersede — live PG (TASK-1771)', () => {
  beforeAll(async () => {
    baseline.awaitingTerminal = await listAwaitingTerminalApplicationIds()

    const profiles = await runGreenhousePostgresQuery<{ profile_id: string; candidate_facet_id: string }>(
      `SELECT ip.profile_id, cf.candidate_facet_id
       FROM greenhouse_core.identity_profiles ip
       JOIN greenhouse_hiring.candidate_facet cf ON cf.identity_profile_id = ip.profile_id
       WHERE ip.active = true
         AND ip.canonical_email ILIKE '%@efeonce.org'
         AND ip.canonical_email ~* '^(task-[0-9]+|qa\\.careers\\+)'
         -- TASK-1739 — el patron de arriba LOCALIZA los fixtures sembrados; esta linea es la
         -- GUARDA. La propia herramienta del dominio (hiring:data:mark-synthetic) advierte que
         -- "la senal de nombre es notoriamente falible y por eso no se usa": el 2026-08-23 ese
         -- patron matcheaba 3 identidades y 2 seguian marcadas real, o sea que el gate podia
         -- correr sobre gente que el sistema considera real. Un nombre no puede vencer esto.
         AND ip.data_origin <> 'real'
       ORDER BY ip.profile_id LIMIT 1`,
    )

    // Falla FUERTE: sin identidad sintética este archivo no corre sobre una persona real.
    expect(profiles.length).toBe(1)

    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'LIVE-TEST AM (dead-end supersede)',
        dataOrigin: 'smoke_test',
      },
      ACTOR,
    )

    created.demandId = demand.demandId

    const opening = await createHiringOpening(
      {
        demandId: demand.demandId,
        internalTitle: 'LIVE-TEST opening (dead-end supersede)',
        dataOrigin: 'smoke_test',
      },
      ACTOR,
    )

    created.openingId = opening.openingId

    const application = await createHiringApplication(
      {
        openingId: opening.openingId,
        identityProfileId: profiles[0].profile_id,
        candidateFacetId: profiles[0].candidate_facet_id,
        stage: 'shortlisted',
      },
      ACTOR,
    )

    created.applicationId = application.applicationId

    // La policy nace en `draft` con `on_stage_entry` — el estado en que NACE toda policy y la
    // causa más frecuente del callejón del carril automático.
    const policyRows = await runGreenhousePostgresQuery<{ policy_id: string }>(
      `INSERT INTO greenhouse_hiring.hiring_opening_assessment_policy
         (opening_id, template_id, mode, state, trigger_stage, time_limit_minutes,
          template_content_digest, volume_cap_per_window, volume_window_minutes, created_by)
       VALUES ($1, 'atpl-account-manager-l2', 'on_stage_entry', 'draft', 'shortlisted', 45,
               'live-test-digest-1771', 10, 60, $2)
       RETURNING policy_id`,
      [opening.openingId, ACTOR],
    )

    created.policyId = policyRows[0].policy_id
  })

  afterAll(async () => {
    const assignmentIds = created.applicationId
      ? await runGreenhousePostgresQuery<{ assignment_id: string }>(
          `SELECT assignment_id FROM greenhouse_hiring.hiring_assessment_assignment WHERE application_id = $1`,
          [created.applicationId],
        ).catch(() => [])
      : []

    // Las instancias se recogen ANTES de borrar la postulación: `hiring_assessment` cae por
    // cascade, y con ella se perdería el `assessment_id` que es el `aggregate_id` del evento
    // `hiring.assessment.assigned`. Este gate no debería crear ninguna —el segundo test apaga la
    // policy justamente para eso— pero un evento de correo huérfano es demasiado caro para
    // dejarlo dependiendo de que ningún test futuro se equivoque.
    const assessmentIds = created.applicationId
      ? await runGreenhousePostgresQuery<{ assessment_id: string }>(
          `SELECT assessment_id FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1`,
          [created.applicationId],
        ).catch(() => [])
      : []

    // Orden obligatorio por FK: assignment → application → policy → opening → demand.
    // `candidate_facet` NO se toca: el fixture reusa facets vivas.
    await runAsOps([
      {
        text: `DELETE FROM greenhouse_hiring.hiring_assessment_assignment WHERE policy_id = $1`,
        values: [created.policyId],
      },
      {
        text: `DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
        values: [created.applicationId],
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
            created.applicationId,
            ...assignmentIds.map(row => row.assignment_id),
            ...assessmentIds.map(row => row.assessment_id),
            created.openingId,
            created.demandId,
            created.policyId,
          ].filter(Boolean),
        ],
      },
    ])

    // RESIDUO CERO EN LOS DOS EJES. Borrar lo creado no prueba que la base quedó igual: superseder
    // MUTA la vigencia de una fila, y una fila liberada mete su postulación en `awaiting_terminal`.
    // Si el teardown fallara parcialmente, esa señal subiría un punto para siempre y en silencio.
    if (baseline.awaitingTerminal) {
      const after = await listAwaitingTerminalApplicationIds()

      // (a) Ninguna postulación preexistente desapareció de la cola por culpa del fixture.
      expect([...baseline.awaitingTerminal].filter(id => !after.has(id))).toEqual([])

      // (b) La propia postulación del fixture no quedó adentro. Esta suite SÓLO muta filas suyas
      // —su demand, su opening, su policy, su postulación—, así que es la única que puede empujar
      // a la cola: lo que aparezca de más es de un archivo vecino y no es residuo de este gate.
      expect(after.has(created.applicationId)).toBe(false)

      // (c) Y el borrado ocurrió de verdad. Con la postulación fuera de la tabla, la contribución
      // del fixture a la señal de callejones es cero por construcción, sin comparar un total global.
      const leftovers = await runGreenhousePostgresQuery<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_application WHERE application_id = $1`,
        [created.applicationId],
      ).catch(() => [{ total: 0 }])

      expect(leftovers[0].total).toBe(0)

      // Y CERO eventos de correo sobrevivientes del fixture. El publisher corre cada 2 minutos
      // sobre esta misma base, así que un `hiring.assessment.assigned` huérfano no espera al
      // próximo `pnpm test`: sale solo.
      const survivors = await runGreenhousePostgresQuery<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM greenhouse_sync.outbox_events
          WHERE event_type LIKE 'hiring.assessment%'
            AND aggregate_id = ANY($1::text[])`,
        [[...assignmentIds.map(row => row.assignment_id), ...assessmentIds.map(row => row.assessment_id)]],
      ).catch(() => [{ total: 0 }])

      expect(survivors[0].total).toBe(0)
    }
  })

  it('el ciclo completo: la policy en `draft` bloquea, habilitarla permite liberar, y la postulación vuelve a la cola', async () => {
    // 1. El carril automático intenta y se bloquea: la clave queda ocupada.
    const blocked = await assignAssessmentFromPolicy({
      applicationId: created.applicationId,
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(blocked).toMatchObject({ status: 'blocked', reasonCode: 'policy_disabled' })

    const afterBlock = await readLedger()

    expect(afterBlock).toHaveLength(1)
    expect(afterBlock[0]).toMatchObject({ origin: 'stage_auto', attempt_seq: 1, outcome: 'blocked', superseded_at: null })

    const assignmentId = afterBlock[0].assignment_id

    // 2. La postulación DESAPARECIÓ de la cola de reconciliación: ése es el daño de la task.
    //    (Con la policy en `draft` el reader devuelve [] igual, así que se comprueba después de
    //    habilitarla, cuando la única razón de su ausencia puede ser la fila del ledger.)
    await setPolicyState('enabled')

    const awaitingWhileBlocked = await resolveApplicationsAwaitingAssignment(created.policyId)

    expect(awaitingWhileBlocked.map(row => row.applicationId)).not.toContain(created.applicationId)

    // 3. La cola de callejones NO lo muestra, y eso es CORRECTO: el fixture es obligatoriamente
    //    sintético (ISSUE-159) y el reader excluye procedencia no real. Las dos reglas chocan a
    //    propósito, y el choque prueba las dos mitades del diseño a la vez:
    //      · la exclusión funciona — por eso la métrica puede tener steady 0 y no nace amarilla;
    //      · y el conteo excluido lo DECLARA, en vez de que la fila desaparezca en silencio.
    const queue = await resolveAssignmentDeadEndsForPolicy(created.policyId)

    expect(queue.deadEnds).toHaveLength(0)
    expect(queue.excludedSynthetic).toBe(1)

    // 4. Pero el COMMAND sí opera sobre ella. Es la decisión del Slice 3 —la procedencia gobierna
    //    qué se MUESTRA y qué ALARMA, nunca qué puede hacer un humano autorizado sobre una fila
    //    concreta— y este gate es su consumidor más directo: si el command filtrara procedencia,
    //    esta verificación viva sería imposible de escribir sin fabricar sobre una persona real.

    const capBefore = await countAssignedInWindow(null, created.policyId, 60)

    // 5. El supersede gobernado: la causa (`policy_disabled`) ya no aplica.
    const result = await supersedeAssignmentDeadEnd({
      assignmentId,
      openingId: created.openingId,
      actorUserId: ACTOR,
    })

    expect(result).toMatchObject({ status: 'superseded', applicationId: created.applicationId, recoveryCount: 1 })

    // 6. LA BASE: `superseded_at` estampado, `outcome` y `outcome_reason` INTACTOS. Copiar
    //    `supersedeAssignmentsForAssessment` habría reescrito el outcome a `cancelled` y borrado
    //    la explicación del bloqueo.
    const afterSupersede = await readLedger()

    expect(afterSupersede).toHaveLength(1)
    expect(afterSupersede[0].superseded_at).not.toBeNull()
    expect(afterSupersede[0].outcome).toBe('blocked')
    expect(afterSupersede[0].outcome_reason).toBe('policy_disabled')
    expect(afterSupersede[0].attempt_seq).toBe(1)

    // 7. La recuperación SIRVIÓ: la postulación volvió al reader canónico. Sin esto, el supersede
    //    sería una escritura sin consecuencia observable.
    const awaitingAfter = await resolveApplicationsAwaitingAssignment(created.policyId)

    expect(awaitingAfter.map(row => row.applicationId)).toContain(created.applicationId)

    // 8. Y el cap de volumen NO se movió: superseder no des-envía ningún correo, así que no puede
    //    devolver presupuesto de blast radius.
    expect(await countAssignedInWindow(null, created.policyId, 60)).toBe(capBefore)

    // 9. Liberar dos veces es un no-op observable, no un doble efecto.
    const replay = await supersedeAssignmentDeadEnd({
      assignmentId,
      openingId: created.openingId,
      actorUserId: ACTOR,
    })

    expect(replay.status).toBe('already_superseded')
    expect(await readLedger()).toHaveLength(1)
  })

  it('la base sostiene el límite de autoridad: liberar la clave NO le abre un intento 2 al carril automático', async () => {
    // ⚠️ APAGAR PRIMERO NO ES DECORACIÓN. Con la clave liberada y la policy habilitada, este
    // intento resolvería `assigned` de verdad: crearía la instancia y publicaría
    // `hiring.assessment.assigned`, que es el evento del que cuelga el correo al candidato — y el
    // publisher del outbox corre cada 2 minutos sobre ESTA misma base. La primera versión de este
    // test declaraba en un comentario que apagaba la policy y no lo hacía: dejó un evento
    // `pending` apuntando a una instancia que el teardown ya había borrado. Un comentario no es
    // una guarda.
    await setPolicyState('draft')

    const retry = await assignAssessmentFromPolicy({
      applicationId: created.applicationId,
      policyId: created.policyId,
      origin: 'stage_auto',
      actorUserId: null,
      triggerStage: 'shortlisted',
    })

    expect(retry.status).toBe('blocked')

    // El casillero quedó vacío, pero el `CHECK (origin = 'manual' OR attempt_seq = 1)` sigue
    // gobernando: la automatización reintenta en el intento 1, nunca en el 2. Es la diferencia
    // exacta entre esta task y TASK-1755.
    const ledger = await readLedger()

    expect(ledger.every(row => row.attempt_seq === 1)).toBe(true)
    expect(ledger.filter(row => row.superseded_at === null)).toHaveLength(1)

    // Y la prueba dura de que este gate no le puede mandar un correo a nadie: cero instancias.
    const instances = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment WHERE application_id = $1`,
      [created.applicationId],
    )

    expect(instances[0].total).toBe(0)
  })
})
