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

const arg = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)

async function main() {
  loadGreenhouseToolEnv()
  const inputPath = arg('input')
  const outPath = arg('out')

  if (!outPath) throw new Error('Required: --out=<new output JSON>')
  const live = ['org', 'site', 'host', 'from', 'to'].map(arg)

  if (inputPath && live.some(Boolean)) throw new Error('choose_input_file_or_live_collection')
  if (!inputPath && live.some(value => !value))
    throw new Error('Required: --input=<JSON> or --org, --site, --host, --from, --to')

  const input = inputPath
    ? JSON.parse(await readFile(inputPath, 'utf8'))
    : await collectOrganicTrafficValueInputs({
        organizationId: live[0]!,
        siteUrl: live[1]!,
        hostname: live[2]!,
        range: { startDate: live[3]!, endDate: live[4]! }
      })

  if (arg('save-input')) await writeFile(arg('save-input')!, JSON.stringify(input, null, 2) + '\n', { flag: 'wx' })
  const cpc: OrganicValueCpc[] = []
  const marketReads = []

  for (const market of [
    { country: 'chl', locationCode: '2152' },
    { country: 'per', locationCode: '2604' }
  ]) {
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
    brandPattern: /\bsky\b|skyairlines?/i,
    cpc
  })

  const output = {
    organizationId: input.organizationId,
    siteUrl: input.siteUrl,
    hostname: input.hostname,
    range: input.range,
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
