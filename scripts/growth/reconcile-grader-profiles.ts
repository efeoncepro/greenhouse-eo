/** TASK-1863. Explicit operator reconciliation. Dry-run by default; never rewrites measurements. */
import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { query, withTransaction, closeGreenhousePostgres } from '../../src/lib/db'
import { publishOutboxEvent } from '../../src/lib/sync/publish-event'

const argument = (name: string) =>
  process.argv
    .find(arg => arg.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')

async function main() {
  loadGreenhouseToolEnv()

  const organizationId = argument('organization'),
    keep = argument('keep-profile'),
    actor = argument('actor')

  const archive = process.argv
    .filter(arg => arg.startsWith('--archive-profile='))
    .map(arg => arg.slice('--archive-profile='.length))
    .sort()

  if (!organizationId || !keep) throw new Error('organization_and_keep_profile_required')
  const readSql = `SELECT profile_id,brand_name,website_url FROM greenhouse_growth.grader_profiles WHERE organization_id=$1 AND status='active' ORDER BY created_at DESC,profile_id`

  const rows = await query<{ profile_id: string; brand_name: string; website_url: string | null }>(readSql, [
    organizationId
  ])

  const proposed = rows
    .filter(row => row.profile_id !== keep)
    .map(row => row.profile_id)
    .sort()

  if (!rows.some(row => row.profile_id === keep)) throw new Error('retained_profile_not_active')
  console.log(
    JSON.stringify({
      mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
      organizationId,
      keep,
      archive: proposed,
      historicalRuns: 'unchanged'
    })
  )
  if (!process.argv.includes('--apply')) return
  if (!actor || JSON.stringify(archive) !== JSON.stringify(proposed))
    throw new Error('explicit_actor_and_exact_archive_allowlist_required')
  await withTransaction(async client => {
    const fresh = await client.query<{ profile_id: string }>(readSql + ' FOR UPDATE', [organizationId])

    if (!fresh.rows.some(row => row.profile_id === keep)) throw new Error('retained_profile_not_active')
    if (
      JSON.stringify(
        fresh.rows
          .filter(row => row.profile_id !== keep)
          .map(row => row.profile_id)
          .sort()
      ) !== JSON.stringify(archive)
    )
      throw new Error('profile_configuration_changed')
    await client.query(
      `UPDATE greenhouse_growth.grader_profiles SET status='archived',updated_at=now() WHERE organization_id=$1 AND profile_id=ANY($2::text[]) AND status='active'`,
      [organizationId, archive]
    )
    await publishOutboxEvent(
      {
        aggregateType: 'growth_ai_visibility_profile',
        aggregateId: keep,
        eventType: 'growth.ai_visibility.profile_reconciled',
        payload: { version: 1, organizationId, retainedProfileId: keep, archivedProfileIds: archive, actor }
      },
      client
    )
  })
  const verified = await query<{ profile_id: string }>(readSql, [organizationId])

  if (verified.length !== 1 || verified[0].profile_id !== keep) throw new Error('reconciliation_readback_failed')
  console.log(JSON.stringify({ applied: true, activeProfiles: verified.length, historicalRuns: 'unchanged' }))
}

main()
  .catch(error => {
    console.error(
      error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'profile_reconciliation_failed'
    )
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
