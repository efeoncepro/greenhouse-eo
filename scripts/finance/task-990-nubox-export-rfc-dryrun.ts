import 'server-only'

// TASK-990 Slice 4 — Dry-run report for Nubox export-invoice (DTE 110/111/112)
// RFC → organization matching. READ-ONLY: classifies each conformed export sale
// as auto-matched (RFC found in organizations.tax_id, normalized) or orphan
// (needs reviewed disposition). Berel (RFC PBE970101718, MX) is the canonical
// case. No mutation — safe to run anytime.
//
// Usage:
//   set -a; source .env.local; set +a
//   export GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false
//   unset GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/task-990-nubox-export-rfc-dryrun.ts

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { buildNuboxOrgByRutMap } from '@/lib/nubox/sync-nubox-conformed'
import { classifyTaxId, normalizeTaxId } from '@/lib/finance/multi-currency/tax-identity'

type ExportSaleRow = {
  nubox_sale_id: string
  dte_type_code: string | null
  client_rut: string | null
  client_trade_name: string | null
  total_amount: number | null
}

const main = async () => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  // Only stable conformed columns — the TASK-990 Slice 3 foreign_* fields are
  // added to the BQ conformed table by the next sync run (autodetect on insert);
  // historical rows lack them, so we don't SELECT them here.
  const [rows] = await bq.query({
    query: `
      WITH latest AS (
        SELECT * EXCEPT(rn) FROM (
          SELECT c.*,
                 ROW_NUMBER() OVER (PARTITION BY nubox_sale_id ORDER BY synced_at DESC, sync_run_id DESC) AS rn
          FROM \`${projectId}.greenhouse_conformed.nubox_sales\` c
          WHERE c.dte_type_code IN ('110', '111', '112')
        ) WHERE rn = 1
      )
      SELECT nubox_sale_id, dte_type_code, client_rut, client_trade_name, total_amount
      FROM latest
    `
  })

  const exportSales = rows as unknown as ExportSaleRow[]
  const orgByRut = await buildNuboxOrgByRutMap()

  const matched: ExportSaleRow[] = []
  const orphan: ExportSaleRow[] = []

  for (const sale of exportSales) {
    const key = normalizeTaxId(sale.client_rut)

    if (key && orgByRut.has(key)) matched.push(sale)
    else orphan.push(sale)
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('TASK-990 Slice 4 — Nubox export RFC → organization dry-run')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Export sales (DTE 110/111/112): ${exportSales.length}`)
  console.log(`Auto-matched to an organization: ${matched.length}`)
  console.log(`Orphan (need reviewed disposition): ${orphan.length}`)
  console.log('')

  for (const sale of matched) {
    const c = classifyTaxId(sale.client_rut)
    const org = orgByRut.get(normalizeTaxId(sale.client_rut))

    console.log(
      `  ✓ ${sale.nubox_sale_id} DTE ${sale.dte_type_code} · ${c.kind.toUpperCase()} ${c.normalized} · ${sale.client_trade_name ?? '—'} → ${org?.organization_id} · CLP ${sale.total_amount ?? '?'}`
    )
  }

  if (orphan.length > 0) {
    console.log('')
    console.log('  Orphans:')

    for (const sale of orphan) {
      const c = classifyTaxId(sale.client_rut)

      console.log(
        `  ✗ ${sale.nubox_sale_id} DTE ${sale.dte_type_code} · ${c.kind.toUpperCase()} ${c.normalized} · ${sale.client_trade_name ?? '—'} · CLP ${sale.total_amount ?? '?'}`
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
