import 'server-only'

/**
 * TASK-990 — Berel income native-plane BACKFILL (allowlisted, idempotent).
 *
 * Creates ONLY the Berel export invoice (sale 28800562) as an income row with its
 * native (MXN) + functional (CLP legal) + reporting (USD) planes, through the
 * CANONICAL writer `upsertIncomeFromSale` — never a replicated writer. The foreign
 * plane is injected from the SII XML (the conformed enrichment is gated off), which
 * is the documented source of truth (Slice 5a). It is an UNPAID invoice: 30-day
 * credit, payment_status='pending', amount_paid=0. NO payment/cobro is recorded.
 *
 * Contract (ADR §"Backfill contract"):
 *   --dry-run (default) — print the conformed sale + injected foreign plane.
 *   --apply             — write via upsertIncomeFromSale (idempotent ON CONFLICT).
 *
 * --apply is gated by FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED=true AND requires
 * FINANCE_CORE_MXN_ENABLED=true in the run env (so the income write activates the
 * native plane). Run:
 *   set -a; source .env.local; set +a
 *   FINANCE_CORE_MXN_ENABLED=true NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED=true \
 *   FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED=true \
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/task-990-berel-income-native-backfill.ts --apply
 */

import { getBigQueryProjectId } from '@/lib/bigquery'
import { isFinanceCoreMxnEnabled, isFinanceMxnBerelBackfillApplyEnabled } from '@/lib/finance/multi-currency/flags'
import { normalizeTaxId } from '@/lib/finance/multi-currency/tax-identity'
import { getNuboxSaleXml } from '@/lib/nubox/client'
import { parseDteForeignCurrencyXml } from '@/lib/nubox/dte-foreign-currency'
import { buildNuboxOrgByRutMap } from '@/lib/nubox/sync-nubox-conformed'
import { readConformedSales, upsertIncomeFromSale, type NuboxProjectionSale } from '@/lib/nubox/sync-nubox-to-postgres'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const BEREL_SALE_ID = 28800562
const apply = process.argv.includes('--apply')

type ForeignInjectableSale = NuboxProjectionSale & {
  client_rut?: string | null
  organization_id?: string | null
  foreign_currency_code?: string | null
  foreign_total_amount?: number | string | null
  functional_total_amount_clp?: number | string | null
}

const showIncome = async (label: string) => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT income_id, currency, total_amount, total_amount_clp, native_amount, native_currency,
            amount_usd, payment_status, amount_paid, due_date, is_tax_exempt,
            native_to_functional_fx_snapshot_id, functional_to_reporting_fx_snapshot_id
       FROM greenhouse_finance.income WHERE nubox_document_id = $1`,
    [BEREL_SALE_ID]
  )

  console.log(`\n${label}:`)
  console.log(rows.length === 0 ? '  (no income row)' : JSON.stringify(rows, null, 2))
}

const main = async () => {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`TASK-990 — Berel income native-plane backfill  [${apply ? 'APPLY' : 'DRY-RUN'}]`)
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  FINANCE_CORE_MXN_ENABLED:', isFinanceCoreMxnEnabled())
  console.log('  FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED:', isFinanceMxnBerelBackfillApplyEnabled())

  const projectId = getBigQueryProjectId()
  const sales = await readConformedSales(projectId)
  const sale = sales.find(s => Number(s.nubox_sale_id) === BEREL_SALE_ID) as ForeignInjectableSale | undefined

  if (!sale) throw new Error(`Berel conformed sale ${BEREL_SALE_ID} not found in greenhouse_conformed.nubox_sales`)

  // Inject the foreign plane from the SII XML (conformed enrichment is gated off).
  const parsed = parseDteForeignCurrencyXml(await getNuboxSaleXml(BEREL_SALE_ID))

  if (!parsed?.nativeCurrencyCode || parsed.nativeTotal === null || parsed.clpTotal === null) {
    throw new Error('Could not parse the foreign plane from the SII XML — aborting (no guesswork).')
  }

  sale.foreign_currency_code = parsed.nativeCurrencyCode
  sale.foreign_total_amount = parsed.nativeTotal
  sale.functional_total_amount_clp = parsed.clpTotal

  // Resolve + inject the canonical organization by RFC (same path as the Slice 4
  // RFC dry-run) so the income links to the org TASK-991 remediated — the income
  // writer uses sale.organization_id and does not resolve RFC itself.
  if (!sale.organization_id) {
    const orgByRut = await buildNuboxOrgByRutMap()
    const org = orgByRut.get(normalizeTaxId(sale.client_rut ?? ''))

    if (org?.organization_id) {
      sale.organization_id = org.organization_id
    } else {
      throw new Error(`No organization matched Berel RFC "${sale.client_rut}" — resolve the reviewed disposition first (do NOT project orphan).`)
    }
  }

  console.log('\nConformed sale (allowlisted) + injected foreign plane:')
  console.log(`  nubox_sale_id   = ${sale.nubox_sale_id}  (DTE ${sale.dte_type_code}, folio ${sale.folio})`)
  console.log(`  client          = ${sale.client_trade_name ?? '—'}  RFC=${sale.client_rut ?? '—'}  org=${sale.organization_id ?? '—'}`)
  console.log(`  emission_date   = ${sale.emission_date}   due_date = ${sale.due_date}  (30-day credit, UNPAID)`)
  console.log(`  native          = ${parsed.nativeTotal} ${parsed.nativeCurrencyCode}`)
  console.log(`  functional CLP  = ${parsed.clpTotal}`)

  await showIncome('Income row BEFORE')

  if (!apply) {
    console.log('\nDRY-RUN: nothing written. Re-run with --apply + the gate/flag env vars.')

    return
  }

  if (!isFinanceCoreMxnEnabled()) {
    throw new Error('--apply requires FINANCE_CORE_MXN_ENABLED=true so the income write populates the native plane.')
  }

  if (!isFinanceMxnBerelBackfillApplyEnabled()) {
    throw new Error('--apply requires FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED=true (explicit backfill gate).')
  }

  const outcome = await upsertIncomeFromSale(sale)

  console.log(`\n✓ upsertIncomeFromSale → ${outcome}`)

  await showIncome('Income row AFTER (expect native MXN + functional CLP + pending/unpaid)')
  console.log('\n═══════════════════════════════════════════════════════════════')
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error('BACKFILL FAIL:', err instanceof Error ? err.message : err); process.exit(1) })
