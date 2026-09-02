/** Read-only production ledger evidence; never reveals fields/PII or writes a submission. */
import { mkdirSync, writeFileSync } from 'node:fs'

import { getFormDefinitionByKey, getPublishedVersionBySlug, listDestinationsForVersion, getHostSurfaceById } from '@/lib/growth/forms/store'
import { runGreenhousePostgresQuery, closeGreenhousePostgres } from '@/lib/postgres/client'
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

async function main() {
  const definition = await getFormDefinitionByKey('18b228e9-106a-402e-a6f2-a8c5469e73d7')

  if (!definition) throw new Error('Missing form')
  const version = await getPublishedVersionBySlug(definition.slug)

  if (!version) throw new Error('Missing published version')
  const destinations = await listDestinationsForVersion(version.form_version_id)
  const surface = await getHostSurfaceById('fhsf-efeonce-content-marketing')

  const counts = await runGreenhousePostgresQuery(
    'SELECT status, count(*)::int AS count FROM greenhouse_growth.form_submission WHERE form_id=$1 GROUP BY status',
    [definition.form_id]
  )

  const evidence = {
    checkedAt: new Date().toISOString(), formId: definition.form_id, slug: definition.slug,
    version: version.form_version_id, versionNumber: version.version, status: definition.status,
    destinationCount: destinations.length, surfaceActive: surface?.status, counts
  }

  const phase = process.argv[2] === 'before' ? 'before' : 'after'
  const dir = '.captures/content-marketing/technical-closure'

  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/ledger-${phase}.json`, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
}

main().catch(() => { console.error('Ledger read failed; no data exposed'); process.exitCode = 1 }).finally(closeGreenhousePostgres)
