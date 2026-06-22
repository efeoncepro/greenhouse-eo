import 'server-only'

// TASK-1209 — Diagnóstico READ-ONLY de facturas de exportación Nubox
// (DTE 110/111/112) que existen en conformed pero NO tienen income row en
// greenhouse_finance.income. Reporta TODAS (no sólo Berel), con período,
// cliente, identidad resuelta y montos. No muta nada.
//
// Usage:
//   set -a; source .env.local; set +a
//   export GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group
//   export GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false
//   unset GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/task-1209-unprojected-export-invoices-diagnostic.ts

import { getBigQueryProjectId } from '@/lib/bigquery'
import { readConformedSales } from '@/lib/nubox/sync-nubox-to-postgres'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const EXPORT_DTE_CODES = new Set(['110', '111', '112'])

const main = async () => {
  const projectId = getBigQueryProjectId()
  const sales = await readConformedSales(projectId)
  const exportSales = sales.filter(s => EXPORT_DTE_CODES.has(s.dte_type_code ?? ''))

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('TASK-1209 — Unprojected export invoices diagnostic (READ-ONLY)')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Export DTEs in conformed (latest per sale): ${exportSales.length}`)
  console.log('')

  const projected = await runGreenhousePostgresQuery<{ nubox_document_id: string }>(
    `SELECT nubox_document_id::text FROM greenhouse_finance.income
      WHERE dte_type_code IN ('110','111','112')`
  )

  const projectedIds = new Set(projected.map(r => String(r.nubox_document_id)))

  let unprojected = 0

  for (const s of exportSales) {
    const id = String(s.nubox_sale_id)
    const isProjected = projectedIds.has(id)
    const identity = s.client_id ? 'client✓' : s.organization_id ? 'org-only' : 'orphan-rfc'
    const flag = isProjected ? 'PROJECTED ' : 'MISSING   '

    if (!isProjected) unprojected++

    console.log(
      `[${flag}] sale=${id} DTE=${s.dte_type_code} folio=${s.folio ?? '?'} ` +
        `period=${s.period_year ?? '?'}-${String(s.period_month ?? '?').padStart(2, '0')} ` +
        `client="${s.client_trade_name ?? '?'}" rfc=${s.client_rut ?? '?'} ${identity} ` +
        `net=${s.net_amount ?? 0} exempt=${s.exempt_amount ?? 0} total=${s.total_amount ?? 0} ` +
        `funcCLP=${s.functional_total_amount_clp ?? 'NULL'} nativeCcy=${s.foreign_currency_code ?? 'NULL'}`
    )
  }

  console.log('')
  console.log(`Unprojected export invoices: ${unprojected} / ${exportSales.length}`)
  console.log('Steady state esperado: 0. Cada MISSING con identity=client✓ debería')
  console.log('proyectar en el próximo sync (post fix de exento TASK-1209 Slice 2).')
  console.log('═══════════════════════════════════════════════════════════════')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('diagnostic failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
