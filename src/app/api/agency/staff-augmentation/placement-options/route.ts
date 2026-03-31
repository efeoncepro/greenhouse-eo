import { NextResponse } from 'next/server'

import { listStaffAugPlacementOptions } from '@/lib/staff-augmentation/store'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim().toLowerCase() || ''
  const baseItems = await listStaffAugPlacementOptions()

  const items = search
    ? baseItems.filter(item =>
      [item.memberName || '', item.clientName || '', item.organizationName || '']
        .join(' ')
        .toLowerCase()
        .includes(search)
    )
    : baseItems

  return NextResponse.json({
    items: items.map(item => ({
      assignmentId: item.assignmentId,
      assignmentType: item.assignmentType,
      clientId: item.clientId,
      clientName: item.clientName,
      memberId: item.memberId,
      memberName: item.memberName,
      organizationId: item.organizationId,
      organizationName: item.organizationName,
      label: `${item.memberName || item.memberId} · ${item.clientName || item.clientId || 'Cliente'}`,
      compensation: {
        payRegime: item.payRegime,
        contractType: item.contractType,
        costRateAmount: item.compensation.costRateAmount,
        costRateCurrency: item.compensation.costRateCurrency
      }
    })),
    total: items.length
  })
}
