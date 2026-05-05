import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { getShortcutByKey } from '@/lib/shortcuts/catalog'
import {
  reorderUserShortcutPins,
  UserShortcutPinError
} from '@/lib/shortcuts/pins-store'

/**
 * TASK-553 — PUT /api/me/shortcuts/order
 *
 * Reorders the current user's pinned shortcuts atomically. Body shape:
 * `{ orderedKeys: string[] }`. Keys not in the user's pinned set, unknown
 * catalog keys, and duplicates are rejected before any UPDATE runs.
 */

export const dynamic = 'force-dynamic'

interface ReorderBody {
  orderedKeys?: unknown
}

const projectShortcut = (shortcut: NonNullable<ReturnType<typeof getShortcutByKey>>) => ({
  key: shortcut.key,
  label: shortcut.label,
  subtitle: shortcut.subtitle,
  route: shortcut.route,
  icon: shortcut.icon,
  module: shortcut.module
})

export async function PUT(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(session.user, 'home.shortcuts', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let payload: ReorderBody

  try {
    payload = (await request.json()) as ReorderBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(payload?.orderedKeys)) {
    return NextResponse.json({ error: 'orderedKeys must be an array of strings' }, { status: 400 })
  }

  const orderedKeys = payload.orderedKeys.map(value => (typeof value === 'string' ? value : ''))

  try {
    const pinned = await reorderUserShortcutPins(session.user.userId, orderedKeys)

    return NextResponse.json({
      pinned: pinned
        .map(row => ({ row, shortcut: getShortcutByKey(row.shortcutKey) }))
        .filter((entry): entry is { row: typeof entry.row; shortcut: NonNullable<typeof entry.shortcut> } =>
          Boolean(entry.shortcut)
        )
        .map(entry => ({
          ...projectShortcut(entry.shortcut),
          pinId: entry.row.pinId,
          displayOrder: entry.row.displayOrder
        }))
    })
  } catch (error) {
    if (error instanceof UserShortcutPinError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    captureWithDomain(error, 'home', {
      extra: { source: 'me_shortcuts_reorder', userId: session.user.userId }
    })

    return NextResponse.json(
      { error: 'Unable to reorder shortcuts', detail: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
