/**
 * Backfill income_payments from historical Nubox bank movements using the
 * canonical payment ledger write path.
 *
 * This keeps the outbox contract aligned with finance.income_payment.recorded
 * so reactive projections and downstream finance/cost readers stay in sync.
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-income-payments-from-nubox.ts
 *   pnpm exec tsx scripts/backfill-income-payments-from-nubox.ts --dry-run
 *   pnpm exec tsx scripts/backfill-income-payments-from-nubox.ts --allow-income-mismatch
 */

import { backfillIncomePaymentLedgers } from '../src/lib/finance/payment-ledger-remediation'

const args = new Set(process.argv.slice(2))

async function main() {
  const dryRun = args.has('--dry-run')
  const allowIncomeAmountMismatch = args.has('--allow-income-mismatch')

  console.log('=== Backfill income_payments from Nubox bank movements ===')
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`)
  console.log('')

  const result = await backfillIncomePaymentLedgers({
    dryRun,
    allowIncomeAmountMismatch
  })

  console.log(`Candidates: ${result.candidateCount}`)
  console.log(`Recoverable: ${result.recoverableCount}`)
  console.log(`Incomes backfilled: ${result.incomesBackfilled}`)
  console.log(`Payment records created: ${result.paymentRecordsCreated}`)
  console.log(`Skipped missing nubox document: ${result.skippedMissingNuboxDocumentId}`)
  console.log(`Skipped no bank movements: ${result.skippedNoBankMovements}`)
  console.log(`Skipped amount mismatch: ${result.skippedAmountMismatch}`)
  console.log(`Skipped overpayment risk: ${result.skippedOverpaymentRisk}`)

  if (result.errors.length > 0) {
    console.log('Errors:')

    for (const error of result.errors) {
      console.log(`  - ${error.incomeId}: ${error.reason}`)
    }
  }
}

main().catch(error => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
