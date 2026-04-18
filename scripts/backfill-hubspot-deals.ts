import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', override: false })
loadEnv()

const parseArgs = () => {
  const args = process.argv.slice(2)

  return {
    includeClosed: args.includes('--include-closed'),
    hubspotDealId: args.find(arg => arg.startsWith('--deal='))?.slice('--deal='.length) ?? null
  }
}

async function main() {
  const { includeClosed, hubspotDealId } = parseArgs()

  console.log('=== HubSpot Deals Canonical Backfill ===')
  console.log(`Started at: ${new Date().toISOString()}`)
  console.log(`Include closed: ${includeClosed}`)
  if (hubspotDealId) console.log(`Deal filter: ${hubspotDealId}`)
  console.log()

  const hasDbConfig = Boolean(
    process.env.GREENHOUSE_POSTGRES_DATABASE
    && process.env.GREENHOUSE_POSTGRES_USER
    && (process.env.GREENHOUSE_POSTGRES_PASSWORD || process.env.GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF)
    && (process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)
  )

  if (!hasDbConfig) {
    console.error(
      'ERROR: PostgreSQL runtime config is incomplete. Expected GREENHOUSE_POSTGRES_DATABASE, GREENHOUSE_POSTGRES_USER, password, and host or instance connection name.'
    )
    process.exit(1)
  }

  const { syncHubSpotDeals } = await import('../src/lib/hubspot/sync-hubspot-deals')

  const summary = await syncHubSpotDeals({
    includeClosed,
    hubspotDealIds: hubspotDealId ? [hubspotDealId] : []
  })

  console.log(`Source deals: ${summary.totalSourceDeals}`)
  console.log(`Created: ${summary.created}`)
  console.log(`Updated: ${summary.updated}`)
  console.log(`Skipped: ${summary.skipped}`)
  console.log(`Errors: ${summary.errors.length}`)

  if (summary.errors.length > 0) {
    console.log()
    console.log('Errors:')

    for (const error of summary.errors) {
      console.log(`- ${error}`)
    }
  }

  console.log()
  console.log(`Finished at: ${new Date().toISOString()}`)

  process.exit(summary.errors.length > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
