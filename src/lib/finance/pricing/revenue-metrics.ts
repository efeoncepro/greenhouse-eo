import type {
  LineItemForMetrics,
  LineRecurrenceType,
  QuotationBillingFrequency,
  QuotationRevenueMetrics,
  ResolvedLineRecurrence,
  RevenueType
} from './contracts'

export const resolveLineRecurrence = (
  lineRecurrence: LineRecurrenceType,
  billingFrequency: QuotationBillingFrequency
): ResolvedLineRecurrence => {
  if (lineRecurrence === 'recurring') return 'recurring'
  if (lineRecurrence === 'one_time') return 'one_time'

  return billingFrequency === 'monthly' ? 'recurring' : 'one_time'
}

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

export interface ComputeRevenueMetricsInput {
  lineItems: LineItemForMetrics[]
  billingFrequency: QuotationBillingFrequency
  contractDurationMonths: number | null
}

export const computeRevenueMetrics = (
  input: ComputeRevenueMetricsInput
): QuotationRevenueMetrics => {
  const { lineItems, billingFrequency, contractDurationMonths } = input

  let mrr = 0
  let oneTimeTotal = 0
  let recurringCount = 0
  let oneTimeCount = 0

  for (const line of lineItems) {
    const amount = Number.isFinite(line.subtotalAfterDiscount) ? line.subtotalAfterDiscount : 0
    const resolved = resolveLineRecurrence(line.recurrenceType, billingFrequency)

    if (resolved === 'recurring') {
      mrr += amount
      recurringCount += 1
    } else {
      oneTimeTotal += amount
      oneTimeCount += 1
    }
  }

  mrr = round2(mrr)

  const arr = round2(mrr * 12)

  let tcv: number | null = null
  let acv: number | null = null

  if (contractDurationMonths && contractDurationMonths > 0) {
    const recurringTotal = mrr * contractDurationMonths

    tcv = round2(recurringTotal + oneTimeTotal)
    acv = round2(tcv / Math.max(1, Math.ceil(contractDurationMonths / 12)))
  } else if (contractDurationMonths === null && mrr === 0) {
    // One-time only without duration: TCV is the sum of one-time items
    tcv = round2(oneTimeTotal)
    acv = tcv
  }

  let revenueType: RevenueType

  if (recurringCount > 0 && oneTimeCount > 0) {
    revenueType = 'hybrid'
  } else if (recurringCount > 0) {
    revenueType = 'recurring'
  } else {
    revenueType = 'one_time'
  }

  return { mrr, arr, tcv, acv, revenueType }
}
