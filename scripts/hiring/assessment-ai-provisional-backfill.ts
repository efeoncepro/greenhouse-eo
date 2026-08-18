import 'server-only'

import { backfillSubmittedAssessmentAiScoringRuns } from '@/lib/hiring/assessment/ai'

const valueOf = (flag: string): string | null => {
  const index = process.argv.indexOf(flag)

  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')
  const assessmentId = valueOf('--assessment-id')
  const actorUserId = valueOf('--actor')
  const reason = valueOf('--reason')
  const idempotencyKey = valueOf('--idempotency-key')
  const limit = Math.max(1, Math.min(25, Number(valueOf('--limit') ?? 10) || 10))

  if (!actorUserId || !reason || !idempotencyKey) {
    throw new Error('Faltan --actor, --reason o --idempotency-key.')
  }

  const result = await backfillSubmittedAssessmentAiScoringRuns({
    dryRun: !apply,
    assessmentId: assessmentId ?? undefined,
    actorUserId,
    reason,
    idempotencyKey,
    limit,
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error('ASSESSMENT AI PROVISIONAL BACKFILL FAIL:', error instanceof Error ? error.message : error)
  process.exit(1)
})
