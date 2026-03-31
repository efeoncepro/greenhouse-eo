import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  toNumber,
  FinanceValidationError,
  ACCOUNT_TYPES,
  type AccountType
} from '@/lib/finance/shared'
import { updateFinanceAccountInPostgres, shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { runFinanceQuery, getFinanceProjectId } from '@/lib/finance/shared'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: accountId } = await params
    const body = await request.json()

    try {
      await updateFinanceAccountInPostgres({
        accountId,
        accountName: body.accountName !== undefined ? assertNonEmptyString(body.accountName, 'accountName') : undefined,
        bankName: body.bankName !== undefined ? assertNonEmptyString(body.bankName, 'bankName') : undefined,
        currency: body.currency !== undefined ? assertValidCurrency(body.currency) : undefined,
        accountType: body.accountType !== undefined
          ? (ACCOUNT_TYPES.includes(body.accountType) ? body.accountType as AccountType : 'checking')
          : undefined,
        country: body.country !== undefined ? normalizeString(body.country) || 'CL' : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        openingBalance: body.openingBalance !== undefined ? toNumber(body.openingBalance) : undefined,
        openingBalanceDate: body.openingBalanceDate !== undefined
          ? (body.openingBalanceDate ? normalizeString(body.openingBalanceDate) : null)
          : undefined,
        accountNumber: body.accountNumber !== undefined
          ? (body.accountNumber ? normalizeString(body.accountNumber) : null)
          : undefined,
        accountNumberFull: body.accountNumberFull !== undefined
          ? (body.accountNumberFull ? normalizeString(body.accountNumberFull) : null)
          : undefined,
        notes: body.notes !== undefined ? (body.notes ? normalizeString(body.notes) : null) : undefined
      })
    } catch (error) {
      if (!shouldFallbackFromFinancePostgres(error)) {
        throw error
      }

      if (!isFinanceBigQueryWriteEnabled()) {
        return NextResponse.json(
          {
            error: 'Finance BigQuery fallback write is disabled. Postgres write path failed.',
            code: 'FINANCE_BQ_WRITE_DISABLED'
          },
          { status: 503 }
        )
      }

      await ensureFinanceInfrastructure()
      const projectId = getFinanceProjectId()

      const existing = await runFinanceQuery<{ account_id: string }>(`
        SELECT account_id
        FROM \`${projectId}.greenhouse.fin_accounts\`
        WHERE account_id = @accountId
      `, { accountId })

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const updates: string[] = []
      const updateParams: Record<string, unknown> = { accountId }

      if (body.accountName !== undefined) {
        updates.push('account_name = @accountName')
        updateParams.accountName = assertNonEmptyString(body.accountName, 'accountName')
      }

      if (body.bankName !== undefined) {
        updates.push('bank_name = @bankName')
        updateParams.bankName = assertNonEmptyString(body.bankName, 'bankName')
      }

      if (body.currency !== undefined) {
        updates.push('currency = @currency')
        updateParams.currency = assertValidCurrency(body.currency)
      }

      if (body.accountType !== undefined) {
        const accountType = ACCOUNT_TYPES.includes(body.accountType) ? body.accountType as AccountType : 'checking'

        updates.push('account_type = @accountType')
        updateParams.accountType = accountType
      }

      if (body.country !== undefined) {
        updates.push('country = @country')
        updateParams.country = normalizeString(body.country) || 'CL'
      }

      if (body.isActive !== undefined) {
        updates.push('is_active = @isActive')
        updateParams.isActive = Boolean(body.isActive)
      }

      if (body.openingBalance !== undefined) {
        updates.push('opening_balance = @openingBalance')
        updateParams.openingBalance = toNumber(body.openingBalance)
      }

      if (body.openingBalanceDate !== undefined) {
        updates.push('opening_balance_date = @openingBalanceDate')
        updateParams.openingBalanceDate = body.openingBalanceDate ? normalizeString(body.openingBalanceDate) : null
      }

      if (body.accountNumber !== undefined) {
        updates.push('account_number = @accountNumber')
        updateParams.accountNumber = body.accountNumber ? normalizeString(body.accountNumber) : null
      }

      if (body.accountNumberFull !== undefined) {
        updates.push('account_number_full = @accountNumberFull')
        updateParams.accountNumberFull = body.accountNumberFull ? normalizeString(body.accountNumberFull) : null
      }

      if (body.notes !== undefined) {
        updates.push('notes = @notes')
        updateParams.notes = body.notes ? normalizeString(body.notes) : null
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }

      updates.push('updated_at = CURRENT_TIMESTAMP()')

      await runFinanceQuery(`
        UPDATE \`${projectId}.greenhouse.fin_accounts\`
        SET ${updates.join(', ')}
        WHERE account_id = @accountId
      `, updateParams)
    }

    return NextResponse.json({ accountId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
