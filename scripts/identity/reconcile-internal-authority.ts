/** Operator reconciliation; dry-run unless --apply. No identity creation, grants, or historical event replay. */
import { parseArgs } from 'node:util'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

async function main() {
  const { values } = parseArgs({
    options: {
      'binding-id': { type: 'string' },
      'actor-id': { type: 'string' },
      reason: { type: 'string' },
      apply: { type: 'boolean', default: false }
    },
    strict: true
  })

  const bindingId = values['binding-id'],
    actorId = values['actor-id'],
    reason = values.reason

  if (!bindingId || !actorId || !reason) throw new Error('arguments')
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')
  const { getTenantAccessRecordFromPostgresByUserId } = await import('../../src/lib/tenant/access')
  const { can } = await import('../../src/lib/entitlements/runtime')
  const { reconcileInternalAuthority } = await import('../../src/lib/identity/internal-access/reconcile')

  const result = await reconcileInternalAuthority(
    { bindingId, actorId, reason, dryRun: !values.apply },
    {
      authorize: async (id, capability) => {
        if (id !== actorId) return false
        const actor = await getTenantAccessRecordFromPostgresByUserId(id)

        
return Boolean(
          actor &&
            actor.active &&
            actor.status === 'active' &&
            actor.tenantType === 'efeonce_internal' &&
            can({ ...actor, memberId: actor.memberId ?? undefined }, capability, 'execute', 'tenant')
        )
      }
    }
  )

  console.log(JSON.stringify({ mode: values.apply ? 'apply' : 'dry-run', ...result }))
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error('Internal authority reconciliation failed; details suppressed.')
    process.exit(1)
  })
