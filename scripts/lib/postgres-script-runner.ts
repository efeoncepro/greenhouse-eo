import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv, type PostgresProfile } from './load-greenhouse-tool-env'

export const runPostgresSqlFile = async ({
  sqlPath,
  successMessage,
  profile
}: {
  sqlPath: string
  successMessage: string
  profile: PostgresProfile
}) => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile(profile)

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  try {
    const resolvedSqlPath = path.resolve(process.cwd(), sqlPath)
    const sql = await readFile(resolvedSqlPath, 'utf8')

    await runGreenhousePostgresQuery(sql)
    console.log(successMessage)
  } finally {
    await closeGreenhousePostgres()
  }
}
