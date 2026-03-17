import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ICO_METRIC_REGISTRY, CSC_PHASE_LABELS, THRESHOLD_ZONE_COLOR } from '@/lib/ico-engine/metric-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    metrics: ICO_METRIC_REGISTRY,
    cscPhaseLabels: CSC_PHASE_LABELS,
    thresholdZoneColors: THRESHOLD_ZONE_COLOR
  })
}
