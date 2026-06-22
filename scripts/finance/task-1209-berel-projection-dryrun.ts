import 'server-only'

// TASK-1209 Slice 4 — Berel projection dry-run (READ-ONLY, no mutation).
// Proves the Slice 2 exempt fix makes the recurring Nubox projection materialize
// the historical Berel export invoices. Reads the conformed sales, runs the SAME
// tax-build step the projection uses (buildIncomeTaxWriteFields) — which used to
// throw `totalAmount does not match the resolved tax snapshot (0)` — and prints
// the income row that WOULD be written. Does NOT insert. The real apply happens
// via the next recurring sync (rollout-pending, Finance/operator sign-off).
//
// Usage:
//   set -a; source .env.local; set +a
//   export GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group
//   export GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false
//   unset GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/task-1209-berel-projection-dryrun.ts

import { getBigQueryProjectId } from '@/lib/bigquery'
import { buildIncomeTaxWriteFields } from '@/lib/finance/income-tax-snapshot'
import { readConformedSales } from '@/lib/nubox/sync-nubox-to-postgres'

const BEREL_SALE_IDS = new Set(['28800562', '29062197'])

const num = (v: unknown): number => {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(String(v).replace(/^"|"$/g, '').trim())

  return Number.isFinite(n) ? n : 0
}

const main = async () => {
  const projectId = getBigQueryProjectId()
  const sales = await readConformedSales(projectId)
  const berel = sales.filter(s => BEREL_SALE_IDS.has(String(s.nubox_sale_id)))

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('TASK-1209 Slice 4 — Berel projection dry-run (READ-ONLY)')
  console.log('═══════════════════════════════════════════════════════════════')

  if (berel.length === 0) {
    console.log('No Berel export sales found in conformed.')

    return
  }

  for (const sale of berel) {
    const subtotalAbs = Math.abs(num(sale.net_amount))
    const taxCode = sale.dte_type_code === '110' ? 'cl_vat_exempt' : undefined

    try {
      const taxFields = await buildIncomeTaxWriteFields({
        subtotal: subtotalAbs,
        taxCode,
        taxAmount: Math.abs(num(sale.tax_vat_amount)),
        totalAmount: Math.abs(num(sale.total_amount)),
        dteTypeCode: sale.dte_type_code,
        exemptAmount: Math.abs(num(sale.exempt_amount)),
        issuedAt: sale.emission_date ?? undefined
      })

      console.log('')
      console.log(`✓ WOULD PROJECT  income_id=INC-NB-${sale.nubox_sale_id}  (DTE ${sale.dte_type_code} folio ${sale.folio})`)
      console.log(`    client="${sale.client_trade_name}" client_id=${sale.client_id ?? 'NULL'}`)
      console.log(`    subtotal(afecto)=${subtotalAbs}  exempt=${Math.abs(num(sale.exempt_amount))}  tax=${taxFields.taxAmount}`)
      console.log(`    total_amount=${taxFields.totalAmount}  (= neto + IVA + exento)`)
      console.log(`    is_tax_exempt=${taxFields.isTaxExempt}  payment_status=pending  due_date=${sale.due_date}`)
    } catch (error) {
      console.log('')
      console.log(`✗ STILL BLOCKED  sale=${sale.nubox_sale_id}: ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    }
  }

  console.log('')
  console.log('Expected after next recurring sync: income total junio 2026 sube de')
  console.log('Sky $6.902.000 a Sky+Berel $15.983.109 (6.902.000 + 4.617.647 + 4.463.462).')
  console.log('NOTA: apply real = sync recurrente con sign-off; este script NO escribe.')
  console.log('═══════════════════════════════════════════════════════════════')
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(error => {
    console.error('dry-run failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
