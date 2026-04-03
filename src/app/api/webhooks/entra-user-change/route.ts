import { NextResponse } from 'next/server'

import { resolveSecret } from '@/lib/secrets/secret-manager'
import { fetchEntraUsers } from '@/lib/entra/graph-client'
import { syncEntraProfiles } from '@/lib/entra/profile-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ── GET: Microsoft Graph subscription validation ──
// When creating a subscription, Graph sends a GET with ?validationToken=xxx
// We must respond with the token as plain text within 10 seconds.

export async function GET(request: Request) {
  const url = new URL(request.url)
  const validationToken = url.searchParams.get('validationToken')

  if (validationToken) {
    console.log('[entra-webhook] Subscription validation request received')

    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return NextResponse.json({ status: 'ok', endpoint: 'entra-user-change' })
}

// ── POST: Receive change notifications ──

interface GraphNotification {
  subscriptionId: string
  clientState?: string
  changeType: string
  resource: string
  resourceData?: {
    id?: string
    '@odata.type'?: string
  }
}

interface GraphNotificationPayload {
  value: GraphNotification[]
}

export async function POST(request: Request) {
  // 1. Validate client state
  const body = (await request.json().catch(() => null)) as GraphNotificationPayload | null

  if (!body?.value?.length) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const clientState = body.value[0]?.clientState
  const isValid = await validateClientState(clientState)

  if (!isValid) {
    console.warn('[entra-webhook] Invalid client state — rejecting notification')

    return NextResponse.json({ error: 'Invalid client state' }, { status: 401 })
  }

  // 2. Process notifications
  // Graph sends minimal data in the notification (just resource ID).
  // We fetch fresh profiles from Graph API and sync — same logic as the cron.
  // This is simpler and more reliable than parsing individual change payloads.

  try {
    const changedUserIds = body.value
      .filter(n => n.changeType === 'updated' && n.resourceData?.id)
      .map(n => n.resourceData!.id!)

    if (changedUserIds.length === 0) {
      console.log('[entra-webhook] No user changes in notification batch')

      return NextResponse.json({ processed: 0 })
    }

    console.log(`[entra-webhook] Received ${changedUserIds.length} user change notifications: ${changedUserIds.join(', ')}`)

    // Fetch all Entra users and sync (reuses cron logic)
    // For efficiency we could fetch only changed users, but with <50 users
    // fetching all is fast and ensures consistency
    const entraUsers = await fetchEntraUsers()
    const result = await syncEntraProfiles(entraUsers)

    console.log(
      `[entra-webhook] Sync complete: users_updated=${result.usersUpdated} profiles_updated=${result.profilesUpdated} members_updated=${result.membersUpdated}`
    )

    return NextResponse.json({
      notificationsReceived: changedUserIds.length,
      ...result
    })
  } catch (error) {
    console.error('[entra-webhook] Error processing notification:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ── Validation ──

const validateClientState = async (clientState: string | undefined): Promise<boolean> => {
  if (!clientState) return false

  const resolution = await resolveSecret({ envVarName: 'SCIM_BEARER_TOKEN' })
  const expected = (resolution.value || process.env.SCIM_BEARER_TOKEN || '').slice(0, 16)

  return clientState === expected
}
