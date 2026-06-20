import 'server-only'

// TASK-1209 Slice 4 — Berel historical repair APPLY (gated).
// Projects the two already-emitted Berel export invoices through the CANONICAL
// recurring path (upsertIncomeFromSale) — NOT a bespoke writer. Idempotent
// (ON CONFLICT by nubox_document_id). Requires --apply; default is a no-op echo.
//
// Authorized by operator 2026-06-20 (AskUserQuestion "Aplicar ahora en dev PG").
//
// Usage:
//   set -a; source .env.local; set +a
//   export GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group
//   export GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false
//   unset GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/task-1209-berel-apply.ts --apply

import { getBigQueryProjectId } from '@/lib/bigquery'
import { readConformedSales, upsertIncomeFromSale } from '@/lib/nubox/sync-nubox-to-postgres'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const BEREL_SALE_IDS = new Set(['28800562', '29062197'])
const APPLY = process.argv.includes('--apply')

const main = async () => {
  const projectId = getBigQueryProjectId()
  const sales = await readConformedSales(projectId)
  const berel = sales.filter(s => BEREL_SALE_IDS.has(String(s.nubox_sale_id)))

  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`TASK-1209 — Berel apply (${APPLY ? 'APPLY' : 'DRY-RUN'})`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (berel.length !== 2) {
    console.warn(`Expected 2 Berel export sales, found ${berel.length}. Aborting.`)
    process.exit(1)
  }

  if (!APPLY) {
    console.log('Pass --apply to project. No mutation performed.')

    return
  }

  for (const sale of berel) {
    const result = await upsertIncomeFromSale(sale)

    console.log(`  sale ${sale.nubox_sale_id} (folio ${sale.folio}) -> ${result}`)
  }

  const rows = await runGreenhousePostgresQuery<{
    nubox_document_id: string
    client_name: string | null
    total_amount_clp: string | null
    payment_status: string | null
    period_year: number | null
    period_month: number | null
    due_date: string | null
    is_tax_exempt: boolean | null
  }>(
    `SELECT nubox_document_id::text, client_name, total_amount_clp::text, payment_status,
            period_year, period_month, due_date::text, is_tax_exempt
       FROM greenhouse_finance.income
      WHERE nubox_document_id IN (28800562, 29062197)
      ORDER BY nubox_document_id`
  )

  console.log('')
  console.log('Income rows after apply:')

  for (const r of rows) {
    console.log(
      `  doc=${r.nubox_document_id} client="${r.client_name}" totalCLP=${r.total_amount_clp} ` +
        `status=${r.payment_status} period=${r.period_year}-${r.period_month} due=${r.due_date} exempt=${r.is_tax_exempt}`
    )
  }

  const total = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COALESCE(SUM(total_amount_clp),0)::text AS total
       FROM greenhouse_finance.income
      WHERE period_year=2026 AND period_month=6 AND COALESCE(is_annulled,FALSE)=FALSE`
  )

  console.log('')
  console.log(`June 2026 facturación (income total_amount_clp): ${total[0]?.total}`)
  console.log('Expected: 15983109 (Sky 6.902.000 + Berel 4.617.647 + 4.463.462)')
  console.log('═══════════════════════════════════════════════════════════════')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('apply failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
