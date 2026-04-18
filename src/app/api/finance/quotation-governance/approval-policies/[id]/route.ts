import { NextResponse } from 'next/server'

import {
  deactivateApprovalPolicy,
  updateApprovalPolicy,
  ApprovalPolicyValidationError
} from '@/lib/commercial/governance/policies-store'
import type {
  ApprovalConditionType,
  QuotationPricingModel
} from '@/lib/commercial/governance/contracts'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

const requireAdmin = (roleCodes: string[]) =>
  roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN) || roleCodes.includes(ROLE_CODES.FINANCE_ADMIN)

interface UpdatePolicyBody {
  policyName?: string
  businessLineCode?: string | null
  pricingModel?: QuotationPricingModel | null
  conditionType?: ApprovalConditionType
  thresholdValue?: number | null
  requiredRole?: string
  stepOrder?: number
  active?: boolean
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!requireAdmin(tenant.roleCodes)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden editar approval policies.' },
      { status: 403 }
    )
  }

  const { id } = await params

  let body: UpdatePolicyBody

  try {
    body = (await request.json()) as UpdatePolicyBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const updated = await updateApprovalPolicy(id, body)

    if (!updated) {
      return NextResponse.json({ error: 'Policy not found or no fields to update.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ApprovalPolicyValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!requireAdmin(tenant.roleCodes)) {
    return NextResponse.json(
      { error: 'Solo Finance Admin o Efeonce Admin pueden desactivar approval policies.' },
      { status: 403 }
    )
  }

  const { id } = await params
  const ok = await deactivateApprovalPolicy(id)

  if (!ok) {
    return NextResponse.json({ error: 'Policy not found.' }, { status: 404 })
  }

  return NextResponse.json({ policyId: id, deactivated: true })
}
