import { NextResponse } from 'next/server'

import {
  createApprovalPolicy,
  listApprovalPolicies,
  ApprovalPolicyValidationError
} from '@/lib/commercial/governance/policies-store'
import {
  APPROVAL_CONDITION_TYPES,
  type ApprovalConditionType,
  type QuotationPricingModel
} from '@/lib/commercial/governance/contracts'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

const requireAdmin = (roleCodes: string[]) =>
  roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN) || roleCodes.includes(ROLE_CODES.FINANCE_ADMIN)

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const policies = await listApprovalPolicies({ activeOnly: !includeInactive })

  return NextResponse.json({ items: policies, total: policies.length })
}

interface CreatePolicyBody {
  policyName?: string
  businessLineCode?: string | null
  pricingModel?: QuotationPricingModel | null
  conditionType?: ApprovalConditionType
  thresholdValue?: number | null
  requiredRole?: string
  stepOrder?: number
  active?: boolean
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!requireAdmin(tenant.roleCodes)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden crear approval policies.' },
      { status: 403 }
    )
  }

  let body: CreatePolicyBody

  try {
    body = (await request.json()) as CreatePolicyBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (
    !body.conditionType ||
    !APPROVAL_CONDITION_TYPES.includes(body.conditionType)
  ) {
    return NextResponse.json(
      { error: `conditionType inválido. Debe ser: ${APPROVAL_CONDITION_TYPES.join(', ')}.` },
      { status: 400 }
    )
  }

  try {
    const policy = await createApprovalPolicy({
      policyName: body.policyName ?? '',
      businessLineCode: body.businessLineCode ?? null,
      pricingModel: body.pricingModel ?? null,
      conditionType: body.conditionType,
      thresholdValue: body.thresholdValue ?? null,
      requiredRole: body.requiredRole ?? '',
      stepOrder: body.stepOrder ?? 1,
      active: body.active ?? true,
      createdBy: tenant.userId
    })

    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    if (error instanceof ApprovalPolicyValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
