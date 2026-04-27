#!/usr/bin/env tsx
/**
 * Cierre del drift de factoring (TASK-702 Slice 4 follow-up).
 *
 * Two operations both with provider X Capital / Xepelin entered the bank:
 *   - 10/03/2026 +$6.786.146 (referenced phantom: PAY-NUBOX-inc-3699924 / INC-NB-25302941, face value $6.902.000)
 *   - 14/04/2026 +$6.776.453 (referenced phantom: PAY-NUBOX-inc-3968935 / INC-NB-26639047, face value $6.902.000)
 *
 * Today's state:
 *   - The April factoring lives as test-data factoring_operation FO-326C62B0
 *     anchored to INC-NB-27971848 (test invoice). Its proceeds payment
 *     `pay-ee4e154b-...` exists with payment_account_id=santander-clp.
 *   - The March factoring has NO factoring_operation registered AT ALL.
 *   - Both phantoms PAY-NUBOX-inc-* exist with payment_account_id=NULL and
 *     are double-counting income.amount_paid.
 *
 * Resolution:
 *   1. Cancel the test-only April FO-326C62B0 (mark status='cancelled').
 *   2. Create new FO for April real (INC-NB-26639047) + income_payment
 *      factoring_proceeds + supersede phantom PAY-NUBOX-inc-3968935.
 *   3. Create new FO for March (INC-NB-25302941) + income_payment + supersede
 *      phantom PAY-NUBOX-inc-3699924.
 *
 * Idempotent: each operation is keyed by external_reference / payment.reference,
 * re-running detects existing and skips.
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { supersedeIncomePhantom } from '@/lib/finance/payment-instruments/supersede'

interface FactoringFix {
  label: string
  factoringOperationId: string
  incomeId: string
  faceValue: number
  proceedsAmount: number
  feeAmount: number
  interestAmount: number
  advisoryFeeAmount: number
  paymentDate: string
  bankRowId: string
  phantomPaymentId: string
}

// Only the March factoring needs a NEW factoring_operation + income_payment.
// April reuses FO-326C62B0 (reanchored above) + pay-ee4e154b... (reanchored).
const FIXES: FactoringFix[] = [
  {
    label: 'X Capital factoring March',
    factoringOperationId: 'FO-XCAPITAL-202603',
    incomeId: 'INC-NB-25302941',
    faceValue: 6902000,
    proceedsAmount: 6786146,
    feeAmount: 115854,
    interestAmount: 87000,
    advisoryFeeAmount: 28854,
    paymentDate: '2026-03-10',
    bankRowId: 'sclp-20260310-xcapital-6786146',
    phantomPaymentId: 'PAY-NUBOX-inc-3699924'
  }
]

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  console.log('[fix-factoring] start')

  // 1. Re-anchor the test factoring_operation FO-326C62B0 to the real
  //    invoice INC-NB-26639047 so the bank inflow it represents is properly
  //    attributed. We DON'T cancel — that would lose the proceeds payment
  //    and drift the bank balance. Instead we move income_id, drop the test
  //    linked_expense_id, and update the proceeds payment to match.
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.factoring_operations SET
       income_id = 'INC-NB-26639047',
       linked_expense_id = NULL,
       external_reference = 'X Capital April reanchor (was test-e2e-2)',
       updated_at = NOW()
     WHERE operation_id = 'FO-326C62B0'`
  )

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.income_payments SET
       income_id = 'INC-NB-26639047',
       notes = 'Reanchored from test invoice INC-NB-27971848 to real invoice INC-NB-26639047 (TASK-702)'
     WHERE payment_id = 'pay-ee4e154b-cd73-4b23-8a6b-a734251dd7c0'`
  )

  // Recompute both incomes (the test one drops to 0 paid; the real one rises)
  await runGreenhousePostgresQuery(
    `SELECT greenhouse_finance.fn_recompute_income_amount_paid('INC-NB-27971848')`
  )

  await runGreenhousePostgresQuery(
    `SELECT greenhouse_finance.fn_recompute_income_amount_paid('INC-NB-26639047')`
  )

  console.log('[fix-factoring] reanchored FO-326C62B0 + pay-ee4e154b to INC-NB-26639047')

  for (const fix of FIXES) {
    console.log(`\n[fix-factoring] processing ${fix.label}`)

    await withGreenhousePostgresTransaction(async client => {
      // Verify income exists and capture amount_paid + total_amount
      const incomeRows = await client.query<{ income_id: string; total_amount: string; amount_paid: string }>(
        `SELECT income_id, total_amount::text, amount_paid::text
         FROM greenhouse_finance.income WHERE income_id = $1 LIMIT 1`,
        [fix.incomeId]
      )

      if (incomeRows.rows.length === 0) {
        console.log(`  [skip] income ${fix.incomeId} not found`)
        
return
      }

      // 2. Upsert factoring_operation
      const existingFo = await client.query<{ operation_id: string }>(
        `SELECT operation_id FROM greenhouse_finance.factoring_operations WHERE operation_id = $1`,
        [fix.factoringOperationId]
      )

      if (existingFo.rows.length === 0) {
        await client.query(
          `INSERT INTO greenhouse_finance.factoring_operations (
             operation_id, income_id, factoring_provider_id,
             nominal_amount, advance_amount, fee_amount, fee_rate,
             interest_amount, advisory_fee_amount,
             operation_date, settlement_date, status,
             external_reference, external_folio,
             created_at, updated_at
           ) VALUES (
             $1, $2, 'prov-xepelin-001',
             $3, $4, $5, $6,
             $7, $8,
             $9::date, $9::date, 'active',
             'X Capital ' || $9, $1,
             NOW(), NOW()
           )`,
          [
            fix.factoringOperationId, fix.incomeId,
            fix.faceValue, fix.proceedsAmount, fix.feeAmount,
            fix.feeAmount / fix.faceValue,
            fix.interestAmount, fix.advisoryFeeAmount,
            fix.paymentDate
          ]
        )
        console.log(`  [created] factoring_operation ${fix.factoringOperationId}`)
      } else {
        console.log(`  [exists] factoring_operation ${fix.factoringOperationId}`)
      }

      // 3. Upsert income_payment factoring_proceeds
      const paymentRef = `factoring-proceeds-${fix.factoringOperationId}`
      const newPaymentId = `pay-fact-${fix.factoringOperationId}`

      const existingPay = await client.query<{ payment_id: string }>(
        `SELECT payment_id FROM greenhouse_finance.income_payments WHERE payment_id = $1`,
        [newPaymentId]
      )

      if (existingPay.rows.length === 0) {
        await client.query(
          `INSERT INTO greenhouse_finance.income_payments (
             payment_id, income_id, payment_date, amount, currency,
             reference, payment_method, payment_account_id, payment_source,
             notes, recorded_by_user_id, recorded_at,
             is_reconciled, exchange_rate_at_payment, amount_clp, fx_gain_loss_clp,
             settlement_group_id, created_at
           ) VALUES (
             $1, $2, $3::date, $4, 'CLP',
             $5, 'bank_transfer', 'santander-clp', 'factoring_proceeds',
             $6, NULL, NOW(),
             FALSE, 1, $4, 0,
             NULL, NOW()
           )`,
          [
            newPaymentId, fix.incomeId, fix.paymentDate, fix.proceedsAmount,
            paymentRef,
            `Factoring proceeds — Xepelin ${fix.factoringOperationId} (TASK-702 reconciliation)`
          ]
        )
        console.log(`  [created] income_payment ${newPaymentId}`)
      } else {
        console.log(`  [exists] income_payment ${newPaymentId}`)
      }

      // 4. Update factoring_operations.linked_payment_id to point to our new payment
      await client.query(
        `UPDATE greenhouse_finance.factoring_operations
         SET linked_payment_id = $1, updated_at = NOW()
         WHERE operation_id = $2`,
        [newPaymentId, fix.factoringOperationId]
      )

      // 5. Recompute income.amount_paid via canonical function
      await client.query(
        `SELECT greenhouse_finance.fn_recompute_income_amount_paid($1)`,
        [fix.incomeId]
      )

      console.log(`  [done] factoring fix applied for ${fix.label}`)
    })

    // 6. Supersede the phantom (separate transaction; helper handles its own)
    try {
      const result = await supersedeIncomePhantom({
        phantomPaymentId: fix.phantomPaymentId,
        replacementPaymentId: `pay-fact-${fix.factoringOperationId}`,
        reason: `Replaced by canonical factoring_proceeds payment from ${fix.factoringOperationId} (TASK-702).`,
        actorUserId: 'task-702-reconciliation'
      })

      console.log(`  [superseded] phantom ${fix.phantomPaymentId} (income ${result.incomeId})`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      console.warn(`  [supersede-warn] ${fix.phantomPaymentId}: ${message}`)
    }
  }

  // Supersede the April phantom against the existing real proceeds payment
  try {
    const result = await supersedeIncomePhantom({
      phantomPaymentId: 'PAY-NUBOX-inc-3968935',
      replacementPaymentId: 'pay-ee4e154b-cd73-4b23-8a6b-a734251dd7c0',
      reason: 'Replaced by reanchored factoring_proceeds payment (TASK-702 April reconciliation).',
      actorUserId: 'task-702-reconciliation'
    })

    console.log(`\n[superseded] PAY-NUBOX-inc-3968935 → pay-ee4e154b (income ${result.incomeId})`)
  } catch (err) {
    console.warn(`[supersede-warn] April phantom: ${(err as Error).message}`)
  }

  console.log('\n[fix-factoring] complete')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
