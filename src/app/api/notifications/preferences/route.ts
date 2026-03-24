import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { NotificationService } from '@/lib/notifications/notification-service'
import { NOTIFICATION_CATEGORIES } from '@/config/notification-categories'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userPrefs = await NotificationService.getPreferences(tenant.userId)
    const prefMap = new Map(userPrefs.map(p => [p.category as string, p]))

    // Merge user preferences with category catalog defaults
    const preferences = Object.values(NOTIFICATION_CATEGORIES).map(cat => {
      const userPref = prefMap.get(cat.code)

      return {
        category: cat.code,
        label: cat.label,
        description: cat.description,
        inAppEnabled: userPref ? userPref.in_app_enabled : cat.defaultChannels.includes('in_app'),
        emailEnabled: userPref ? userPref.email_enabled : cat.defaultChannels.includes('email'),
        mutedUntil: userPref?.muted_until || null
      }
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('GET /api/notifications/preferences failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const updates = body.preferences

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'preferences array required' }, { status: 400 })
    }

    for (const pref of updates) {
      if (!pref.category || !NOTIFICATION_CATEGORIES[pref.category]) continue

      await NotificationService.upsertPreference(
        tenant.userId,
        pref.category,
        pref.inAppEnabled !== false,
        pref.emailEnabled !== false
      )
    }

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error('PUT /api/notifications/preferences failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
