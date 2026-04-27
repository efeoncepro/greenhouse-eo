import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { NotificationService } from '@/lib/notifications/notification-service'

/**
 * TASK-696 — Today Inbox triage actions.
 *
 * `approve | dismiss | snooze | open` are the supported action ids.
 * For now, all of them resolve to "mark notification as read" against
 * the Notification Hub. Slice 3 / TASK-693 will route `approve` to the
 * approvals service and `snooze` to a timed re-surface.
 */

const VALID_ACTIONS = new Set(['approve', 'dismiss', 'snooze', 'open'])

export const dynamic = 'force-dynamic'

interface ActionParams {
  params: Promise<{ action: string }>
}

interface ActionPayload {
  itemId?: string
  kind?: string
}

export async function POST(request: Request, { params }: ActionParams) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await params

  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  let payload: ActionPayload = {}

  try {
    payload = (await request.json()) as ActionPayload
  } catch {
    payload = {}
  }

  if (!payload.itemId) {
    return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })
  }

  try {
    await NotificationService.markAsRead(payload.itemId, session.user.userId)

    return NextResponse.json({ ok: true, action, itemId: payload.itemId })
  } catch (error) {
    console.error('[home/inbox] action failed:', error)

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
