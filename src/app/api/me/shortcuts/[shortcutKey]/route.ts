import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { unpinShortcut, UserShortcutPinError } from '@/lib/shortcuts/pins-store'

/**
 * TASK-553 — DELETE /api/me/shortcuts/[shortcutKey]
 *
 * Removes a pinned shortcut for the current user. Idempotent — returns 204
 * whether or not the pin existed (avoids leaking pin presence). Auth via
 * NextAuth + `home.shortcuts` capability.
 *
 * Note: we do NOT validate access against the catalog on unpin. A user
 * losing access to a shortcut should always be able to unpin it.
 */

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ shortcutKey: string }> }
) {
  const session = await getServerAuthSession()

  if (!session?.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(session.user, 'home.shortcuts', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { shortcutKey } = await params
  const safeKey = (shortcutKey || '').trim()

  if (!safeKey) {
    return NextResponse.json({ error: 'shortcutKey is required' }, { status: 400 })
  }

  try {
    await unpinShortcut(session.user.userId, safeKey)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof UserShortcutPinError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    captureWithDomain(error, 'home', {
      extra: { source: 'me_shortcuts_delete', userId: session.user.userId, shortcutKey: safeKey }
    })

    return NextResponse.json(
      { error: 'Unable to unpin shortcut', detail: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
