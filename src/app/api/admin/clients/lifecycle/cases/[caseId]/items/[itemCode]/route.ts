import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { advanceLifecycleChecklistItem } from '@/lib/client-lifecycle/commands/advance-checklist-item'
import { ClientLifecycleValidationError, type ClientLifecycleItemStatus } from '@/lib/client-lifecycle/types'

export const dynamic = 'force-dynamic'

const VALID_TARGET: ClientLifecycleItemStatus[] = ['in_progress', 'completed', 'skipped', 'blocked', 'not_applicable']

// PATCH /api/admin/clients/lifecycle/cases/[caseId]/items/[itemCode]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string; itemCode: string }> }
) {
  const { caseId, itemCode } = await params
  const { tenant, userId, errorResponse } = await authorizeLifecycle('client.lifecycle.case.advance')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  try {
    const newStatus = body.newStatus as ClientLifecycleItemStatus

    if (!VALID_TARGET.includes(newStatus)) {
      throw new ClientLifecycleValidationError('invalid_item_status', 'newStatus inválido.', 400)
    }

    const result = await advanceLifecycleChecklistItem({
      caseId,
      itemCode,
      newStatus: newStatus as Exclude<ClientLifecycleItemStatus, 'pending'>,
      evidenceAssetId: typeof body.evidenceAssetId === 'string' ? body.evidenceAssetId : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      blockedReason: typeof body.blockedReason === 'string' ? body.blockedReason : undefined,
      allowSkipRequired: body.allowSkipRequired === true,
      actorUserId: userId
    })

    return NextResponse.json(result)
  } catch (error) {
    return mapLifecycleError(error, 'advance_item')
  }
}
