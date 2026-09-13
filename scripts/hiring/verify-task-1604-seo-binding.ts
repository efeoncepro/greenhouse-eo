/** Read-only exact pack/policy verification. No assignment and no candidate data. */
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getQuestionById } from '@/lib/hiring/assessment/store'
import { questionContentDigest } from '@/lib/hiring/assessment/question-revisions'
import { PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL, summarizeQuestionnaire, type QuestionnaireRow } from '@/lib/hiring/assessment/questionnaire'
import { resolveActivePolicyForOpening } from '@/lib/hiring/assessment/assignment-policy/readers'
import { SEO_SPECIALIST_SENIOR_PACK } from './task-1604-role-assessment-pack'
import manifest from './task-1604-seo-revision-manifest.json'

async function main() {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')
  const templates = await runGreenhousePostgresQuery<{ template_id: string }>('SELECT template_id FROM greenhouse_hiring.hiring_assessment_template WHERE name=$1 AND status=\'active\'', [SEO_SPECIALIST_SENIOR_PACK.template.name])

  if (templates.length !== 1) throw new Error('ambiguous_template')
  const templateId = templates[0].template_id
  const rows = await runGreenhousePostgresQuery<QuestionnaireRow>(PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL, [templateId])
  const summary = summarizeQuestionnaire(rows)
  const targetDigests = new Set(manifest.map(row => row.targetDigest))

  if (summary.questionCount !== 9 || summary.moduleCount !== 6 || summary.emptyModuleCount !== 0) throw new Error('incomplete_pack')
  const questions = []

  for (const row of rows) {
    const question = await getQuestionById(String(row.question_id))

    if (!question || question.status !== 'active' || !targetDigests.delete(questionContentDigest(question))) throw new Error('unexpected_question')
    const expectedModule = SEO_SPECIALIST_SENIOR_PACK.template.modules.find(item => item.competencyKey === row.competency_key)

    if (!expectedModule || Number(row.weight) !== expectedModule.weight || row.target_level !== expectedModule.targetLevel) throw new Error('unexpected_module')
    questions.push({ questionId: question.questionId, competencyKey: row.competency_key, weight: Number(row.weight) })
  }

  if (targetDigests.size !== 0) throw new Error('missing_questions')
  const policy = await resolveActivePolicyForOpening('opng-262f0d6d-f139-4355-9017-165cbab54b9c')
  const enabledAndExact = policy?.state === 'enabled' && policy.mode === 'manual' && policy.templateId === templateId && policy.timeLimitMinutes === 75 && policy.templateContentDigest === summary.digest

  if (process.argv.includes('--expect-enabled') && !enabledAndExact) throw new Error('binding_not_enabled_and_exact')
  console.log(JSON.stringify({ templateId, ...summary, questions, policy, enabledAndExact }, null, 2))
}

main().catch(() => { console.error('SEO binding verification failed; inspect exact template, bank and policy.'); process.exitCode = 1 }).finally(closeGreenhousePostgres)
