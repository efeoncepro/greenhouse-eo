/** Preview by default. --apply revises only the nine verified TASK-1604 SEO drafts, atomically.
 * The fixed manifest binds original IDs/content to the operator-approved local revision.
 * Never activates questions, creates assignments, or sends communication.
 */
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { getQuestionById } from '@/lib/hiring/assessment/store'
import { questionContentDigest, reviseUnpublishedQuestion } from '@/lib/hiring/assessment/question-revisions'
import { SEO_SPECIALIST_SENIOR_PACK } from './task-1604-role-assessment-pack'
import manifest from './task-1604-seo-revision-manifest.json'

const ACTOR = 'codex:TASK-1604:seo-editorial-revision'
const REASON = 'Afinación editorial autorizada por Julio Reyes en conversación 2026-09-13; evidencia docs/audits/hiring/2026-09-13-seo-assignment-readiness.md. No acredita calibración independiente ni activación.'

async function main() {
  const args = process.argv.slice(2)

  if (args.some(arg => arg !== '--apply')) throw new Error('unsupported_argument')
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const result = await withGreenhousePostgresTransaction(async client => {
    if (manifest.length !== 9 || new Set(manifest.map(row => row.key)).size !== 9) throw new Error('invalid_manifest')
    const prepared = []

    for (const row of manifest) {
      const source = await getQuestionById(row.sourceQuestionId, client)
      const question = SEO_SPECIALIST_SENIOR_PACK.questions.find(item => item.key === row.key)

      if (!source || !question || questionContentDigest(source) !== row.expectedSourceDigest) throw new Error('source_drift')
      const targetDigest = questionContentDigest({ ...question, competencyId: source.competencyId, options: question.options ?? [], answerKey: question.answerKey ?? {}, rubric: question.rubric ?? {} })

      if (targetDigest !== row.targetDigest) throw new Error('target_drift')
      prepared.push({ row, source, question })
    }

    const results = []

    for (const { row, source, question } of prepared) {
      const revised = args.includes('--apply')
        ? await reviseUnpublishedQuestion({ sourceQuestionId: row.sourceQuestionId, expectedSourceDigest: row.expectedSourceDigest, question, reason: REASON }, ACTOR, client)
        : source

      results.push({ key: row.key, sourceQuestionId: row.sourceQuestionId, questionId: revised.questionId, status: revised.status, requiresRevision: row.expectedSourceDigest !== row.targetDigest, targetDigest: row.targetDigest })
    }

    return { mode: args.includes('--apply') ? 'applied' : 'preview', actor: ACTOR, questions: results }
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch(() => { console.error('SEO revision aborted; inspect source/target manifest and database access.'); process.exitCode = 1 }).finally(closeGreenhousePostgres)
