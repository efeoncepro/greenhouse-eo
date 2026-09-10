/**
 * Autoría gobernada del pack TASK-1604.
 *
 * Default: valida el contrato local y no conecta a Postgres.
 * --apply-questions: crea de forma idempotente las preguntas SEO y las lleva sólo a sme_review.
 * --materialize-seo-template: crea la plantilla únicamente cuando el banco activo tiene cobertura suficiente.
 * --readback: lee catálogo, preguntas y templates; no muta.
 */
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  createQuestion,
  createTemplate,
  listQuestions,
  transitionQuestionStatus,
} from '@/lib/hiring/assessment/store'

import {
  ART_DIRECTOR_SENIOR_PACK,
  SEO_SPECIALIST_SENIOR_PACK,
  TASK_1604_ROLE_ASSESSMENT_PACKS,
  resolveReusableTemplateId,
  validateTask1604RoleAssessmentPacks,
} from './task-1604-role-assessment-pack'

const ACTOR = 'codex:TASK-1604:role-assessment-authoring'

const NEW_COMPETENCY_KEYS = [
  'seo_technical_strategy',
  'search_content_aeo',
  'search_measurement',
  'art_direction',
  'visual_systems',
  'creative_production',
] as const

const OWNER_USER_IDS = ['user-efeonce-admin-julio-reyes', 'user-efeonce-internal-daniela-ferreira'] as const

const OPENING_SOURCE_REFS = [
  'efeonce-hiring-seo-specialist-senior-20260909-v1',
  'efeonce-hiring-art-director-senior-20260909-v1',
] as const

let databaseLoaded = false

const loadDb = () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')
  databaseLoaded = true
}

const findTemplate = async (input: typeof SEO_SPECIALIST_SENIOR_PACK.template): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{
    template_id: string
    role_hint: string | null
    modules: Array<{ competencyKey: string; targetLevel: string | null; weight: number }>
  }>(
    `SELECT t.template_id,
            t.role_hint,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'competencyKey', c.key,
                  'targetLevel', m.target_level,
                  'weight', m.weight::double precision
                )
                ORDER BY c.key
              ) FILTER (WHERE m.module_id IS NOT NULL),
              '[]'::jsonb
            ) AS modules
     FROM greenhouse_hiring.hiring_assessment_template t
     LEFT JOIN greenhouse_hiring.hiring_assessment_template_module m ON m.template_id = t.template_id
     LEFT JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = m.competency_id
     WHERE t.name = $1 AND t.status = 'active'
     GROUP BY t.template_id, t.role_hint, t.created_at
     ORDER BY t.created_at`,
    [input.name],
  )

  return resolveReusableTemplateId(
    input,
    rows.map(row => ({ templateId: row.template_id, roleHint: row.role_hint, modules: row.modules })),
  )
}

const assertCompetenciesAvailable = async (): Promise<void> => {
  const keys = Array.from(
    new Set(TASK_1604_ROLE_ASSESSMENT_PACKS.flatMap(pack => pack.template.modules.map(module => module.competencyKey))),
  )

  const rows = await runGreenhousePostgresQuery<{ key: string }>(
    `SELECT key
     FROM greenhouse_hiring.hiring_competency
     WHERE key = ANY($1::text[]) AND status = 'active'`,
    [keys],
  )

  const found = new Set(rows.map(row => row.key))
  const missing = keys.filter(key => !found.has(key))

  if (missing.length) throw new Error(`Missing active competencies: ${missing.join(', ')}`)
}

const applyQuestions = async () => {
  await assertCompetenciesAvailable()
  const created: string[] = []
  const reused: Array<{ questionId: string; status: string }> = []

  for (const input of SEO_SPECIALIST_SENIOR_PACK.questions) {
    const matches = await listQuestions({ competencyKey: input.competencyKey, level: input.level, limit: 200 })
    const existing = matches.find(question => question.prompt === input.prompt && question.status !== 'retired')

    if (existing) {
      if (existing.status === 'draft') {
        const reviewed = await transitionQuestionStatus(existing.questionId, 'sme_review', ACTOR)

        reused.push({ questionId: reviewed.questionId, status: reviewed.status })
      } else {
        reused.push({ questionId: existing.questionId, status: existing.status })
      }

      continue
    }

    const createdQuestion = await createQuestion(input, ACTOR)
    const reviewed = await transitionQuestionStatus(createdQuestion.questionId, 'sme_review', ACTOR)

    created.push(reviewed.questionId)
  }

  return { created, reused, expected: SEO_SPECIALIST_SENIOR_PACK.questions.length }
}

const materializeSeoTemplate = async () => {
  await assertCompetenciesAvailable()

  const coverage = await runGreenhousePostgresQuery<{ key: string; active_count: number }>(
    `SELECT c.key, COUNT(q.question_id)::int AS active_count
     FROM greenhouse_hiring.hiring_competency c
     LEFT JOIN greenhouse_hiring.hiring_question q
       ON q.competency_id = c.competency_id
      AND q.level = 'avanzado'
      AND q.status = 'active'
      AND q.prompt = ANY($2::text[])
     WHERE c.key = ANY($1::text[])
     GROUP BY c.key`,
    [
      SEO_SPECIALIST_SENIOR_PACK.template.modules.map(module => module.competencyKey),
      SEO_SPECIALIST_SENIOR_PACK.questions.map(question => question.prompt),
    ],
  )

  const counts = new Map(coverage.map(row => [row.key, Number(row.active_count)]))

  const gaps = SEO_SPECIALIST_SENIOR_PACK.template.modules.flatMap(module => {
    const required = module.weight >= 20 ? 2 : 1
    const actual = counts.get(module.competencyKey) ?? 0

    return actual >= required ? [] : [{ competencyKey: module.competencyKey, required, actual }]
  })

  if (gaps.length) {
    throw new Error(`SEO template cannot be materialized before SME activation: ${JSON.stringify(gaps)}`)
  }

  const current = await findTemplate(SEO_SPECIALIST_SENIOR_PACK.template)

  if (current) return { templateId: current, outcome: 'reused' }

  const template = await createTemplate(SEO_SPECIALIST_SENIOR_PACK.template, ACTOR)

  return { templateId: template.templateId, outcome: 'created' }
}

const readback = async () => {
  const competencies = await runGreenhousePostgresQuery<{
    key: string
    name: string
    category: string
    status: string
    description: string
  }>(
    `SELECT key, name, category, status, description
     FROM greenhouse_hiring.hiring_competency
     WHERE key = ANY($1::text[])
     ORDER BY key`,
    [NEW_COMPETENCY_KEYS],
  )

  const questionRows = await runGreenhousePostgresQuery<{ status: string; count: number }>(
    `SELECT q.status, COUNT(*)::int AS count
     FROM greenhouse_hiring.hiring_question q
     WHERE q.created_by = $1
     GROUP BY q.status
     ORDER BY q.status`,
    [ACTOR],
  )

  const templates = await runGreenhousePostgresQuery<{ template_id: string; name: string; status: string }>(
    `SELECT template_id, name, status
     FROM greenhouse_hiring.hiring_assessment_template
     WHERE name = ANY($1::text[])
     ORDER BY name`,
    [TASK_1604_ROLE_ASSESSMENT_PACKS.map(pack => pack.template.name)],
  )

  const owners = await runGreenhousePostgresQuery<{
    user_id: string
    display_name: string
    role_title: string
    status: string
  }>(
    `SELECT u.user_id, m.display_name, m.role_title, u.status
     FROM greenhouse_core.client_users u
     JOIN greenhouse_core.members m ON m.member_id = u.member_id
     WHERE u.user_id = ANY($1::text[])
       AND u.active = TRUE
       AND m.active = TRUE
     ORDER BY u.user_id`,
    [OWNER_USER_IDS],
  )

  const openings = await runGreenhousePostgresQuery<{
    opening_id: string
    public_id: string
    demand_id: string
    publication_source_ref: string
    public_title: string
    owner_user_id: string
    visibility: string
    publication_status: string
    status: string
    data_origin: string
    demand_data_origin: string
    published_at: string | null
    public_compensation_band: string | null
    content_version: number | null
    eligible_country_count: number
    policy_count: number
    assessment_count: number
  }>(
    `SELECT o.opening_id,
            o.public_id,
            o.demand_id,
            o.publication_source_ref,
            o.public_title,
            o.owner_user_id,
            o.visibility,
            o.publication_status,
            o.status,
            o.data_origin,
            d.data_origin AS demand_data_origin,
            o.published_at,
            o.public_compensation_band,
            CASE WHEN jsonb_typeof(o.public_content_json) = 'object'
              THEN (o.public_content_json->>'version')::int ELSE NULL END AS content_version,
            COALESCE(cardinality(o.public_remote_eligible_countries), 0)::int AS eligible_country_count,
            (SELECT COUNT(*)::int
             FROM greenhouse_hiring.hiring_opening_assessment_policy p
             WHERE p.opening_id = o.opening_id AND p.state <> 'disabled') AS policy_count,
            (SELECT COUNT(*)::int
             FROM greenhouse_hiring.hiring_application a
             JOIN greenhouse_hiring.hiring_assessment asm ON asm.application_id = a.application_id
             WHERE a.opening_id = o.opening_id) AS assessment_count
     FROM greenhouse_hiring.hiring_opening o
     JOIN greenhouse_hiring.talent_demand d ON d.demand_id = o.demand_id
     WHERE o.publication_source_ref = ANY($1::text[])
     ORDER BY o.publication_source_ref`,
    [OPENING_SOURCE_REFS],
  )

  return {
    competencies,
    authoredQuestionsByStatus: questionRows,
    templates,
    owners,
    openings,
    expected: {
      competencies: NEW_COMPETENCY_KEYS.length,
      seoQuestionsInSmeReview: SEO_SPECIALIST_SENIOR_PACK.questions.length,
      seoTemplate: 'absent until individual SME activation provides complete active coverage',
      artTemplate: 'not persisted because interviewer_scorecard runtime has no template binding',
      artInterviewGuideItems: ART_DIRECTOR_SENIOR_PACK.interviewGuide.length,
    },
  }
}

const main = async () => {
  validateTask1604RoleAssessmentPacks()
  const args = new Set(process.argv.slice(2))
  const actions = ['--apply-questions', '--materialize-seo-template', '--readback'].filter(action => args.has(action))

  if (actions.length > 1) throw new Error('Choose exactly one action per run.')

  if (!actions.length) {
    console.log(
      JSON.stringify(
        {
          outcome: 'validated',
          databaseMutation: false,
          packs: TASK_1604_ROLE_ASSESSMENT_PACKS.map(pack => ({
            key: pack.key,
            method: pack.method,
            weights: pack.template.modules.reduce((sum, module) => sum + module.weight, 0),
            questions: pack.questions.length,
            interviewGuideItems: pack.interviewGuide.length,
            timeboxMinutes: pack.timeboxMinutes,
            materialization: pack.materialization,
          })),
        },
        null,
        2,
      ),
    )

    return
  }

  loadDb()

  if (args.has('--apply-questions')) {
    console.log(JSON.stringify({ outcome: 'questions_authored', ...(await applyQuestions()) }, null, 2))

    return
  }

  if (args.has('--materialize-seo-template')) {
    console.log(JSON.stringify({ action: 'seo_template_materialization', ...(await materializeSeoTemplate()) }, null, 2))

    return
  }

  console.log(JSON.stringify({ outcome: 'readback', ...(await readback()) }, null, 2))
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (databaseLoaded) await closeGreenhousePostgres()
  })
