import { reconcileTalentPoolProjection } from '@/lib/hiring/talent-pool/projection'

type Reconcile = typeof reconcileTalentPoolProjection

const projectionEnabled = () =>
  process.env.HIRING_TALENT_POOL_PROJECTION_ENABLED?.trim().toLowerCase() === 'true'

export const runTalentPoolReconcile = async ({
  enabled = projectionEnabled(),
  reconcile = reconcileTalentPoolProjection
}: { enabled?: boolean; reconcile?: Reconcile } = {}) => {
  if (!enabled) return { status: 'skipped' as const, reason: 'flag_off' as const }

  const result = await reconcile({
    apply: true,
    actorUserId: 'ops-worker:talent-pool-reconcile'
  })

  return { status: 'reconciled' as const, ...result }
}
