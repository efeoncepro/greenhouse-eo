/**
 * Manual test: runs the full Nubox sync pipeline (raw → conformed → postgres)
 * Usage: npx tsx scripts/test-nubox-sync.ts [phase]
 *   phase: "fetch" | "raw" | "conformed" | "postgres" | "all" (default: "all")
 */
import process from 'node:process'
import Module from 'node:module'

// Bypass server-only check for script context
const origResolve = (Module as any)._resolveFilename

;(Module as any)._resolveFilename = function (request: string, ...args: unknown[]) {
  if (request === 'server-only') return require.resolve('./lib/load-greenhouse-tool-env')

  return origResolve.call(this, request, ...args)
}

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

// Force exit after 5 minutes to prevent hanging on pool (backfill needs time)
setTimeout(() => { console.error('Timeout — forcing exit'); process.exit(2) }, 300_000)

const phase = process.argv[2] || 'all'

const testFetch = async () => {
  console.log('\n=== Test: Fetch Nubox API (sales 2026-02) ===')
  const { listNuboxSales, fetchAllPages } = await import('@/lib/nubox/client')
  const sales = await fetchAllPages(listNuboxSales, '2026-02')

  console.log(`Fetched ${sales.length} sales`)
  sales.forEach(s => console.log(`  [${s.id}] ${s.client?.tradeName} — $${s.totalAmount} (${s.type?.abbreviation})`))

  const { listNuboxPurchases } = await import('@/lib/nubox/client')
  const purchases = await fetchAllPages(listNuboxPurchases, '2026-02')

  console.log(`\nFetched ${purchases.length} purchases`)
  purchases.forEach(p => console.log(`  [${p.id}] ${p.supplier?.tradeName} — $${p.totalAmount}`))
}

/** Generate all YYYY-MM periods from startYear-startMonth to now */
const generateAllPeriods = (startYear = 2023, startMonth = 1): string[] => {
  const now = new Date()
  const endYear = now.getFullYear()
  const endMonth = now.getMonth() + 1
  const periods: string[] = []

  for (let y = startYear; y <= endYear; y++) {
    const maxM = y === endYear ? endMonth : 12
    const minM = y === startYear ? startMonth : 1

    for (let m = minM; m <= maxM; m++) {
      periods.push(`${y}-${String(m).padStart(2, '0')}`)
    }
  }


return periods
}

const testRaw = async () => {
  const allPeriods = generateAllPeriods(2023, 1)

  console.log(`\n=== Phase A: Nubox → BigQuery Raw (${allPeriods.length} periods: ${allPeriods[0]} → ${allPeriods[allPeriods.length - 1]}) ===`)
  const { syncNuboxToRaw } = await import('@/lib/nubox/sync-nubox-raw')
  const result = await syncNuboxToRaw({ periods: allPeriods })

  console.log(JSON.stringify(result, null, 2))
}

const testConformed = async () => {
  console.log('\n=== Phase B: BigQuery Raw → BigQuery Conformed ===')
  const { syncNuboxToConformed } = await import('@/lib/nubox/sync-nubox-conformed')
  const result = await syncNuboxToConformed()

  console.log(JSON.stringify(result, null, 2))
}

const testPostgres = async () => {
  console.log('\n=== Phase C: BigQuery Conformed → PostgreSQL ===')
  const { syncNuboxToPostgres } = await import('@/lib/nubox/sync-nubox-to-postgres')
  const result = await syncNuboxToPostgres()

  console.log(JSON.stringify(result, null, 2))
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  if (phase === 'fetch') await testFetch()
  else if (phase === 'raw') await testRaw()
  else if (phase === 'conformed') await testConformed()
  else if (phase === 'postgres') await testPostgres()
  else {
    await testFetch()
    await testRaw()
    await testConformed()
    await testPostgres()
  }

  console.log('\n=== DONE ===')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error)
    process.exit(1)
  })
