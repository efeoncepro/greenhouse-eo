import 'server-only'

// TASK-990 Slice 5b — Berel income native-plane dry-run (READ-ONLY).
// Fetches Berel's DTE 110 SII XML, parses the foreign-currency planes, and shows
// the native plane the income projection WOULD write under FINANCE_CORE_MXN_ENABLED
// — without mutating anything. Also prints the current income row's native fields
// (null today). Backfill apply is gated separately (FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED).
//
// Usage:
//   set -a; source .env.local; set +a
//   export GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group
//   export GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false
//   unset GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/task-990-berel-income-native-dryrun.ts

import { observedFxSnapshotEvidence } from '@/lib/finance/multi-currency/fx-snapshot'
import { getNuboxSaleXml } from '@/lib/nubox/client'
import { parseDteForeignCurrencyXml } from '@/lib/nubox/dte-foreign-currency'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const BEREL_SALE_ID = 28800562

const main = async () => {
  const xml = await getNuboxSaleXml(BEREL_SALE_ID)
  const parsed = parseDteForeignCurrencyXml(xml)

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('TASK-990 Slice 5b — Berel income native-plane dry-run (READ-ONLY)')
  console.log('═══════════════════════════════════════════════════════════════')

  if (!parsed?.nativeCurrencyCode || parsed.nativeTotal === null) {
    console.log('No foreign plane parsed from XML — would stay CLP-only.')
    
return
  }

  const fx = observedFxSnapshotEvidence({
    fromCurrency: parsed.nativeCurrencyCode as 'MXN',
    toCurrency: 'CLP',
    fromAmount: parsed.nativeTotal,
    toAmount: parsed.clpTotal ?? 0,
    rateDate: '2026-06-01'
  })

  console.log('Would write (flags ON):')
  console.log(`  native_amount   = ${parsed.nativeTotal}`)
  console.log(`  native_currency = ${parsed.nativeCurrencyCode}`)
  console.log(`  functional CLP  = ${parsed.clpTotal} (legal, total_amount_clp — unchanged)`)
  console.log(`  fx snapshot     = ${fx.fromCurrency}->${fx.toCurrency} rate=${fx.rate} (source=${fx.source}, policy=${fx.policy})`)
  console.log(`  is_tax_exempt   = true (DTE 110, D.L. 825)`)
  console.log('')

  const rows = await runGreenhousePostgresQuery<{
    income_id: string
    currency: string | null
    total_amount: number | null
    total_amount_clp: number | null
    native_amount: number | null
    native_currency: string | null
    is_tax_exempt: boolean | null
  }>(
    `SELECT income_id, currency, total_amount, total_amount_clp, native_amount, native_currency, is_tax_exempt
       FROM greenhouse_finance.income
      WHERE nubox_document_id = $1`,
    [BEREL_SALE_ID]
  )

  console.log('Current income row(s) in PG:')

  if (rows.length === 0) {
    console.log('  (none yet — income not projected for this sale)')
  } else {
    for (const r of rows) {
      console.log(
        `  ${r.income_id}: currency=${r.currency} total_amount=${r.total_amount} total_amount_clp=${r.total_amount_clp} ` +
          `native_amount=${r.native_amount ?? 'NULL'} native_currency=${r.native_currency ?? 'NULL'} exempt=${r.is_tax_exempt}`
      )
    }
  }

  console.log('═══════════════════════════════════════════════════════════════')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('dry-run failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
