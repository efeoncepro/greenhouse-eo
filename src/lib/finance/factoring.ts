import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { assertFinanceSlice2PostgresReady } from '@/lib/finance/postgres-store-slice2'
import { FinanceValidationError, toNumber, normalizeString, roundCurrency } from '@/lib/finance/shared'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RecordFactoringOperationInput {
  incomeId: string
  factoringProviderId: string
  nominalAmount: number
  advanceAmount: number
  interestAmount: number
  advisoryFeeAmount: number
  feeRate: number
  operationDate: string
  settlementDate?: string | null
  externalReference?: string | null
  externalFolio?: string | null
  paymentAccountId: string
  actorUserId: string | null
}

export interface RecordFactoringOperationResult {
  operationId: string
  incomeId: string
  nominalAmount: number
  advanceAmount: number
  feeTotal: number
  interestAmount: number
  advisoryFeeAmount: number
  status: string
  paymentId: string
  expenseInterestId: string
  expenseAdvisoryId: string
}

// ─── Inline expense INSERT helper ────────────────────────────────────────────
// NOTE: No se puede usar createFinanceExpenseInPostgres porque tiene su propia
// withGreenhousePostgresTransaction interna, lo que abriría una segunda transacción
// separada y rompería la atomicidad del flujo de factoring.

const insertExpenseInTransaction = async (
  client: PoolClient,
  {
    expenseId,
    clientId,
    expenseType,
    description,
    amount,
    paymentDate,
    supplierId,
    supplierName,
    paymentReference,
    actorUserId
  }: {
    expenseId: string
    clientId: string | null
    expenseType: string
    description: string
    amount: number
    paymentDate: string
    supplierId: string | null
    supplierName: string
    paymentReference: string | null
    actorUserId: string | null
  }
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_finance.expenses (
      expense_id, client_id, expense_type, description, currency,
      subtotal, tax_rate, tax_amount, total_amount,
      exchange_rate_to_clp, total_amount_clp,
      payment_date, payment_status, payment_method,
      payment_account_id, payment_reference,
      document_number, document_date, due_date,
      supplier_id, supplier_name, supplier_invoice_number,
      payroll_period_id, payroll_entry_id, member_id, member_name,
      social_security_type, social_security_institution, social_security_period,
      tax_type, tax_period, tax_form_number,
      miscellaneous_category, service_line, is_recurring, recurrence_frequency,
      is_reconciled,
      cost_category, cost_is_direct, allocated_client_id,
      direct_overhead_scope, direct_overhead_kind, direct_overhead_member_id,
      notes, created_by_user_id,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, 'CLP',
      $5, 0, 0, $5,
      1, $5,
      $6::date, 'paid', NULL,
      NULL, $7,
      NULL, NULL, NULL,
      $8, $9, NULL,
      NULL, NULL, NULL, NULL,
      NULL, NULL, NULL,
      NULL, NULL, NULL,
      NULL, NULL, FALSE, NULL,
      FALSE,
      'operational', FALSE, NULL,
      NULL, NULL, NULL,
      NULL, $10,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
    [
      expenseId, clientId, expenseType, description,
      amount, paymentDate, paymentReference,
      supplierId, supplierName, actorUserId
    ]
  )
}

// ─── Core operation ──────────────────────────────────────────────────────────

export const recordFactoringOperation = async (
  input: RecordFactoringOperationInput
): Promise<RecordFactoringOperationResult> => {
  await assertFinanceSlice2PostgresReady()

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    // 1. Lock income row — prevent concurrent modifications
    const incomeRes = await client.query<{
      income_id: string
      client_id: string | null
      total_amount: unknown
      payment_status: string
      collection_method: string | null
      currency: string
    }>(
      `SELECT income_id, client_id, total_amount, payment_status, collection_method, currency
       FROM greenhouse_finance.income WHERE income_id = $1 FOR UPDATE`,
      [input.incomeId]
    )
    const incomeRows = incomeRes.rows

    if (incomeRows.length === 0) {
      throw new FinanceValidationError('Factura no encontrada.', 404)
    }

    const income = incomeRows[0]

    if (income.payment_status === 'paid') {
      throw new FinanceValidationError('Esta factura ya fue cobrada completamente.', 409)
    }

    if (income.collection_method === 'factored') {
      throw new FinanceValidationError('Esta factura ya fue cedida a factoring.', 409)
    }

    // 2. Validate factoring provider
    const providerRes = await client.query<{ provider_id: string; provider_name: string }>(
      `SELECT provider_id, provider_name
       FROM greenhouse_core.providers
       WHERE provider_id = $1 AND provider_type = 'factoring' AND active = true`,
      [input.factoringProviderId]
    )
    const providerRows = providerRes.rows

    if (providerRows.length === 0) {
      throw new FinanceValidationError(
        'El proveedor de factoring no existe o no está activo.',
        404
      )
    }

    const providerName = normalizeString(providerRows[0].provider_name)
    const feeTotal = roundCurrency(input.interestAmount + input.advisoryFeeAmount)
    const nominalAmount = roundCurrency(toNumber(income.total_amount))

    // 3. Generate IDs
    const operationId = `FO-${randomUUID().slice(0, 8).toUpperCase()}`
    const paymentId = `pay-${randomUUID()}`
    const expenseInterestId = `EXP-${randomUUID().slice(0, 8).toUpperCase()}`
    const expenseAdvisoryId = `EXP-${randomUUID().slice(0, 8).toUpperCase()}`

    const refLabel = input.externalReference ? `Nº ${input.externalReference} ` : ''

    // 4. INSERT factoring_operations
    await client.query(
      `INSERT INTO greenhouse_finance.factoring_operations (
        operation_id, income_id, factoring_provider_id,
        nominal_amount, advance_amount, fee_amount, fee_rate,
        interest_amount, advisory_fee_amount,
        operation_date, settlement_date, status,
        external_reference, external_folio,
        linked_payment_id, linked_expense_id,
        notes, created_by_user_id,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9,
        $10::date, $11::date, 'active',
        $12, $13,
        $14, $15,
        NULL, $16,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      [
        operationId, input.incomeId, input.factoringProviderId,
        nominalAmount, input.advanceAmount, feeTotal, input.feeRate,
        input.interestAmount, input.advisoryFeeAmount,
        input.operationDate, input.settlementDate || null,
        input.externalReference || null, input.externalFolio || null,
        paymentId, expenseInterestId,
        input.actorUserId
      ]
    )

    // 5. INSERT income_payment (advance — cash actually received)
    await client.query(
      `INSERT INTO greenhouse_finance.income_payments (
        payment_id, income_id, payment_date, amount, currency,
        reference, payment_method, payment_account_id, payment_source,
        notes, recorded_by_user_id, recorded_at, is_reconciled, created_at
      )
      VALUES (
        $1, $2, $3::date, $4, 'CLP',
        $5, NULL, $6, 'factoring_proceeds',
        NULL, $7, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP
      )`,
      [
        paymentId, input.incomeId, input.operationDate,
        input.advanceAmount,
        `Factoring ${refLabel}— ${providerName}`,
        input.paymentAccountId,
        input.actorUserId
      ]
    )

    // 6. INSERT expense — interés de tasa (factoring_fee)
    await insertExpenseInTransaction(client, {
      expenseId: expenseInterestId,
      clientId: income.client_id,
      expenseType: 'factoring_fee',
      description: `Interés factoring ${refLabel}— ${providerName}`,
      amount: input.interestAmount,
      paymentDate: input.operationDate,
      supplierId: null, // factoring_provider_id is not a greenhouse_finance.suppliers FK
      supplierName: providerName,
      paymentReference: input.externalReference || null,
      actorUserId: input.actorUserId
    })

    // 7. INSERT expense — asesoría fija (factoring_advisory)
    await insertExpenseInTransaction(client, {
      expenseId: expenseAdvisoryId,
      clientId: income.client_id,
      expenseType: 'factoring_advisory',
      description: `Asesoría factoring ${refLabel}— ${providerName}`,
      amount: input.advisoryFeeAmount,
      paymentDate: input.operationDate,
      supplierId: null, // factoring_provider_id is not a greenhouse_finance.suppliers FK
      supplierName: providerName,
      paymentReference: input.externalReference || null,
      actorUserId: input.actorUserId
    })

    // 8. UPDATE income — marcar como cobrada al valor nominal completo
    // NOTA INTENCIONAL: income.amount_paid = nominalAmount (no el advance).
    // La diferencia (fee) no es deuda del cliente — es costo financiero de Efeonce.
    // income_payment.amount = advanceAmount (conciliable contra el banco).
    await client.query(
      `UPDATE greenhouse_finance.income
       SET amount_paid = $2,
           payment_status = 'paid',
           collection_method = 'factored',
           updated_at = CURRENT_TIMESTAMP
       WHERE income_id = $1`,
      [input.incomeId, nominalAmount]
    )

    return {
      operationId,
      incomeId: input.incomeId,
      nominalAmount,
      advanceAmount: input.advanceAmount,
      feeTotal,
      interestAmount: input.interestAmount,
      advisoryFeeAmount: input.advisoryFeeAmount,
      status: 'active',
      paymentId,
      expenseInterestId,
      expenseAdvisoryId
    }
  })
}
