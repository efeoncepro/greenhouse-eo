import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { readKeywordMarketData, normalizeMarketKeyword } from '../../src/lib/growth/seo/keyword-market-data'
import {
  calculateOrganicTrafficValue,
  type OrganicValueCpc
} from '../../src/lib/growth/seo/organic-traffic-value/calculate'
import { collectOrganicTrafficValueInputs } from '../../src/lib/growth/seo/organic-traffic-value/collect'
import { readSeoContentScope } from '../../src/lib/growth/seo/content-scope/store'

const arg = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)

/**
 * `--markets=mex:2484,chl:2152`: país GSC (ISO-3, minúsculas) y location_code de DataForSEO. Sin flag, Chile y Perú
 * (piloto SKY). `--brand=<regex>`: patrón de marca (sin flag, el de SKY). `--content-scope`: mide sólo el alcance de
 * contenido vigente de la organización (TASK-2033); el recorte lo hace la consulta a Search Console.
 */
const parseMarkets = (value: string | undefined) =>
  (value ?? 'chl:2152,per:2604').split(',').map(entry => {
    const [country, locationCode] = entry.split(':').map(part => part.trim())

    if (!country || !/^[a-z]{3}$/.test(country) || !locationCode || !/^\d+$/.test(locationCode))
      throw new Error(`invalid_market: ${entry}`)

    return { country, locationCode }
  })

async function main() {
  loadGreenhouseToolEnv()
  const inputPath = arg('input')
  const outPath = arg('out')

  if (!outPath) throw new Error('Required: --out=<new output JSON>')
  const live = ['org', 'site', 'host', 'from', 'to'].map(arg)

  if (inputPath && live.some(Boolean)) throw new Error('choose_input_file_or_live_collection')
  if (!inputPath && live.some(value => !value))
    throw new Error('Required: --input=<JSON> or --org, --site, --host, --from, --to')

  const markets = parseMarkets(arg('markets'))
  const brandPattern = new RegExp(arg('brand') ?? '\\bsky\\b|skyairlines?', 'i')
  const useScope = process.argv.includes('--content-scope')

  if (useScope && inputPath) throw new Error('content_scope_requires_live_collection')
  const scope = useScope ? await readSeoContentScope(live[0]!) : null

  if (useScope && (!scope || scope.rules.length === 0)) throw new Error('content_scope_not_declared')

  const input = inputPath
    ? JSON.parse(await readFile(inputPath, 'utf8'))
    : await collectOrganicTrafficValueInputs({
        organizationId: live[0]!,
        siteUrl: live[1]!,
        hostname: live[2]!,
        range: { startDate: live[3]!, endDate: live[4]! },
        ...(scope ? { scopeRules: scope.rules } : {})
      })

  if (arg('save-input')) await writeFile(arg('save-input')!, JSON.stringify(input, null, 2) + '\n', { flag: 'wx' })
  const cpc: OrganicValueCpc[] = []
  const marketReads = []

  for (const market of markets) {
    const keywords = [
      ...new Set<string>(
        input.rows
          .filter((row: { country: string }) => row.country === market.country)
          .map((row: { query: string }) => normalizeMarketKeyword(row.query))
      )
    ]

    const result = await readKeywordMarketData({ keywords, locationCode: market.locationCode, languageCode: 'es' })

    marketReads.push({ ...market, ...result.freshness, matchedKeywords: result.byKeyword.size })

    for (const datum of result.byKeyword.values()) {
      if (!datum.capturedAt) throw new Error('cpc_snapshot_date_missing')
      cpc.push({
        normalizedQuery: datum.normalizedKeyword,
        country: market.country,
        cpcUsd: datum.cpcUsd,
        capturedAt: datum.capturedAt,
        providerUpdatedAt: datum.providerLastUpdatedAt
      })
    }
  }

  const result = calculateOrganicTrafficValue({
    ...input,
    gscCapturedAt: input.capturedAt,
    brandPattern,
    cpc
  })

  const output = {
    organizationId: input.organizationId,
    siteUrl: input.siteUrl,
    hostname: input.hostname,
    range: input.range,
    contentScope: scope ? { version: scope.version, label: scope.label, rules: scope.rules } : (input.scope ?? null),
    brandPattern: brandPattern.source,
    generatedAt: new Date().toISOString(),
    gscCapturedAt: input.capturedAt,
    providerCompleteness: input.providerCompleteness,
    marketReads,
    cpcTemporalBasis: 'snapshot_prices_as_of_capture_not_historical_month_prices',
    ...result
  }

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' })
  console.log(
    JSON.stringify({
      output: outPath,
      summary: result.summary,
      countriesValued: marketReads,
      detailRows: result.detail.length
    })
  )
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'valuation_failed')
    process.exitCode = 1
  })
  .finally(closeGreenhousePostgres)
