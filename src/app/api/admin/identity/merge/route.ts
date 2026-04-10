import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { mergeIdentityProfiles, listMergeLog } from '@/lib/identity/merge/merge-profiles'

export const dynamic = 'force-dynamic'

// POST — merge two identity profiles
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    sourceProfileId?: string
    targetProfileId?: string
    reason?: string
  }

  const { sourceProfileId, targetProfileId, reason } = body

  if (!sourceProfileId || !targetProfileId) {
    return NextResponse.json(
      { error: 'sourceProfileId and targetProfileId are required' },
      { status: 400 }
    )
  }

  try {
    const result = await mergeIdentityProfiles({
      sourceProfileId,
      targetProfileId,
      mergedBy: tenant.userId,
      mergeReason: reason
    })

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'

    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    if (msg.includes('already merged') || msg.includes('itself merged') || msg.includes('Cannot merge')) {
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    console.error('[identity/merge] Unexpected error:', error)

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — list merge audit log
export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await listMergeLog()

  return NextResponse.json({ merges: result })
}
