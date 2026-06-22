import 'server-only'

// TASK-995 — CLF quotes → income projection dry-run (READ-ONLY, no mutation).
// Toma las cotizaciones CLF reales (las OC de clientes en UF que ya existen) y
// muestra qué income CLP + plano native UF generaría cada una con el fix de
// Slice 3b, SIN mutar nada. De-riskea el rollout: da números concretos a Finance
// para el sign-off antes de prender FINANCE_CLF_INCOME_PROJECTION_ENABLED.
//
// Usage:
//   set -a; source .env.local; set +a
//   export GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false
//   unset GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/task-995-clf-quotes-projection-dryrun.ts

import { buildClfIncomeProjection } from '@/lib/finance/multi-currency/clf-income-projection'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const num = (v: unknown): number => {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(String(v))

  return Number.isFinite(n) ? n : 0
}

const main = async () => {
  const today = new Date().toISOString().slice(0, 10)

  const rows = await runGreenhousePostgresQuery<{
    quote_id: string
    status: string
    subtotal: string | null
    tax_amount: string | null
    total_amount: string | null
    tax_rate: string | null
  }>(
    `SELECT quote_id, status, subtotal::text, tax_amount::text, total_amount::text, tax_rate::text
       FROM greenhouse_finance.quotes
      WHERE currency = 'CLF'
      ORDER BY status, quote_id`
  )

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('TASK-995 — CLF quotes → income projection dry-run (READ-ONLY)')
  console.log(`UF date usada para el snapshot: ${today}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (rows.length === 0) {
    console.log('No hay cotizaciones CLF.')

    return
  }

  let projectable = 0
  let blocked = 0

  for (const q of rows) {
    const subtotalClf = num(q.subtotal)
    const taxAmountClf = num(q.tax_amount)
    const totalClf = num(q.total_amount) || subtotalClf + taxAmountClf

    const projection = await buildClfIncomeProjection({
      subtotalClf,
      taxAmountClf,
      totalClf,
      rateDate: today
    })

    if (!projection) {
      blocked++
      console.log('')
      console.log(`✗ BLOQUEADA  ${q.quote_id} (${q.status}) — sin valor UF para ${today} (fail-closed)`)
      continue
    }

    projectable++
    console.log('')
    console.log(`✓ ${q.quote_id} (${q.status})  taxRate=${q.tax_rate ?? '—'}`)
    console.log(`    native UF: subtotal=${subtotalClf} tax=${taxAmountClf} total=${totalClf}`)
    console.log(`    UF rate (CLP/UF) = ${projection.ufRate}`)
    console.log(`    → income CLP: subtotal=${projection.functionalSubtotalClp} tax=${projection.functionalTaxAmountClp} total=${projection.functionalTotalClp}`)
    console.log(`    → native_amount=${projection.nativeAmountClf} CLF · currency legal=CLP · snapshot=${projection.fxSnapshotEvidence.fromUnitClass}`)
  }

  console.log('')
  console.log(`Resumen: ${projectable} proyectables, ${blocked} bloqueadas (de ${rows.length} CLF).`)
  console.log('NOTA: dry-run, no escribe. El apply real es el sync/materializer con el flag prendido.')
  console.log('═══════════════════════════════════════════════════════════════')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('dry-run failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
