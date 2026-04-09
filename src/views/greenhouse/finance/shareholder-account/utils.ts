import type { ShareholderAccountBalance, ShareholderAccountMovement, ShareholderAccountStatus, ShareholderAccountSummary } from './types'

const readValue = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key]
    }
  }

  return null
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

const toStringValue = (value: unknown, fallback = '—') =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback

const toNullableString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

export const formatMoney = (amount: number, currency: string = 'CLP') =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(amount)

export const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [year, month, day] = date.split('-')

  if (!year || !month || !day) {
    return date
  }

  return `${day}/${month}/${year}`
}

export const formatPercent = (value: number | null) =>
  value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}%`

export const getAccountStatusMeta = (status: ShareholderAccountStatus | null) => {
  if (status === 'active') return { label: 'Activa', color: 'success' as const }
  if (status === 'frozen') return { label: 'Bloqueada', color: 'warning' as const }
  if (status === 'closed') return { label: 'Cerrada', color: 'secondary' as const }

  return { label: status ? String(status) : 'Sin estado', color: 'secondary' as const }
}

export const getBalanceMeta = (balanceClp: number) => {
  if (balanceClp > 0) {
    return {
      label: 'Empresa debe',
      color: 'success' as const,
      hint: 'Saldo a favor del accionista'
    }
  }

  if (balanceClp < 0) {
    return {
      label: 'Accionista debe',
      color: 'warning' as const,
      hint: 'Saldo a favor de la empresa'
    }
  }

  return {
    label: 'Saldado',
    color: 'secondary' as const,
    hint: 'Cuenta en cero'
  }
}

export const getDirectionMeta = (direction: string | null) => {
  if (direction === 'credit') {
    return {
      label: 'Crédito',
      color: 'success' as const,
      helper: 'La empresa debe al accionista'
    }
  }

  if (direction === 'debit') {
    return {
      label: 'Débito',
      color: 'warning' as const,
      helper: 'El accionista debe a la empresa'
    }
  }

  return {
    label: direction || 'Sin dirección',
    color: 'secondary' as const,
    helper: 'Sin clasificación'
  }
}

export const getMovementTypeLabel = (movementType: string | null) => {
  const labels: Record<string, string> = {
    expense_paid_by_shareholder: 'Gasto pagado por el accionista',
    personal_withdrawal: 'Retiro personal',
    reimbursement: 'Reembolso de la empresa',
    return_to_company: 'Devolución a la empresa',
    salary_advance: 'Adelanto de sueldo',
    capital_contribution: 'Aporte de capital',
    other: 'Otro'
  }

  return labels[movementType || ''] || movementType || 'Sin tipo'
}

export const normalizeShareholderAccount = (item: Record<string, unknown>): ShareholderAccountSummary => {
  const balanceClp = toNumber(readValue(item, ['balanceClp', 'balance_clp', 'currentBalanceClp', 'current_balance_clp']))
  const currency = toStringValue(readValue(item, ['currency', 'baseCurrency', 'base_currency']), 'CLP')

  return {
    accountId: toStringValue(readValue(item, ['accountId', 'account_id'])),
    accountName: toStringValue(readValue(item, ['accountName', 'account_name'])),
    shareholderName: toStringValue(readValue(item, ['shareholderName', 'shareholder_name', 'profileName', 'profile_name', 'name']), 'Sin nombre'),
    profileId: toNullableString(readValue(item, ['profileId', 'profile_id'])),
    memberId: toNullableString(readValue(item, ['memberId', 'member_id'])),
    ownershipPercentage: readValue(item, ['ownershipPercentage', 'ownership_percentage']) !== null
      ? toNumber(readValue(item, ['ownershipPercentage', 'ownership_percentage']))
      : null,
    status: (toNullableString(readValue(item, ['status'])) || 'active') as ShareholderAccountStatus,
    balanceClp,
    currency,
    lastMovementAt: toNullableString(readValue(item, ['lastMovementAt', 'last_movement_at', 'lastMovementDate', 'last_movement_date'])),
    movementCount: toNumber(readValue(item, ['movementCount', 'movement_count', 'totalMovements', 'total_movements'])),
    notes: toNullableString(readValue(item, ['notes', 'description']))
  }
}

export const normalizeShareholderBalance = (item: Record<string, unknown>): ShareholderAccountBalance => ({
  balanceClp: toNumber(readValue(item, ['balanceClp', 'balance_clp', 'currentBalanceClp', 'current_balance_clp'])),
  currency: toStringValue(readValue(item, ['currency', 'baseCurrency', 'base_currency']), 'CLP'),
  status: (toNullableString(readValue(item, ['status'])) || null) as ShareholderAccountStatus | null,
  lastMovementAt: toNullableString(readValue(item, ['lastMovementAt', 'last_movement_at'])),
  movementCount: toNumber(readValue(item, ['movementCount', 'movement_count', 'totalMovements', 'total_movements']))
})

export const normalizeShareholderMovement = (item: Record<string, unknown>): ShareholderAccountMovement => ({
  movementId: toStringValue(readValue(item, ['movementId', 'movement_id'])),
  movementType: toStringValue(readValue(item, ['movementType', 'movement_type'])),
  direction: (toNullableString(readValue(item, ['direction'])) || 'credit') as ShareholderAccountMovement['direction'],
  amount: toNumber(readValue(item, ['amount'])),
  amountClp: readValue(item, ['amountClp', 'amount_clp']) !== null ? toNumber(readValue(item, ['amountClp', 'amount_clp'])) : null,
  currency: toStringValue(readValue(item, ['currency']), 'CLP'),
  movementDate: toNullableString(readValue(item, ['movementDate', 'movement_date'])),
  description: toNullableString(readValue(item, ['description', 'memo', 'notes'])),
  evidenceUrl: toNullableString(readValue(item, ['evidenceUrl', 'evidence_url'])),
  linkedExpenseId: toNullableString(readValue(item, ['linkedExpenseId', 'linked_expense_id'])),
  linkedIncomeId: toNullableString(readValue(item, ['linkedIncomeId', 'linked_income_id'])),
  linkedPaymentId: toNullableString(readValue(item, ['linkedPaymentId', 'linked_payment_id'])),
  settlementGroupId: toNullableString(readValue(item, ['settlementGroupId', 'settlement_group_id'])),
  recordedAt: toNullableString(readValue(item, ['recordedAt', 'recorded_at']))
})

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

