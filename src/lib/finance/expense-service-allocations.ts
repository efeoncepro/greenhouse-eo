import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'

export type ExpenseServiceAllocationSource = 'manual' | 'rule' | 'imported' | 'backfill'
export type ExpenseServiceAllocationStatus = 'draft' | 'approved' | 'rejected'

export type ExpenseServiceAllocation = {
  allocationId: string
  expenseId: string
  serviceId: string
  clientId: string
  periodYear: number
  periodMonth: number
  allocatedAmountClp: number
  allocationSource: ExpenseServiceAllocationSource
  evidence: Record<string, unknown>
  reviewStatus: ExpenseServiceAllocationStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  approvedBy: string | null
  approvedAt: string | null
  rejectedBy: string | null
  rejectedAt: string | null
  rejectionReason: string | null
}

export type CreateExpenseServiceAllocationInput = {
  expenseId: string
  serviceId: string
  clientId?: string | null
  periodYear?: number | null
  periodMonth?: number | null
  allocatedAmountClp: number
  allocationSource?: ExpenseServiceAllocationSource
  evidence?: Record<string, unknown>
  actorId: string
}

export type DecideExpenseServiceAllocationInput = {
  allocationId: string
  actorId: string
}

export type RejectExpenseServiceAllocationInput = DecideExpenseServiceAllocationInput & {
  rejectionReason: string
}

type ExpenseServiceAllocationRow = {
  allocation_id: string
  expense_id: string
  service_id: string
  client_id: string
  period_year: number
  period_month: number
  allocated_amount_clp: string | number
  allocation_source: string
  evidence_json: unknown
  review_status: string
  created_by: string
  created_at: string | Date
  updated_at: string | Date
  approved_by: string | null
  approved_at: string | Date | null
  rejected_by: string | null
  rejected_at: string | Date | null
  rejection_reason: string | null
}

type QueryableClient = Pick<PoolClient, 'query'>

export class ExpenseServiceAllocationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpenseServiceAllocationError'
  }
}

export class ExpenseServiceAllocationConflictError extends ExpenseServiceAllocationError {
  constructor(message = 'An active service allocation already exists for this expense and service.') {
    super(message)
    this.name = 'ExpenseServiceAllocationConflictError'
  }
}

const trimRequired = (value: string | null | undefined, label: string) => {
  const trimmed = value?.trim()

  if (!trimmed) {
    throw new ExpenseServiceAllocationError(`${label} is required.`)
  }

  return trimmed
}

const normalizeOptionalId = (value: string | null | undefined) => {
  const trimmed = value?.trim()

  return trimmed || null
}

const assertPeriod = (year: number | null | undefined, month: number | null | undefined) => {
  if (year == null && month == null) return

  if (!Number.isInteger(year) || Number(year) < 2000 || Number(year) > 2100) {
    throw new ExpenseServiceAllocationError('periodYear must be an integer between 2000 and 2100.')
  }

  if (!Number.isInteger(month) || Number(month) < 1 || Number(month) > 12) {
    throw new ExpenseServiceAllocationError('periodMonth must be an integer between 1 and 12.')
  }
}

const assertAmount = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ExpenseServiceAllocationError('allocatedAmountClp must be a positive finite number.')
  }

  return Math.round(amount * 100) / 100
}

const asIso = (value: string | Date | null): string | null => {
  if (value == null) return null

  return value instanceof Date ? value.toISOString() : value
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return value as Record<string, unknown>
}

const mapRow = (row: ExpenseServiceAllocationRow): ExpenseServiceAllocation => ({
  allocationId: row.allocation_id,
  expenseId: row.expense_id,
  serviceId: row.service_id,
  clientId: row.client_id,
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  allocatedAmountClp: Number(row.allocated_amount_clp),
  allocationSource: row.allocation_source as ExpenseServiceAllocationSource,
  evidence: asRecord(row.evidence_json),
  reviewStatus: row.review_status as ExpenseServiceAllocationStatus,
  createdBy: row.created_by,
  createdAt: asIso(row.created_at) ?? '',
  updatedAt: asIso(row.updated_at) ?? '',
  approvedBy: row.approved_by,
  approvedAt: asIso(row.approved_at),
  rejectedBy: row.rejected_by,
  rejectedAt: asIso(row.rejected_at),
  rejectionReason: row.rejection_reason
})

const mapDbError = (error: unknown): never => {
  if (error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '23505') {
    throw new ExpenseServiceAllocationConflictError()
  }

  throw error
}

const oneRow = (rows: ExpenseServiceAllocationRow[], message: string) => {
  const row = rows[0]

  if (!row) {
    throw new ExpenseServiceAllocationError(message)
  }

  return mapRow(row)
}

export const createExpenseServiceAllocation = async (
  input: CreateExpenseServiceAllocationInput
): Promise<ExpenseServiceAllocation> => {
  const expenseId = trimRequired(input.expenseId, 'expenseId')
  const serviceId = trimRequired(input.serviceId, 'serviceId')
  const actorId = trimRequired(input.actorId, 'actorId')
  const clientId = normalizeOptionalId(input.clientId)
  const amountClp = assertAmount(input.allocatedAmountClp)
  const allocationSource = input.allocationSource ?? 'manual'

  assertPeriod(input.periodYear, input.periodMonth)

  try {
    return await withTransaction(async (client: QueryableClient) => {
      const result = await client.query<ExpenseServiceAllocationRow>(
        `INSERT INTO greenhouse_finance.expense_service_allocations (
           allocation_id,
           expense_id,
           service_id,
           client_id,
           period_year,
           period_month,
           allocated_amount_clp,
           allocation_source,
           evidence_json,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
         RETURNING *`,
        [
          `esa-${randomUUID()}`,
          expenseId,
          serviceId,
          clientId,
          input.periodYear ?? null,
          input.periodMonth ?? null,
          amountClp,
          allocationSource,
          JSON.stringify(input.evidence ?? {}),
          actorId
        ]
      )

      return oneRow(result.rows, 'Expense service allocation was not created.')
    })
  } catch (error) {
    return mapDbError(error)
  }
}

export const approveExpenseServiceAllocation = async (
  input: DecideExpenseServiceAllocationInput
): Promise<ExpenseServiceAllocation> => {
  const allocationId = trimRequired(input.allocationId, 'allocationId')
  const actorId = trimRequired(input.actorId, 'actorId')

  return withTransaction(async (client: QueryableClient) => {
    const result = await client.query<ExpenseServiceAllocationRow>(
      `UPDATE greenhouse_finance.expense_service_allocations
       SET review_status = 'approved',
           approved_by = $2,
           approved_at = CURRENT_TIMESTAMP,
           rejected_by = NULL,
           rejected_at = NULL,
           rejection_reason = NULL
       WHERE allocation_id = $1
         AND review_status = 'draft'
       RETURNING *`,
      [allocationId, actorId]
    )

    return oneRow(result.rows, 'Only draft expense service allocations can be approved.')
  })
}

export const rejectExpenseServiceAllocation = async (
  input: RejectExpenseServiceAllocationInput
): Promise<ExpenseServiceAllocation> => {
  const allocationId = trimRequired(input.allocationId, 'allocationId')
  const actorId = trimRequired(input.actorId, 'actorId')
  const rejectionReason = trimRequired(input.rejectionReason, 'rejectionReason')

  if (rejectionReason.length < 10) {
    throw new ExpenseServiceAllocationError('rejectionReason must be at least 10 characters.')
  }

  return withTransaction(async (client: QueryableClient) => {
    const result = await client.query<ExpenseServiceAllocationRow>(
      `UPDATE greenhouse_finance.expense_service_allocations
       SET review_status = 'rejected',
           rejected_by = $2,
           rejected_at = CURRENT_TIMESTAMP,
           rejection_reason = $3,
           approved_by = NULL,
           approved_at = NULL
       WHERE allocation_id = $1
         AND review_status = 'draft'
       RETURNING *`,
      [allocationId, actorId, rejectionReason]
    )

    return oneRow(result.rows, 'Only draft expense service allocations can be rejected.')
  })
}

export const listExpenseServiceAllocationsForExpense = async (
  expenseIdInput: string
): Promise<ExpenseServiceAllocation[]> => {
  const expenseId = trimRequired(expenseIdInput, 'expenseId')

  const rows = await query<ExpenseServiceAllocationRow>(
    `SELECT *
     FROM greenhouse_finance.expense_service_allocations
     WHERE expense_id = $1
     ORDER BY created_at DESC, allocation_id DESC`,
    [expenseId]
  )

  return rows.map(mapRow)
}
