/** Operator-authorized SEO pilot, 2026-09-13. Preview by default; --apply activates exact reviewed versions.
 * Approval evidence: docs/audits/hiring/2026-09-13-seo-assignment-readiness.md.
 * Independent calibration remains pending. No assignment or communication is performed.
 */
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { getQuestionById, transitionQuestionStatus } from '@/lib/hiring/assessment/store'
import { questionContentDigest } from '@/lib/hiring/assessment/question-revisions'
import manifest from './task-1604-seo-revision-manifest.json'

const ACTOR = 'user-efeonce-admin-julio-reyes'

async function main() {
  const args = process.argv.slice(2)

  if (args.some(arg => arg !== '--apply')) throw new Error('unsupported_argument')
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const result = await withGreenhousePostgresTransaction(async client => {
    const actor = await client.query('SELECT user_id FROM greenhouse_core.client_users WHERE user_id=$1 AND active=TRUE', [ACTOR])

    if (actor.rows.length !== 1) throw new Error('inactive_actor')
    const prepared = []

    for (const row of manifest) {
      const lineage = (await client.query('SELECT revision_question_id FROM greenhouse_hiring.hiring_question_revision WHERE source_question_id=$1', [row.sourceQuestionId])).rows[0]
      const id = lineage?.revision_question_id ?? row.sourceQuestionId

      await client.query('SELECT question_id FROM greenhouse_hiring.hiring_question WHERE question_id=$1 FOR UPDATE', [id])
      const question = await getQuestionById(id, client)

      if (!question || questionContentDigest(question) !== row.targetDigest || !['sme_review', 'active'].includes(question.status)) throw new Error('reviewed_content_drift')
      prepared.push({ key: row.key, question })
    }

    if (prepared.length !== 9 || new Set(prepared.map(item => item.question.questionId)).size !== 9) throw new Error('incomplete_pack')
    const questions = []

    for (const { key, question } of prepared) {
      const updated = args.includes('--apply') && question.status !== 'active'
        ? await transitionQuestionStatus(question.questionId, 'active', ACTOR, client) : question

      questions.push({ key, questionId: updated.questionId, status: updated.status, digest: questionContentDigest(updated) })
    }

    return { mode: args.includes('--apply') ? 'applied' : 'preview', actor: ACTOR, approval: 'manual-pilot-calibration-pending-2026-09-13', questions }
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch(() => { console.error('SEO pilot activation aborted; verify exact reviewed versions and database access.'); process.exitCode = 1 }).finally(closeGreenhousePostgres)
