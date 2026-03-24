/**
 * Backfill income_payments from historical Nubox bank movements.
 *
 * Finds invoices with amount_paid > 0 that have no corresponding records
 * in income_payments, then creates payment records from matching Nubox
 * conformed bank movements. After backfill, reconciles amount_paid with
 * SUM(income_payments.amount) and reports discrepancies.
 *
 * Usage: npx tsx scripts/backfill-income-payments-from-nubox.ts
 */

import { runGreenhousePostgresQuery } from '../src/lib/postgres/client'
import { getBigQueryClient, getBigQueryProjectId } from '../src/lib/bigquery'

interface OrphanIncome extends Record<string, unknown> {
  income_id: string
  nubox_document_id: string | null
  total_amount: number
  amount_paid: number
  payment_status: string
}

interface NuboxMovement {
  nubox_movement_id: string
  linked_sale_id: string
  total_amount: string
  payment_date: string
}

async function main() {
  console.log('=== Backfill income_payments from Nubox bank movements ===\n')

  // 1. Find invoices with amount_paid > 0 but no income_payments records
  const orphans = await runGreenhousePostgresQuery<OrphanIncome>(
    `SELECT i.income_id, i.nubox_document_id, i.total_amount, i.amount_paid, i.payment_status
     FROM greenhouse_finance.income i
     LEFT JOIN greenhouse_finance.income_payments ip ON ip.income_id = i.income_id
     WHERE i.amount_paid > 0
     GROUP BY i.income_id, i.nubox_document_id, i.total_amount, i.amount_paid, i.payment_status
     HAVING COUNT(ip.payment_id) = 0
     ORDER BY i.income_id`
  )

  console.log(`Found ${orphans.length} invoices with amount_paid > 0 but no payment records\n`)

  if (orphans.length === 0) {
    console.log('Nothing to backfill.')

    return
  }

  // 2. Load Nubox conformed bank movements from BigQuery
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [movementRows] = await bigQuery.query({
    query: `SELECT nubox_movement_id, linked_sale_id, total_amount, CAST(payment_date AS STRING) AS payment_date
            FROM \`${projectId}.greenhouse_conformed.nubox_bank_movements\`
            WHERE linked_sale_id IS NOT NULL AND movement_direction = 'credit'`
  })

  const movements = movementRows as unknown as NuboxMovement[]
  const movementsBySaleId = new Map<string, NuboxMovement[]>()

  for (const m of movements) {
    const key = m.linked_sale_id
    const existing = movementsBySaleId.get(key) ?? []

    existing.push(m)
    movementsBySaleId.set(key, existing)
  }

  console.log(`Loaded ${movements.length} credit bank movements from BigQuery\n`)

  // 3. Create payment records
  let created = 0
  let noMovementFound = 0
  const discrepancies: { incomeId: string; amountPaid: number; sumPayments: number }[] = []

  for (const income of orphans) {
    const saleId = income.nubox_document_id

    if (!saleId) {
      noMovementFound++
      continue
    }

    const matchedMovements = movementsBySaleId.get(saleId) ?? []

    if (matchedMovements.length === 0) {
      noMovementFound++
      continue
    }

    for (const movement of matchedMovements) {
      const nuboxRef = `nubox-mvmt-${movement.nubox_movement_id}`
      const paymentId = `PAY-BACKFILL-${movement.nubox_movement_id}`

      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_finance.income_payments (
          payment_id, income_id, payment_date, amount, currency,
          reference, payment_method, payment_source, notes, recorded_at
        ) VALUES ($1, $2, $3::date, $4, 'CLP', $5, 'bank_transfer', 'nubox_bank_sync',
          'Backfill desde movimiento bancario Nubox', NOW())
        ON CONFLICT (payment_id) DO NOTHING`,
        [paymentId, income.income_id, movement.payment_date, Number(movement.total_amount), nuboxRef]
      )

      created++
    }

    // Reconcile amount_paid
    const sumResult = await runGreenhousePostgresQuery<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM greenhouse_finance.income_payments WHERE income_id = $1`,
      [income.income_id]
    )

    const sumPayments = Number(sumResult[0]?.total ?? 0)
    const newStatus = sumPayments >= Number(income.total_amount) ? 'paid' : sumPayments > 0 ? 'partial' : 'pending'

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.income SET amount_paid = $2, payment_status = $3, updated_at = NOW() WHERE income_id = $1`,
      [income.income_id, sumPayments, newStatus]
    )

    if (Math.abs(sumPayments - Number(income.amount_paid)) > 0.01) {
      discrepancies.push({ incomeId: income.income_id, amountPaid: Number(income.amount_paid), sumPayments })
    }
  }

  console.log(`Created ${created} payment records`)
  console.log(`Invoices with no matching bank movement: ${noMovementFound}`)

  if (discrepancies.length > 0) {
    console.log(`\nDiscrepancies found (${discrepancies.length}):`)

    for (const d of discrepancies) {
      console.log(`  ${d.incomeId}: amount_paid=${d.amountPaid}, SUM(payments)=${d.sumPayments}, diff=${d.amountPaid - d.sumPayments}`)
    }
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
