/**
 * Audit and remediate finance payment ledgers.
 *
 * Default mode is dry-run so we can inspect how many document records are
 * marked as paid/partial without canonical ledger rows before mutating data.
 *
 * Usage examples:
 *   pnpm audit:finance:payment-ledgers
 *   pnpm backfill:finance:payment-ledgers
 *   pnpm exec tsx scripts/remediate-finance-payment-ledgers.ts --apply --income-only
 *   pnpm exec tsx scripts/remediate-finance-payment-ledgers.ts --apply --expense-only --no-reconcile
 *   pnpm exec tsx scripts/remediate-finance-payment-ledgers.ts --apply --allow-income-mismatch
 */

import {
  runFinancePaymentLedgerRemediation,
  type FinanceLedgerRemediationOptions
} from '../src/lib/finance/payment-ledger-remediation'

const args = new Set(process.argv.slice(2))

const options: FinanceLedgerRemediationOptions = {
  dryRun: !args.has('--apply'),
  includeIncome: !args.has('--expense-only'),
  includeExpense: !args.has('--income-only'),
  reconcileDrift: !args.has('--no-reconcile'),
  allowIncomeAmountMismatch: args.has('--allow-income-mismatch')
}

const limitArg = process.argv.slice(2).find(arg => arg.startsWith('--limit='))

if (limitArg) {
  const parsed = Number(limitArg.split('=')[1])

  if (Number.isFinite(parsed) && parsed > 0) {
    options.limit = parsed
  }
}

async function main() {
  console.log('=== Finance Payment Ledger Remediation ===')
  console.log(`Mode: ${options.dryRun ? 'dry-run' : 'apply'}`)
  console.log(`Scope: income=${options.includeIncome !== false}, expense=${options.includeExpense !== false}, reconcile=${options.reconcileDrift !== false}`)
  console.log('')

  const result = await runFinancePaymentLedgerRemediation(options)

  console.log('Audit:')
  console.log(`  income paid without ledger: ${result.audit.incomePaidWithoutLedger.count}`)
  console.log(`  income ledger drift: ${result.audit.incomeLedgerDrift.count}`)
  console.log(`  expense paid without ledger: ${result.audit.expensePaidWithoutLedger.count}`)
  console.log(`  expense ledger drift: ${result.audit.expenseLedgerDrift.count}`)

  if (result.incomeBackfill) {
    console.log('')
    console.log('Income backfill:')
    console.log(`  candidates: ${result.incomeBackfill.candidateCount}`)
    console.log(`  recoverable: ${result.incomeBackfill.recoverableCount}`)
    console.log(`  incomes backfilled: ${result.incomeBackfill.incomesBackfilled}`)
    console.log(`  payment records created: ${result.incomeBackfill.paymentRecordsCreated}`)
    console.log(`  skipped missing nubox document: ${result.incomeBackfill.skippedMissingNuboxDocumentId}`)
    console.log(`  skipped no bank movements: ${result.incomeBackfill.skippedNoBankMovements}`)
    console.log(`  skipped amount mismatch: ${result.incomeBackfill.skippedAmountMismatch}`)
    console.log(`  skipped overpayment risk: ${result.incomeBackfill.skippedOverpaymentRisk}`)

    if (result.incomeBackfill.errors.length > 0) {
      console.log('  errors:')

      for (const error of result.incomeBackfill.errors) {
        console.log(`    - ${error.incomeId}: ${error.reason}`)
      }
    }
  }

  if (result.expenseBackfill) {
    console.log('')
    console.log('Expense backfill:')
    console.log(`  candidates: ${result.expenseBackfill.candidateCount}`)
    console.log(`  recoverable: ${result.expenseBackfill.recoverableCount}`)
    console.log(`  expenses backfilled: ${result.expenseBackfill.expensesBackfilled}`)
    console.log(`  payment records created: ${result.expenseBackfill.paymentRecordsCreated}`)
    console.log(`  skipped missing payment date: ${result.expenseBackfill.skippedMissingPaymentDate}`)
    console.log(`  skipped overpayment risk: ${result.expenseBackfill.skippedOverpaymentRisk}`)

    if (result.expenseBackfill.errors.length > 0) {
      console.log('  errors:')

      for (const error of result.expenseBackfill.errors) {
        console.log(`    - ${error.expenseId}: ${error.reason}`)
      }
    }
  }

  if (result.reconciliation) {
    console.log('')
    console.log('Ledger reconciliation:')
    console.log(`  income drift candidates: ${result.reconciliation.incomeDriftCandidates}`)
    console.log(`  income corrected: ${result.reconciliation.incomeCorrected}`)
    console.log(`  expense drift candidates: ${result.reconciliation.expenseDriftCandidates}`)
    console.log(`  expense corrected: ${result.reconciliation.expenseCorrected}`)
  }
}

main().catch(error => {
  console.error('Finance payment ledger remediation failed:', error)
  process.exit(1)
})
