import type { ExpenseDistributionReviewQueueItem } from '@/lib/finance/expense-distribution/repository'

import { generateExpenseDistributionSuggestionId } from './ids'
import type { ExpenseDistributionSuggestionPayload } from './types'

const textFor = (item: ExpenseDistributionReviewQueueItem) =>
  [
    item.expense.supplierName,
    item.expense.description,
    item.expense.paymentProvider,
    item.expense.paymentRail,
    item.expense.economicCategory
  ].filter(Boolean).join(' ')

export const buildRulesOnlySuggestions = (
  items: ExpenseDistributionReviewQueueItem[]
): ExpenseDistributionSuggestionPayload[] =>
  items.flatMap((item): ExpenseDistributionSuggestionPayload[] => {
    const text = textFor(item)
    const lower = text.toLowerCase()

    if (/\b(xepelin|factoring|inter[eé]s|banco|comisi[oó]n|mantenci[oó]n|global66|wise)\b/i.test(text)) {
      return [{
        suggestionId: generateExpenseDistributionSuggestionId(),
        expenseId: item.expense.expenseId,
        suggestedDistributionLane: 'shared_financial_cost',
        suggestedMemberId: null,
        suggestedClientId: null,
        confidence: 'medium',
        rationale: 'La evidencia textual apunta a costo financiero/tesorería; no debe contaminar overhead operacional.',
        evidence: {
          factors: [{ factor: 'financial_text', observed: text.slice(0, 240), weight: 0.8 }],
          riskFlags: ['financial_cost_review'],
          proposedRule: 'Proveedor/texto financiero -> shared_financial_cost salvo evidencia client-direct aprobada.',
          closeImpact: 'review_before_close'
        },
        requiresHumanApproval: true
      }]
    }

    if (/\b(previred|afp|isapre|fonasa|mutual|sii|tgr|tesorer[ií]a)\b/i.test(text)) {
      return [{
        suggestionId: generateExpenseDistributionSuggestionId(),
        expenseId: item.expense.expenseId,
        suggestedDistributionLane: 'regulatory_payment',
        suggestedMemberId: item.expense.memberId ?? item.expense.directOverheadMemberId ?? null,
        suggestedClientId: null,
        confidence: 'medium',
        rationale: 'La evidencia apunta a pago regulatorio/previsional; debe quedar fuera del overhead operacional.',
        evidence: {
          factors: [{ factor: 'regulatory_text', observed: text.slice(0, 240), weight: 0.85 }],
          riskFlags: ['regulatory_payment_review'],
          proposedRule: 'Reguladores/previsión -> regulatory_payment; anchor laboral requerido para componentes member-direct.',
          closeImpact: 'review_before_close'
        },
        requiresHumanApproval: true
      }]
    }

    if (/\b(deel|remote|payroll|n[oó]mina|honorarios|sueldo|salary|contractor)\b/i.test(text)) {
      return [{
        suggestionId: generateExpenseDistributionSuggestionId(),
        expenseId: item.expense.expenseId,
        suggestedDistributionLane: lower.includes('deel') || lower.includes('remote') ? 'provider_payroll' : 'member_direct_labor',
        suggestedMemberId: item.expense.memberId ?? item.expense.directOverheadMemberId ?? null,
        suggestedClientId: null,
        confidence: item.expense.memberId || item.expense.directOverheadMemberId ? 'medium' : 'low',
        rationale: 'La evidencia apunta a remuneración/provider payroll; no corresponde tratarlo como overhead operacional.',
        evidence: {
          factors: [{ factor: 'payroll_text', observed: text.slice(0, 240), weight: 0.75 }],
          riskFlags: ['payroll_review'],
          proposedRule: 'Payroll/provider payroll -> member_direct_labor si existe anchor laboral; si no, provider_payroll.',
          closeImpact: 'review_before_close'
        },
        requiresHumanApproval: true
      }]
    }

    return []
  })
