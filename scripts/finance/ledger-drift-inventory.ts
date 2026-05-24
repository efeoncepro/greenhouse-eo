/**
 * TASK-929 — Finance ledger drift inventory (read-only CLI report).
 *
 * Lists current finance ledger drift classified by accounting type and routed
 * by materiality. NEVER mutates. The control surface for finance/ops to decide
 * remediation. Reliability signal `finance.ledger.unresolved_drift_items` gives
 * the dashboard count; this gives the per-item breakdown.
 *
 * Usage (needs Cloud SQL proxy on 127.0.0.1:15432 or runtime PG env):
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/ledger-drift-inventory.ts
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/ledger-drift-inventory.ts --json
 */
import { getLedgerDriftInventory } from '@/lib/finance/ledger-drift/inventory'

const fmtClp = (n: number) => new Intl.NumberFormat('es-CL').format(Math.round(n))

const main = async () => {
  const json = process.argv.includes('--json')
  const inv = await getLedgerDriftInventory()

  if (json) {
    console.log(JSON.stringify(inv, null, 2))
    
return
  }

  console.log('=== Finance Ledger Drift Inventory (read-only) ===')
  console.log(`generado: ${inv.generatedAt}`)
  console.log(`umbral materialidad unanchored: $${fmtClp(inv.materialityThresholdClp)} CLP\n`)

  console.log(`-- Settlement drift (integridad de ledger): ${inv.settlement.count} --`)

  for (const s of inv.settlement.items) {
    console.log(
      `   ${s.incomeId}  paid=$${fmtClp(s.amountPaid)}  expected=$${fmtClp(s.expectedSettlement)}  drift=$${fmtClp(s.drift)}`
    )
  }

  if (inv.settlement.count === 0) console.log('   (sin drift de settlement)')

  console.log(
    `\n-- Unanchored paid expenses (data completeness): total $${fmtClp(inv.unanchored.totalClp)} CLP --`
  )
  console.log(`   material (>= umbral, revisión humana): ${inv.unanchored.materialCount}`)

  for (const e of inv.unanchored.material) {
    console.log(
      `     ${e.expenseId}  $${fmtClp(e.totalAmount)}  type=${e.expenseType}  econ=${e.economicCategory ?? '—'}  ${e.paymentDate ?? ''}`
    )
  }

  console.log(`   inmaterial (< umbral, batch-accept candidate): ${inv.unanchored.immaterialCount}`)

  console.log(`\n-- Internal transfer imbalance (OUT OF SCOPE — TASK-714d): ${inv.internalTransferImbalance.count} --`)

  for (const g of inv.internalTransferImbalance.items) {
    console.log(`   ${g.settlementGroupId}  out=${g.outCount} in=${g.inCount}`)
  }

  if (inv.internalTransferImbalance.count > 0) {
    console.log(`   ${inv.internalTransferImbalance.note}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('ledger-drift-inventory failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
