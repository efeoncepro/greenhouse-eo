import 'server-only'

import { normalizeString, roundCurrency, toDateString, toNumber, toTimestampString } from '@/lib/finance/shared'

export type IncomePaymentRecord = {
  paymentId: string
  paymentDate: string | null
  amount: number
  currency: string | null
  reference: string | null
  paymentMethod: string | null
  paymentAccountId: string | null
  notes: string | null
  recordedBy: string | null
  recordedAt: string | null
  isReconciled: boolean
  reconciliationRowId: string | null
  reconciledAt: string | null
  reconciledBy: string | null
}

type IncomePaymentContext = {
  paymentId: string
  paymentDate: string | null
  reference: string | null
  amount: number
}

const normalizeIncomePaymentRecord = (value: unknown, index: number): IncomePaymentRecord | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const paymentId = normalizeString(record.paymentId) || `legacy_payment_${index + 1}`

  return {
    paymentId,
    paymentDate: toDateString(record.paymentDate as string | { value?: string } | null),
    amount: roundCurrency(toNumber(record.amount)),
    currency: normalizeString(record.currency) || null,
    reference: normalizeString(record.reference) || null,
    paymentMethod: normalizeString(record.paymentMethod) || null,
    paymentAccountId: normalizeString(record.paymentAccountId) || null,
    notes: normalizeString(record.notes) || null,
    recordedBy: normalizeString(record.recordedBy) || null,
    recordedAt: toTimestampString(record.recordedAt as string | { value?: string } | null),
    isReconciled: Boolean(record.isReconciled),
    reconciliationRowId: normalizeString(record.reconciliationRowId) || null,
    reconciledAt: toTimestampString(record.reconciledAt as string | { value?: string } | null),
    reconciledBy: normalizeString(record.reconciledBy) || null
  }
}

export const parseIncomePaymentsReceived = (value: unknown): IncomePaymentRecord[] => {
  try {
    if (!value) {
      return []
    }

    const parsed = typeof value === 'string' ? JSON.parse(value) : value

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((record, index) => normalizeIncomePaymentRecord(record, index))
      .filter((record): record is IncomePaymentRecord => Boolean(record))
  } catch {
    return []
  }
}

export const getLatestIncomePaymentContext = (paymentsReceived: unknown): IncomePaymentContext | null => {
  const payments = parseIncomePaymentsReceived(paymentsReceived)
    .filter(record => record.paymentDate)
    .sort((left, right) => {
      const leftDate = left.paymentDate || ''
      const rightDate = right.paymentDate || ''

      if (leftDate !== rightDate) {
        return rightDate.localeCompare(leftDate)
      }

      return (right.recordedAt || '').localeCompare(left.recordedAt || '')
    })

  if (payments.length === 0) {
    return null
  }

  const latest = payments[0]

  return {
    paymentId: latest.paymentId,
    paymentDate: latest.paymentDate,
    reference: latest.reference,
    amount: latest.amount
  }
}

export const listUnreconciledIncomePayments = (paymentsReceived: unknown) =>
  parseIncomePaymentsReceived(paymentsReceived).filter(record => !record.isReconciled)

export const findIncomePaymentRecord = (paymentsReceived: unknown, paymentId: string) => {
  const payments = parseIncomePaymentsReceived(paymentsReceived)
  const index = payments.findIndex(record => record.paymentId === paymentId)

  if (index < 0) {
    return null
  }

  return {
    payments,
    payment: payments[index],
    index
  }
}

export const summarizeIncomeReconciliation = ({
  totalAmount,
  amountPaid,
  payments
}: {
  totalAmount: number
  amountPaid?: number
  payments: IncomePaymentRecord[]
}) => {
  const paidAmount = roundCurrency(
    amountPaid !== undefined
      ? amountPaid
      : payments.reduce((sum, payment) => sum + payment.amount, 0)
  )

  const fullyPaid = totalAmount > 0 && paidAmount >= totalAmount - 0.01
  const reconciledPayments = payments.filter(payment => payment.isReconciled && payment.reconciliationRowId)
  const allPaymentsReconciled = payments.length > 0 && payments.every(payment => payment.isReconciled && payment.reconciliationRowId)

  const latestReconciledPayment = reconciledPayments
    .slice()
    .sort((left, right) => {
      const leftSort = left.reconciledAt || left.paymentDate || left.recordedAt || ''
      const rightSort = right.reconciledAt || right.paymentDate || right.recordedAt || ''

      return rightSort.localeCompare(leftSort)
    })[0] ?? null

  return {
    isReconciled: fullyPaid && allPaymentsReconciled,
    reconciliationId: fullyPaid ? latestReconciledPayment?.reconciliationRowId ?? null : null,
    paidAmount,
    unreconciledPaymentCount: payments.filter(payment => !payment.isReconciled).length
  }
}

export const toIncomePaymentCashEntries = ({
  exchangeRateToClp,
  paymentsReceived
}: {
  exchangeRateToClp: number
  paymentsReceived: unknown
}) =>
  parseIncomePaymentsReceived(paymentsReceived)
    .filter(payment => payment.paymentDate && payment.amount > 0)
    .map(payment => ({
      paymentId: payment.paymentId,
      paymentDate: payment.paymentDate as string,
      reference: payment.reference,
      amount: payment.amount,
      amountClp: roundCurrency(payment.amount * (exchangeRateToClp > 0 ? exchangeRateToClp : 1))
    }))
