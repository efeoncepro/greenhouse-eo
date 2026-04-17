import 'server-only'

import { query } from '@/lib/db'

import type {
  ApprovalConditionType,
  ApprovalPolicy,
  QuotationPricingModel
} from './contracts'
import { APPROVAL_CONDITION_TYPES, QUOTATION_PRICING_MODELS } from './contracts'

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

export class ApprovalPolicyValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ApprovalPolicyValidationError'
    this.statusCode = statusCode
  }
}

const validateConditionType = (value: unknown): ApprovalConditionType => {
  if (typeof value !== 'string' || !APPROVAL_CONDITION_TYPES.includes(value as ApprovalConditionType)) {
    throw new ApprovalPolicyValidationError(
      `conditionType inválido. Debe ser uno de: ${APPROVAL_CONDITION_TYPES.join(', ')}.`
    )
  }

  return value as ApprovalConditionType
}

const validatePricingModel = (value: unknown): QuotationPricingModel | null => {
  if (value === null || value === undefined) return null

  if (
    typeof value !== 'string' ||
    !QUOTATION_PRICING_MODELS.includes(value as QuotationPricingModel)
  ) {
    throw new ApprovalPolicyValidationError(
      `pricingModel inválido. Debe ser uno de: ${QUOTATION_PRICING_MODELS.join(', ')}.`
    )
  }

  return value as QuotationPricingModel
}

export const listApprovalPolicies = async (params?: {
  activeOnly?: boolean
}): Promise<ApprovalPolicy[]> => {
  const activeClause = params?.activeOnly === false ? '' : 'WHERE active = TRUE'

  const rows = await query<PolicyRow>(
    `SELECT policy_id, policy_name, business_line_code, pricing_model,
            condition_type, threshold_value, required_role, step_order,
            active, created_by, created_at, updated_at
       FROM greenhouse_commercial.approval_policies
       ${activeClause}
       ORDER BY step_order ASC, policy_name ASC`
  )

  return rows.map(mapPolicy)
}

interface CreatePolicyInput {
  policyName: string
  businessLineCode?: string | null
  pricingModel?: QuotationPricingModel | null
  conditionType: ApprovalConditionType
  thresholdValue?: number | null
  requiredRole: string
  stepOrder?: number
  active?: boolean
  createdBy: string
}

export const createApprovalPolicy = async (
  input: CreatePolicyInput
): Promise<ApprovalPolicy> => {
  const conditionType = validateConditionType(input.conditionType)
  const pricingModel = validatePricingModel(input.pricingModel ?? null)

  if (!input.policyName?.trim()) {
    throw new ApprovalPolicyValidationError('policyName es requerido.')
  }

  if (!input.requiredRole?.trim()) {
    throw new ApprovalPolicyValidationError('requiredRole es requerido.')
  }

  const needsThreshold =
    conditionType === 'amount_above_threshold' ||
    conditionType === 'discount_above_threshold'

  if (needsThreshold && (input.thresholdValue === null || input.thresholdValue === undefined)) {
    throw new ApprovalPolicyValidationError(
      `thresholdValue es requerido cuando conditionType es "${conditionType}".`
    )
  }

  const rows = await query<PolicyRow>(
    `INSERT INTO greenhouse_commercial.approval_policies (
       policy_name, business_line_code, pricing_model, condition_type,
       threshold_value, required_role, step_order, active, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING policy_id, policy_name, business_line_code, pricing_model,
               condition_type, threshold_value, required_role, step_order,
               active, created_by, created_at, updated_at`,
    [
      input.policyName.trim(),
      input.businessLineCode ?? null,
      pricingModel,
      conditionType,
      input.thresholdValue ?? null,
      input.requiredRole.trim(),
      input.stepOrder ?? 1,
      input.active ?? true,
      input.createdBy
    ]
  )

  return mapPolicy(rows[0])
}

interface UpdatePolicyInput {
  policyName?: string
  businessLineCode?: string | null
  pricingModel?: QuotationPricingModel | null
  conditionType?: ApprovalConditionType
  thresholdValue?: number | null
  requiredRole?: string
  stepOrder?: number
  active?: boolean
}

export const updateApprovalPolicy = async (
  policyId: string,
  input: UpdatePolicyInput
): Promise<ApprovalPolicy | null> => {
  const updates: string[] = []
  const values: unknown[] = [policyId]
  let idx = 1

  const push = (column: string, value: unknown) => {
    idx += 1
    updates.push(`${column} = $${idx}`)
    values.push(value)
  }

  if (input.policyName !== undefined) push('policy_name', input.policyName)
  if (input.businessLineCode !== undefined) push('business_line_code', input.businessLineCode)
  if (input.pricingModel !== undefined) push('pricing_model', validatePricingModel(input.pricingModel))
  if (input.conditionType !== undefined) push('condition_type', validateConditionType(input.conditionType))
  if (input.thresholdValue !== undefined) push('threshold_value', input.thresholdValue)
  if (input.requiredRole !== undefined) push('required_role', input.requiredRole)
  if (input.stepOrder !== undefined) push('step_order', input.stepOrder)
  if (input.active !== undefined) push('active', input.active)

  if (updates.length === 0) return null

  updates.push('updated_at = CURRENT_TIMESTAMP')

  const rows = await query<PolicyRow>(
    `UPDATE greenhouse_commercial.approval_policies
        SET ${updates.join(', ')}
        WHERE policy_id = $1
        RETURNING policy_id, policy_name, business_line_code, pricing_model,
                  condition_type, threshold_value, required_role, step_order,
                  active, created_by, created_at, updated_at`,
    values
  )

  return rows[0] ? mapPolicy(rows[0]) : null
}

export const deactivateApprovalPolicy = async (policyId: string): Promise<boolean> => {
  const rows = await query<{ policy_id: string }>(
    `UPDATE greenhouse_commercial.approval_policies
        SET active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE policy_id = $1
        RETURNING policy_id`,
    [policyId]
  )

  return rows.length > 0
}
