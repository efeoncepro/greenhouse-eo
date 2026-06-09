import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationList } from '@/lib/account-360/organization-store'
import { isClientLifecycleOnboardingEnabled } from '@/lib/client-lifecycle/flags'
import { getActiveOnboardingStatusByOrg } from '@/lib/client-lifecycle/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || '50') || 50))
  const search = searchParams.get('search') || undefined
  const status = searchParams.get('status') || undefined
  const type = searchParams.get('type') || undefined

  const result = await getOrganizationList({ page, pageSize, search, status, type })

  // TASK-1013 Slice 2 — surface the in-flight onboarding case status per org so the
  // list can show a "Onboarding en curso / Borrador" indicator + link. Flag-gated +
  // batched (one query for the page) to avoid N+1. Failures degrade silently: the
  // list still renders, just without the indicator.
  if (isClientLifecycleOnboardingEnabled() && result.items.length > 0) {
    try {
      const statusByOrg = await getActiveOnboardingStatusByOrg(result.items.map(item => item.organizationId))

      const items = result.items.map(item => ({
        ...item,
        onboardingStatus: statusByOrg.get(item.organizationId) ?? null
      }))

      return NextResponse.json({ ...result, items })
    } catch {
      // Non-blocking: the onboarding indicator is a reinforcement, not the list itself.
    }
  }

  return NextResponse.json(result)
}
