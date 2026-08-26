/**
 * TASK-1751 — Seed determinista para capturar la fase `submit_grace` con GVC.
 *
 * La fase de gracia NO se alcanza navegando: exige un assessment con `started_at` ya pasado el
 * `answerDeadline` y todavía antes del `closeDeadline`. Es dato, no UI.
 *
 * 🔴 ESCRIBE EN LA CLOUD SQL COMPARTIDA por dev, staging y producción. Por eso:
 *   - el sujeto se deriva con `resolveLiveTestCandidateFixture`, NUNCA "el primer perfil activo"
 *     (ISSUE-159: una vez se le fabricó una ficha de candidato a un colaborador real);
 *   - todo lo que crea nace con `data_origin = 'smoke_test'` declarado, nunca inferido (TASK-1739);
 *   - la vacante nace DRAFT y jamás se publica;
 *   - `--cleanup` deja la base como estaba.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_seed-task-1751-gvc.ts
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_seed-task-1751-gvc.ts --cleanup
 */

import { assignCandidateTest } from '@/lib/hiring/assessment/instances'
import { resolveLiveTestCandidateFixture } from '@/lib/hiring/live-test-identity'
import { createHiringApplication, createHiringOpening, createTalentDemand } from '@/lib/hiring/store'
import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'

const ACTOR = 'user-agent-e2e-001'
const MARKER = 'GVC-1751 Assessment grace phase'
const SCOPE = 'task-1751-gvc'

/** Minutos del límite. La gracia es de 30 min, así que atrasamos el inicio lo justo para caer dentro. */
const TIME_LIMIT_MINUTES = 45
const MINUTES_INTO_GRACE = 10

const cleanup = async () => {
  const openings = await runGreenhousePostgresQuery<{ opening_id: string; demand_id: string }>(
    `SELECT opening_id, demand_id FROM greenhouse_hiring.hiring_opening WHERE internal_title = $1`,
    [MARKER],
  )

  for (const opening of openings) {
    // `hiring_assessment` cascadea desde la postulación; el borrado va en orden inverso a la creación.
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_hiring.hiring_application WHERE opening_id = $1`,
      [opening.opening_id],
    )
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`,
      [opening.opening_id],
    )
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`,
      [opening.demand_id],
    )
  }

  console.log(`[seed-1751] cleanup: ${openings.length} vacante(s) removida(s)`)
}

const seed = async () => {
  const fixture = await resolveLiveTestCandidateFixture(SCOPE)

  // Plantilla existente con al menos 2 preguntas: necesitamos el estado PARCIAL (guardadas < total),
  // que es donde vive el hallazgo — con faltantes el envío es imposible y el CTA no debe renderizarse.
  const templates = await runGreenhousePostgresQuery<{ template_id: string; questions: number }>(
    `SELECT t.template_id, COUNT(q.question_id)::int AS questions
       FROM greenhouse_hiring.hiring_assessment_template t
       JOIN greenhouse_hiring.hiring_assessment_template_module m ON m.template_id = t.template_id
       JOIN greenhouse_hiring.hiring_question q ON q.competency_id = m.competency_id
      GROUP BY t.template_id
     HAVING COUNT(q.question_id) >= 2
      LIMIT 1`,
  )

  const template = templates[0]

  if (!template) throw new Error('[seed-1751] no hay plantilla con 2+ preguntas; sembrar el banco primero.')

  // Helpers canónicos, nunca INSERT crudo: son los que aplican enums, defaults y `data_origin`.
  const demand = await createTalentDemand(
    {
      dataOrigin: 'smoke_test',
      stakeholderType: 'internal',
      engagementType: 'on_going',
      fulfillmentMode: 'internal_hire',
      demandOrigin: 'manual_internal',
      requestedRole: 'Content Creator',
      language: 'español',
      timezone: 'America/Santiago',
    },
    ACTOR,
  )

  const opening = await createHiringOpening(
    {
      dataOrigin: 'smoke_test',
      demandId: demand.demandId,
      internalTitle: MARKER,
      seniority: 'senior',
      budgetBand: 'INTERNO-NO-PUBLICABLE',
    },
    ACTOR,
  )

  const application = await createHiringApplication(
    {
      openingId: opening.openingId,
      identityProfileId: fixture.profileId,
      candidateFacetId: fixture.candidateFacetId,
      stage: 'shortlisted',
      source: 'manual',
    },
    ACTOR,
  )

  const { assessment, token } = await assignCandidateTest({
    applicationId: application.applicationId,
    templateId: template.template_id,
    timeLimitMinutes: TIME_LIMIT_MINUTES,
  }, ACTOR)

  // Atrasamos el arranque para caer DENTRO de la gracia: pasado el plazo de respuesta, antes del cierre.
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_hiring.hiring_assessment
        SET status = 'in_progress',
            started_at = clock_timestamp() - make_interval(mins => $2)
      WHERE assessment_id = $1`,
    [assessment.assessmentId, TIME_LIMIT_MINUTES + MINUTES_INTO_GRACE],
  )

  console.log('[seed-1751] listo. Exporta el token y corre la captura:\n')
  console.log(`  export TASK1751_GRACE_TOKEN='${token}'`)
  console.log('  pnpm fe:capture task1751-assessment-grace --env=local\n')
  console.log('  # y al terminar:')
  console.log('  pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_seed-task-1751-gvc.ts --cleanup')
}

const main = async () => {
  try {
    if (process.argv.includes('--cleanup')) await cleanup()
    else await seed()
  } finally {
    await closeGreenhousePostgres()
  }
}

void main()
