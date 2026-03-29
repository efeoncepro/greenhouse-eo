import type { PayrollCurrency } from '@/types/payroll'

type BuildPayrollReceiptDownloadFilenameInput = {
  entryId: string
  periodId?: string | null
  memberId?: string | null
  memberName?: string | null
  payRegime?: 'chile' | 'international' | null
  currency?: PayrollCurrency | null
}

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const sanitizeFilePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

const formatPeriodPart = (periodId?: string | null) => {
  if (!periodId) return 'periodo'

  const [yearPart, monthPart] = periodId.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return sanitizeFilePart(periodId)
  }

  return `${MONTH_NAMES[month - 1] ?? `mes-${month}`}-${year}`
}

export const buildPayrollReceiptDownloadFilename = (input: BuildPayrollReceiptDownloadFilenameInput) => {
  const prefix = input.payRegime === 'international' || input.currency === 'USD'
    ? 'payment-statement'
    : 'recibo'

  const periodPart = formatPeriodPart(input.periodId)

  const identityPart = input.memberName
    ? sanitizeFilePart(input.memberName)
    : input.memberId
      ? sanitizeFilePart(input.memberId)
      : sanitizeFilePart(`entry-${input.entryId}`)

  return `${prefix}-${periodPart}-${identityPart}.pdf`
}
