import 'server-only'

import { query } from '@/lib/db'

import type {
  ApprovalConditionType,
  ApprovalPolicy,
  QuotationPricingModel
} from './contracts'

interface PolicyRow extends Record<string, unknown> {
  policy_id: string
  policy_name: string
  business_line_code: string | null
  pricing_model: string | null
  condition_type: string
  threshold_value: string | number | null
  required_role: string
  step_order: number
  active: boolean
  created_by: string
  created_at: string | Date
  updated_at: string | Date
}

const mapPolicy = (row: PolicyRow): ApprovalPolicy => ({
  policyId: row.policy_id,
  policyName: row.policy_name,
  businessLineCode: row.business_line_code,
  pricingModel: row.pricing_model as QuotationPricingModel | null,
  conditionType: row.condition_type as ApprovalConditionType,
  thresholdValue: row.threshold_value === null ? null : Number(row.threshold_value),
  requiredRole: row.required_role,
  stepOrder: row.step_order,
  active: row.active,
  createdBy: row.created_by,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
})

export interface ApprovalEvaluationInput {
  businessLineCode: string | null
  pricingModel: QuotationPricingModel | null
  quotationMarginPct: number | null
  marginTargetPct: number | null
  marginFloorPct: number | null
  totalPrice: number | null
  discountPct: number | null
}

export interface ApprovalEvaluationStep {
  policyId: string
  requiredRole: string
  stepOrder: number
  conditionLabel: string
}

const conditionLabel = (
  policy: ApprovalPolicy,
  input: ApprovalEvaluationInput
): string => {
  switch (policy.conditionType) {
    case 'margin_below_floor': {
      const margin = input.quotationMarginPct ?? 0
      const floor = input.marginFloorPct ?? 0

      return `Margen ${margin.toFixed(2)}% bajo el piso ${floor.toFixed(2)}%`
    }

    case 'margin_below_target': {
      const margin = input.quotationMarginPct ?? 0
      const target = input.marginTargetPct ?? 0

      return `Margen ${margin.toFixed(2)}% bajo el target ${target.toFixed(2)}%`
    }

    case 'amount_above_threshold':
      return `Monto ${Math.round(input.totalPrice ?? 0).toLocaleString('es-CL')} supera umbral ${Math.round(
        policy.thresholdValue ?? 0
      ).toLocaleString('es-CL')}`
    case 'discount_above_threshold':
      return `Descuento ${(input.discountPct ?? 0).toFixed(2)}% supera umbral ${(
        policy.thresholdValue ?? 0
      ).toFixed(2)}%`
    case 'always':
      return policy.policyName
    default:
      return policy.policyName
  }
}

const matchesPolicy = (policy: ApprovalPolicy, input: ApprovalEvaluationInput): boolean => {
  if (policy.businessLineCode && input.businessLineCode && policy.businessLineCode !== input.businessLineCode) {
    return false
  }

  if (policy.pricingModel && input.pricingModel && policy.pricingModel !== input.pricingModel) {
    return false
  }

  switch (policy.conditionType) {
    case 'margin_below_floor':
      return (
        input.quotationMarginPct !== null &&
        input.marginFloorPct !== null &&
        input.quotationMarginPct < input.marginFloorPct
      )
    case 'margin_below_target':
      return (
        input.quotationMarginPct !== null &&
        input.marginTargetPct !== null &&
        input.quotationMarginPct < input.marginTargetPct
      )
    case 'amount_above_threshold':
      return (
        input.totalPrice !== null &&
        policy.thresholdValue !== null &&
        input.totalPrice > policy.thresholdValue
      )
    case 'discount_above_threshold':
      return (
        input.discountPct !== null &&
        policy.thresholdValue !== null &&
        input.discountPct > policy.thresholdValue
      )
    case 'always':
      return true
    default:
      return false
  }
}

export const listApplicablePolicies = async (input: {
  businessLineCode: string | null
  pricingModel: QuotationPricingModel | null
}): Promise<ApprovalPolicy[]> => {
  const rows = await query<PolicyRow>(
    `SELECT policy_id, policy_name, business_line_code, pricing_model,
            condition_type, threshold_value, required_role, step_order,
            active, created_by, created_at, updated_at
       FROM greenhouse_commercial.approval_policies
       WHERE active = TRUE
         AND (business_line_code IS NULL OR business_line_code = $1)
         AND (pricing_model IS NULL OR pricing_model = $2)
       ORDER BY step_order ASC, created_at ASC`,
    [input.businessLineCode, input.pricingModel]
  )

  return rows.map(mapPolicy)
}

export const evaluateApproval = async (
  input: ApprovalEvaluationInput
): Promise<ApprovalEvaluationStep[]> => {
  const policies = await listApplicablePolicies({
    businessLineCode: input.businessLineCode,
    pricingModel: input.pricingModel
  })

  const matching = policies.filter(policy => matchesPolicy(policy, input))

  return matching.map(policy => ({
    policyId: policy.policyId,
    requiredRole: policy.requiredRole,
    stepOrder: policy.stepOrder,
    conditionLabel: conditionLabel(policy, input)
  }))
}
