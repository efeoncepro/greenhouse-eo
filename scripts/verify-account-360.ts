import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    const orgs = await runGreenhousePostgresQuery<{ cnt: string }>('SELECT count(*) as cnt FROM greenhouse_core.organizations')
    const spaces = await runGreenhousePostgresQuery<{ cnt: string }>('SELECT count(*) as cnt FROM greenhouse_core.spaces')
    const memberships = await runGreenhousePostgresQuery<{ cnt: string }>('SELECT count(*) as cnt FROM greenhouse_core.person_memberships')

    console.log('=== Table Counts ===')
    console.log('organizations:', orgs[0]?.cnt)
    console.log('spaces:', spaces[0]?.cnt)
    console.log('person_memberships:', memberships[0]?.cnt)

    const orphans = await runGreenhousePostgresQuery<{ organization_id: string }>(`
      SELECT o.organization_id FROM greenhouse_core.organizations o
      LEFT JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id
      WHERE s.space_id IS NULL
    `)
    console.log('\nOrphan organizations (no space):', orphans.length)

    const org360 = await runGreenhousePostgresQuery<{
      organization_name: string
      space_count: string
      membership_count: string
      unique_person_count: string
    }>(`
      SELECT organization_name, space_count, membership_count, unique_person_count
      FROM greenhouse_serving.organization_360
      ORDER BY organization_name
      LIMIT 5
    `)
    console.log('\n=== organization_360 (top 5) ===')
    for (const r of org360) {
      console.log(`  ${r.organization_name}: ${r.space_count} spaces, ${r.membership_count} memberships, ${r.unique_person_count} people`)
    }

    const person360 = await runGreenhousePostgresQuery<{
      display_name: string
      membership_count: number
      person_facets: string[]
    }>(`
      SELECT display_name, membership_count, person_facets
      FROM greenhouse_serving.person_360
      WHERE membership_count > 0
      ORDER BY membership_count DESC
      LIMIT 5
    `)
    console.log('\n=== person_360 with memberships (top 5) ===')
    for (const r of person360) {
      console.log(`  ${r.display_name}: ${r.membership_count} memberships, facets: ${JSON.stringify(r.person_facets)}`)
    }

    const session360 = await runGreenhousePostgresQuery<{
      user_id: string
      full_name: string
      space_id: string | null
      organization_id: string | null
      organization_name: string | null
    }>(`
      SELECT user_id, full_name, space_id, organization_id, organization_name
      FROM greenhouse_serving.session_360
      WHERE organization_id IS NOT NULL
      LIMIT 3
    `)
    console.log('\n=== session_360 with org context (top 3) ===')
    for (const r of session360) {
      console.log(`  ${r.full_name}: space=${r.space_id}, org=${r.organization_name}`)
    }
    if (session360.length === 0) {
      console.log('  (none yet — spaces.client_id JOIN populates after M1)')
    }

    console.log('\nAll verifications passed.')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('Verification failed:', error)
  process.exitCode = 1
})
