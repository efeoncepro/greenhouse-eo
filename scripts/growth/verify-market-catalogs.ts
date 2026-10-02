/** Free provider metadata readback. No paid tasks and no database writes. */
import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { getDataForSeoGoogleCatalog } from '../../src/lib/ai/dataforseo'
import { GROWTH_MARKET_REGISTRY, GROWTH_LANGUAGE_IDS } from '../../src/lib/growth/markets'

async function main() {
  loadGreenhouseToolEnv()

  const [locations, languages] = await Promise.all([
    getDataForSeoGoogleCatalog('locations'),
    getDataForSeoGoogleCatalog('ai_mode/languages')
  ])

  if (process.argv.includes('--catalog'))
    console.log(
      JSON.stringify({
        countries: locations.filter(row => row.location_type === 'Country' || row.location_code === 2630),
        languages
      })
    )

  const countries = Object.values(GROWTH_MARKET_REGISTRY).map(market => ({
    country: market.code,
    locationCode: market.locationCode,
    availability: market.locationCode === null ? 'unsupported' : 'catalogued',
    verified:
      market.locationCode === null
        ? !locations.some(row => row.country_iso_code === market.code)
        : locations.some(
            row =>
              row.location_code === market.locationCode &&
              row.country_iso_code === market.code &&
              row.location_code_parent === null
          )
  }))

  const locales = GROWTH_LANGUAGE_IDS.map(language => ({
    language,
    verified: languages.some(row => row.language_code === language)
  }))

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), countries, languages: locales }, null, 2))
  if ([...countries, ...locales].some(row => !row.verified)) process.exitCode = 1
}

main().catch(() => {
  console.error('market_catalog_verification_failed')
  process.exitCode = 1
})
