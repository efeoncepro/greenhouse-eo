import { closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { reconcileTalentPoolProjection } from '../../src/lib/hiring/talent-pool/projection'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

const apply = process.argv.includes('--apply')

if (apply && process.env.TALENT_POOL_BACKFILL_CONFIRM !== 'TASK-1723') {
  throw new Error('Apply bloqueado: define TALENT_POOL_BACKFILL_CONFIRM=TASK-1723.')
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  try {
    const result = await reconcileTalentPoolProjection({ apply, actorUserId: 'task-1723-backfill' })

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Talent Pool backfill failed.')
  process.exitCode = 1
})
