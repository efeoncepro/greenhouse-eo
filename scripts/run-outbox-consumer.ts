import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { publishPendingOutboxEvents } = await import('@/lib/sync/outbox-consumer')
  const result = await publishPendingOutboxEvents({ batchSize: 200 })

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    const { closeGreenhousePostgres } = await import('@/lib/postgres/client')

    await closeGreenhousePostgres()
  })
