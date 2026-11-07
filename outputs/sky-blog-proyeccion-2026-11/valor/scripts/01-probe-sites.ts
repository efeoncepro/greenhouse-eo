/** Read-only: lists the Search Console properties visible to SKY's org connection token. */
import { loadGreenhouseToolEnv } from '../../../../scripts/lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '../../../../src/lib/postgres/client'

const ORG = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'

async function main() {
  loadGreenhouseToolEnv()
  const { getSearchConsoleConnection } = await import('../../../../src/lib/growth/search-console/connection-store')
  const { listSearchConsoleSitesForOrg } = await import('../../../../src/lib/growth/search-console/command')
  const c = await getSearchConsoleConnection(ORG)

  console.log(JSON.stringify({ status: c?.status, siteUrl: c?.siteUrl }))
  console.log(JSON.stringify(await listSearchConsoleSitesForOrg(ORG), null, 1))
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(closeGreenhousePostgres)
