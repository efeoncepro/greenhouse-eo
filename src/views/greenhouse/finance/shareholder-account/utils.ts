import type {
  ShareholderAccountBalance,
  ShareholderAccountMovement,
  ShareholderAccountStatus,
  ShareholderAccountSummary,
  ShareholderMovementSourceSummary,
  ShareholderMovementSourceType
} from './types'

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

export const SHAREHOLDER_MOVEMENT_SOURCE_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manual', helper: 'Sin origen vinculado' },
  { value: 'expense', label: 'Egreso', helper: 'Documento de gasto' },
  { value: 'income', label: 'Ingreso', helper: 'Documento de venta' },
  { value: 'expense_payment', label: 'Pago de egreso', helper: 'Cobro ya liquidado de un gasto' },
  { value: 'income_payment', label: 'Pago de ingreso', helper: 'Cobro asociado a un ingreso' },
  { value: 'settlement_group', label: 'Liquidación', helper: 'Origen derivado de settlement' }
] as const

type ShareholderMovementSourceTypeMeta = {
  label: string
  helper: string
  color: 'warning' | 'success' | 'info' | 'secondary'
}

export const SHAREHOLDER_MOVEMENT_SEARCHABLE_SOURCE_TYPES = new Set<ShareholderMovementSourceType>([
  'expense',
  'income',
  'expense_payment',
  'income_payment'
])

export const normalizeShareholderMovementSourceType = (value: unknown): ShareholderMovementSourceType => {
  const normalized = toNullableString(value) as ShareholderMovementSourceType | null

  return normalized || 'manual'
}

export const getShareholderMovementSourceTypeMeta = (
  sourceType: ShareholderMovementSourceType | null
): ShareholderMovementSourceTypeMeta => {
  if (sourceType === 'expense') return { label: 'Egreso', helper: 'Documento de gasto', color: 'warning' as const }
  if (sourceType === 'income') return { label: 'Ingreso', helper: 'Documento de venta', color: 'success' as const }
  if (sourceType === 'expense_payment') return { label: 'Pago de egreso', helper: 'Pago asociado al gasto', color: 'warning' as const }
  if (sourceType === 'income_payment') return { label: 'Pago de ingreso', helper: 'Pago asociado al ingreso', color: 'success' as const }
  if (sourceType === 'settlement_group') return { label: 'Liquidación', helper: 'Origen derivado de settlement', color: 'info' as const }
  if (sourceType === 'manual') return { label: 'Manual', helper: 'Sin origen vinculado', color: 'secondary' as const }

  return { label: sourceType ? String(sourceType) : 'Sin origen', helper: 'Origen no clasificado', color: 'secondary' as const }
}

export const getShareholderMovementSourceStatusMeta = (status: string | null) => {
  if (!status) {
    return { label: 'Sin estado', color: 'secondary' as const }
  }

  const normalized = status.toLowerCase()

  if (['paid', 'reconciled', 'posted', 'active', 'emitted'].includes(normalized)) {
    return { label: status, color: 'success' as const }
  }

  if (['partial', 'scheduled', 'pending', 'draft'].includes(normalized)) {
    return { label: status, color: 'info' as const }
  }

  if (['overdue', 'rejected', 'failed', 'cancelled', 'annulled'].includes(normalized)) {
    return { label: status, color: 'warning' as const }
  }

  return { label: status, color: 'secondary' as const }
}

export const normalizeShareholderMovementSource = (item: Record<string, unknown>): ShareholderMovementSourceSummary => {
  const sourceType = normalizeShareholderMovementSourceType(readValue(item, ['sourceType', 'source_type']))
  const sourceId = toNullableString(readValue(item, ['sourceId', 'source_id']))

  const label = toNullableString(readValue(item, ['label', 'sourceLabel', 'source_label']))
    || (sourceType === 'manual' ? 'Movimiento manual' : sourceId || 'Origen sin nombre')

  return {
    sourceType,
    sourceId,
    label,
    subtitle: toNullableString(readValue(item, ['subtitle', 'sourceSubtitle', 'source_subtitle'])),
    status: toNullableString(readValue(item, ['status', 'sourceStatus', 'source_status'])),
    amount: readValue(item, ['amount', 'sourceAmount', 'source_amount']) !== null
      ? toNumber(readValue(item, ['amount', 'sourceAmount', 'source_amount']))
      : null,
    currency: toNullableString(readValue(item, ['currency', 'sourceCurrency', 'source_currency'])),
    date: toNullableString(readValue(item, ['date', 'sourceDate', 'source_date'])),
    href: toNullableString(readValue(item, ['href', 'sourceHref', 'source_href'])),
    linkedExpenseId: toNullableString(readValue(item, ['linkedExpenseId', 'linked_expense_id'])),
    linkedIncomeId: toNullableString(readValue(item, ['linkedIncomeId', 'linked_income_id'])),
    linkedPaymentType: toNullableString(readValue(item, ['linkedPaymentType', 'linked_payment_type'])),
    linkedPaymentId: toNullableString(readValue(item, ['linkedPaymentId', 'linked_payment_id'])),
    sourceSettlementGroupId: toNullableString(readValue(item, ['sourceSettlementGroupId', 'source_settlement_group_id', 'settlementGroupId', 'settlement_group_id']))
  }
}

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
    accountNumber: toNullableString(readValue(item, ['accountNumber', 'account_number'])),
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
  accountId: toNullableString(readValue(item, ['accountId', 'account_id'])) ?? undefined,
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
  sourceType: normalizeShareholderMovementSourceType(readValue(item, ['sourceType', 'source_type'])),
  sourceId: toNullableString(readValue(item, ['sourceId', 'source_id'])),
  source: (() => {
    const nestedSource = readValue(item, ['source'])

    if (isRecord(nestedSource)) {
      return normalizeShareholderMovementSource(nestedSource)
    }

    const hasFlatSourceData = [
      'sourceType',
      'source_type',
      'sourceId',
      'source_id',
      'sourceLabel',
      'source_label',
      'sourceHref',
      'source_href'
    ].some(key => item[key] !== undefined && item[key] !== null)

    return hasFlatSourceData ? normalizeShareholderMovementSource(item) : null
  })(),
  recordedAt: toNullableString(readValue(item, ['recordedAt', 'recorded_at']))
})

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
