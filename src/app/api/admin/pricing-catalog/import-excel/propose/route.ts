import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { proposeApproval } from '@/lib/commercial/pricing-catalog-approvals'
import type { PricingCatalogExcelApprovalDiff } from '@/lib/commercial/pricing-catalog-excel-approval'
import { validatePricingCatalogExcelProposalDiff } from '@/lib/commercial/pricing-catalog-excel-approval'
import {
  canAdministerPricingCatalog,
  requireAdminTenantContext
} from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface ProposeExcelApprovalBody {
  diffsToPropose?: unknown
  justification?: unknown
}

const buildDefaultJustification = (diff: PricingCatalogExcelApprovalDiff) =>
  `Excel import ${diff.action} para ${diff.entityType} ${diff.entitySku ?? diff.entityId ?? 'sin-id'}`

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: ProposeExcelApprovalBody = {}

  try {
    body = (await request.json()) as ProposeExcelApprovalBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!Array.isArray(body.diffsToPropose) || body.diffsToPropose.length === 0) {
    return NextResponse.json({ error: 'diffsToPropose must be a non-empty array.' }, { status: 400 })
  }

  const justificationRaw = typeof body.justification === 'string' ? body.justification.trim() : ''
  const session = await getServerAuthSession()
  const actorName = session?.user?.name || session?.user?.email || tenant.userId || 'unknown'
  const approvals = []

  for (const rawDiff of body.diffsToPropose) {
    if (!rawDiff || typeof rawDiff !== 'object') continue

    const diff = rawDiff as PricingCatalogExcelApprovalDiff

    try {
      validatePricingCatalogExcelProposalDiff(diff)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid Excel approval diff.' },
        { status: 422 }
      )
    }

    if (diff.action !== 'create' && diff.action !== 'delete') {
      return NextResponse.json(
        { error: `Diff action "${String(diff.action)}" does not require approval proposal.` },
        { status: 400 }
      )
    }

    const approval = await proposeApproval({
      entityType: diff.entityType,
      entityId: diff.entityId ?? '',
      entitySku: diff.entitySku ?? null,
      proposedChanges: {
        __meta: {
          source: 'excel_import',
          action: diff.action
        },
        diff
      },
      justification: justificationRaw || buildDefaultJustification(diff),
      proposedByUserId: tenant.userId,
      proposedByName: actorName
    })

    approvals.push(approval)
  }

  return NextResponse.json({ approvals }, { status: 201 })
}
