import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  pinShortcut,
  listUserShortcutPins,
  UserShortcutPinError
} from '@/lib/shortcuts/pins-store'
import { getShortcutByKey } from '@/lib/shortcuts/catalog'
import {
  resolveAvailableShortcuts,
  resolveRecommendedShortcuts,
  validateShortcutAccess
} from '@/lib/shortcuts/resolver'

/**
 * TASK-553 — Self-scope shortcuts API for the current authenticated user.
 *
 * GET    /api/me/shortcuts → recommended + available + pinned shortcuts.
 * POST   /api/me/shortcuts → pin a shortcut. Body: { shortcutKey }.
 *
 * Auth: NextAuth session + capability `home.shortcuts` + dual-plane
 * shortcut access validation (module/view/capability) before write.
 */

export const dynamic = 'force-dynamic'

const sessionToSubject = (session: Awaited<ReturnType<typeof getServerAuthSession>>): TenantEntitlementSubject | null => {
  if (!session?.user?.userId) {
    return null
  }

  return {
    userId: session.user.userId,
    tenantType: session.user.tenantType,
    roleCodes: session.user.roleCodes ?? [],
    primaryRoleCode: session.user.primaryRoleCode,
    routeGroups: session.user.routeGroups ?? [],
    authorizedViews: session.user.authorizedViews ?? [],
    projectScopes: session.user.projectScopes ?? [],
    campaignScopes: session.user.campaignScopes ?? [],
    businessLines: session.user.businessLines ?? [],
    serviceModules: session.user.serviceModules ?? [],
    portalHomePath: session.user.portalHomePath,
    memberId: session.user.memberId
  }
}

const projectShortcut = (shortcut: NonNullable<ReturnType<typeof getShortcutByKey>>) => ({
  key: shortcut.key,
  label: shortcut.label,
  subtitle: shortcut.subtitle,
  route: shortcut.route,
  icon: shortcut.icon,
  module: shortcut.module
})

export async function GET() {
  const session = await getServerAuthSession()
  const subject = sessionToSubject(session)

  if (!subject) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(subject, 'home.shortcuts', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [available, recommended, pinnedRows] = await Promise.all([
      Promise.resolve(resolveAvailableShortcuts(subject)),
      Promise.resolve(resolveRecommendedShortcuts(subject, 6)),
      listUserShortcutPins(subject.userId)
    ])

    // Filter pins by current access. Pins that no longer pass the gate are
    // omitted from the response but kept in the table (audit trail / future
    // re-grant). The reliability signal flags this drift.
    const pinned = pinnedRows
      .map(row => ({ row, shortcut: getShortcutByKey(row.shortcutKey) }))
      .filter((entry): entry is { row: typeof entry.row; shortcut: NonNullable<typeof entry.shortcut> } =>
        Boolean(entry.shortcut) && validateShortcutAccess(subject, entry.row.shortcutKey)
      )
      .map(entry => ({
        ...projectShortcut(entry.shortcut),
        pinId: entry.row.pinId,
        displayOrder: entry.row.displayOrder
      }))

    return NextResponse.json({
      recommended: recommended.map(projectShortcut),
      available: available.map(projectShortcut),
      pinned
    })
  } catch (error) {
    captureWithDomain(error, 'home', { extra: { source: 'me_shortcuts_get', userId: subject.userId } })

    return NextResponse.json(
      { error: 'Unable to load shortcuts', detail: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}

interface PinShortcutBody {
  shortcutKey?: unknown
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  const subject = sessionToSubject(session)

  if (!subject) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(subject, 'home.shortcuts', 'read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let payload: PinShortcutBody

  try {
    payload = (await request.json()) as PinShortcutBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const shortcutKey = typeof payload?.shortcutKey === 'string' ? payload.shortcutKey.trim() : ''

  if (!shortcutKey) {
    return NextResponse.json({ error: 'shortcutKey is required' }, { status: 400 })
  }

  if (!validateShortcutAccess(subject, shortcutKey)) {
    return NextResponse.json({ error: 'Shortcut not available for this user' }, { status: 403 })
  }

  try {
    const pin = await pinShortcut(subject.userId, shortcutKey)
    const shortcut = getShortcutByKey(pin.shortcutKey)

    if (!shortcut) {
      // Should never happen — validateShortcutAccess + pinShortcut both validate.
      return NextResponse.json({ error: 'Shortcut catalog entry missing' }, { status: 500 })
    }

    return NextResponse.json(
      {
        ...projectShortcut(shortcut),
        pinId: pin.pinId,
        displayOrder: pin.displayOrder
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof UserShortcutPinError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    captureWithDomain(error, 'home', {
      extra: { source: 'me_shortcuts_post', userId: subject.userId, shortcutKey }
    })

    return NextResponse.json(
      { error: 'Unable to pin shortcut', detail: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
