import 'server-only'

import { sanitizePromptPayload } from '@/lib/finance/reconciliation-intelligence/sanitize'

import { shortSha256, stableJsonStringify } from './hash'
import { EXPENSE_DISTRIBUTION_AI_PROMPT_VERSION } from './types'
import type { ExpenseDistributionReviewQueueItem } from '@/lib/finance/expense-distribution/repository'

export interface ExpenseDistributionPromptContext {
  period: {
    year: number
    month: number
  }
  items: Array<{
    expenseId: string
    currentLane: string
    status: string
    confidence: string
    amountClp: number
    economicCategory: string | null
    supplierName: string | null
    description: string | null
    paymentProvider: string | null
    paymentRail: string | null
    hasMemberAnchor: boolean
    hasClientAnchor: boolean
    hasToolAnchor: boolean
    riskFlags: string[]
  }>
}

export const SYSTEM_PROMPT = `Eres Expense Distribution Intelligence para Greenhouse.

Tu trabajo es proponer sugerencias estructuradas para distribuir gastos ambiguos en management accounting. No eres chat.

REGLAS DURAS:
- Devuelve SOLO JSON valido. Sin Markdown, sin texto antes o despues.
- No inventes IDs. Usa exclusivamente expenseId presentes en el contexto.
- Nunca sugieras escribir P&L, cerrar periodos, modificar saldos, conciliacion, payment orders ni bancos.
- Si la evidencia es insuficiente, usa suggestedDistributionLane="unallocated", confidence="manual_required" y closeImpact="blocks_close".
- Payroll/provider, Previred/regulatorio, factoring, intereses y fees financieros NO son shared_operational_overhead.
- La sugerencia requiere aprobacion humana siempre.
- Tono factual y breve en español operacional.

Schema:
{
  "suggestions": [
    {
      "expenseId": string,
      "suggestedDistributionLane": "member_direct_labor" | "member_direct_tool" | "client_direct_non_labor" | "shared_operational_overhead" | "shared_financial_cost" | "regulatory_payment" | "provider_payroll" | "treasury_transit" | "unallocated",
      "suggestedMemberId": string | null,
      "suggestedClientId": string | null,
      "confidence": "high" | "medium" | "low" | "manual_required",
      "rationale": string,
      "evidence": {
        "factors": [{ "factor": string, "observed": string, "weight": number }],
        "riskFlags": string[],
        "proposedRule": string | null,
        "closeImpact": "blocks_close" | "no_close_impact" | "review_before_close"
      },
      "requiresHumanApproval": true
    }
  ]
}`

export const buildPromptContext = ({
  year,
  month,
  items
}: {
  year: number
  month: number
  items: ExpenseDistributionReviewQueueItem[]
}): ExpenseDistributionPromptContext => sanitizePromptPayload({
  period: { year, month },
  items: items.slice(0, 40).map(item => ({
    expenseId: item.expense.expenseId,
    currentLane: item.distributionLane,
    status: item.resolutionStatus,
    confidence: item.confidence,
    amountClp: item.amountClp,
    economicCategory: item.expense.economicCategory,
    supplierName: item.expense.supplierName ?? null,
    description: item.expense.description ?? null,
    paymentProvider: item.expense.paymentProvider ?? null,
    paymentRail: item.expense.paymentRail ?? null,
    hasMemberAnchor: Boolean(item.expense.memberId || item.expense.directOverheadMemberId || item.expense.payrollEntryId),
    hasClientAnchor: Boolean(item.expense.clientId || item.expense.allocatedClientId),
    hasToolAnchor: Boolean(item.expense.toolCatalogId),
    riskFlags: item.riskFlags
  }))
})

export const buildInputHash = (context: ExpenseDistributionPromptContext) => shortSha256(context)

export const buildPromptHash = () => shortSha256(EXPENSE_DISTRIBUTION_AI_PROMPT_VERSION + SYSTEM_PROMPT)

export const buildUserPrompt = (context: ExpenseDistributionPromptContext) => `Contexto sanitizado (${EXPENSE_DISTRIBUTION_AI_PROMPT_VERSION}):

${stableJsonStringify(context)}

Genera hasta 8 sugerencias.`
