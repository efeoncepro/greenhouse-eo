import { createRequire } from 'node:module'

import { closeGreenhousePostgres } from '@/lib/db'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

// ============================================================
// TASK-484: One-shot backfill of exchange_rates rows for a given currency
// across a date range.
//
// Usage:
//   pnpm tsx scripts/backfill-fx-rates.ts \
//     --currency=MXN \
//     --from=2026-01-01 \
//     --to=2026-04-19 \
//     [--provider=banxico_sie]   # optional override; defaults to registry
//     [--apply]                   # default is dry-run
//
// The script reads CURRENCY_REGISTRY and uses the `historical` adapter
// when present (e.g., BCRP for PEN) — otherwise uses `primary`. Each
// day in the range is synced via the adapter's fetchHistoricalRange
// (bulk where supported) or fetchDailyRate (fallback per-day).
//
// Requires Cloud SQL Auth Proxy running on 127.0.0.1:15432 per
// scripts/lib/load-greenhouse-tool-env.ts.
// ============================================================

const require = createRequire(import.meta.url)

const stubServerOnlyForScripts = () => {
  const serverOnlyPath = require.resolve('server-only')

  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {}
  } as NodeModule
}

stubServerOnlyForScripts()

interface CliArgs {
  currency: string
  from: string
  to: string
  providerOverride: string | null
  apply: boolean
  help: boolean
}

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    currency: '',
    from: '',
    to: '',
    providerOverride: null,
    apply: false,
    help: false
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--apply') args.apply = true
    else if (arg.startsWith('--currency=')) args.currency = arg.slice('--currency='.length).trim().toUpperCase()
    else if (arg.startsWith('--from=')) args.from = arg.slice('--from='.length).trim()
    else if (arg.startsWith('--to=')) args.to = arg.slice('--to='.length).trim()
    else if (arg.startsWith('--provider=')) args.providerOverride = arg.slice('--provider='.length).trim()
  }

  return args
}

const printUsage = () => {
  console.log(`
backfill-fx-rates — populate greenhouse_finance.exchange_rates from an FX provider

Usage:
  pnpm tsx scripts/backfill-fx-rates.ts --currency=MXN --from=2026-01-01 --to=2026-04-19 [--provider=banxico_sie] [--apply]

Required:
  --currency=ISO   Target currency (USD→X direction persisted; inverse also emitted)
  --from=DATE      ISO YYYY-MM-DD inclusive start
  --to=DATE        ISO YYYY-MM-DD inclusive end

Optional:
  --provider=CODE  Override the registry's historical/primary adapter
  --apply          Actually write rows. Without it, runs in dry-run mode.
`)
}

const isValidIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const formatDay = (date: Date) => date.toISOString().slice(0, 10)

const enumerateDays = (from: string, to: string): string[] => {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const days: string[] = []

  for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    days.push(formatDay(current))
  }

  return days
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  if (args.help || !args.currency || !args.from || !args.to) {
    printUsage()

    if (!args.help) process.exit(1)
    process.exit(0)
  }

  if (!isValidIsoDate(args.from) || !isValidIsoDate(args.to)) {
    console.error('Dates must be ISO YYYY-MM-DD.')
    process.exit(1)
  }

  if (args.from > args.to) {
    console.error('--from must be <= --to.')
    process.exit(1)
  }

  // Lazy-import to avoid server-only boundaries during arg parsing.
  const { syncCurrencyPair } = await import('@/lib/finance/fx/sync-orchestrator')
  const { CURRENCY_REGISTRY } = await import('@/lib/finance/currency-registry')
  const { FX_PROVIDER_CODES } = await import('@/lib/finance/fx/provider-adapter')

  const entry = CURRENCY_REGISTRY[args.currency as keyof typeof CURRENCY_REGISTRY]

  if (!entry) {
    console.error(`Unknown currency: ${args.currency}`)
    console.error(`Known currencies: ${Object.keys(CURRENCY_REGISTRY).join(', ')}`)
    process.exit(1)
  }

  let providerOverride: (typeof FX_PROVIDER_CODES)[number] | undefined

  if (args.providerOverride) {
    if (!(FX_PROVIDER_CODES as readonly string[]).includes(args.providerOverride)) {
      console.error(`--provider must be one of: ${FX_PROVIDER_CODES.join(', ')}`)
      process.exit(1)
    }

    providerOverride = args.providerOverride as (typeof FX_PROVIDER_CODES)[number]
  } else if (entry.providers.historical) {
    // Use historical adapter if registered (e.g., BCRP for PEN)
    providerOverride = entry.providers.historical
  }

  const days = enumerateDays(args.from, args.to)

  console.log('─── backfill-fx-rates ───')
  console.log(`  currency:  ${args.currency}`)
  console.log(`  range:     ${args.from} → ${args.to} (${days.length} days)`)
  console.log(`  provider:  ${providerOverride ?? `(registry chain: primary=${entry.providers.primary})`}`)
  console.log(`  mode:      ${args.apply ? 'APPLY' : 'DRY-RUN (no writes)'}`)
  console.log('')

  let ok = 0
  let failed = 0
  let skipped = 0

  for (const day of days) {
    const result = await syncCurrencyPair({
      fromCurrency: 'USD',
      toCurrency: args.currency,
      rateDate: day,
      dryRun: !args.apply,
      overrideProviderCode: providerOverride,
      triggeredBy: 'backfill-fx-rates'
    })

    if (result.success) {
      if (result.dryRun) {
        console.log(`  DRY  ${day}  ${args.currency}=${result.rate}  via ${result.providerUsed}${result.isCarried ? ' (carried)' : ''}`)
        skipped += 1
      } else {
        console.log(`  OK   ${day}  ${args.currency}=${result.rate}  via ${result.providerUsed}${result.isCarried ? ' (carried)' : ''}${result.persistedInverse ? ' [+inverse]' : ''}`)
        ok += 1
      }
    } else {
      console.error(`  FAIL ${day}  ${result.error}`)
      failed += 1
    }
  }

  console.log('')
  console.log('─── summary ───')
  console.log(`  applied:  ${ok}`)
  console.log(`  dry-run:  ${skipped}`)
  console.log(`  failed:   ${failed}`)

  await closeGreenhousePostgres()

  process.exit(failed === 0 ? 0 : 2)
}

main().catch(error => {
  console.error('[backfill-fx-rates] fatal:', error)
  process.exit(1)
})
