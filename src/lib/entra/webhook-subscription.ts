import 'server-only'

import { query } from '@/lib/db'
import { resolveSecret } from '@/lib/secrets/secret-manager'

// ── Types ──

interface GraphSubscription {
  id: string
  resource: string
  changeType: string
  clientState: string
  expirationDateTime: string
}

// ── Token ──

const getAccessToken = async (): Promise<string> => {
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim() || 'a80bf6c1-7c45-4d70-b043-51389622a0e4'
  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim()

  if (!clientId) throw new Error('[entra-webhook] AZURE_AD_CLIENT_ID not configured')

  const secretResolution = await resolveSecret({ envVarName: 'AZURE_AD_CLIENT_SECRET' })
  const clientSecret = secretResolution.value || process.env.AZURE_AD_CLIENT_SECRET?.trim()

  if (!clientSecret) throw new Error('[entra-webhook] AZURE_AD_CLIENT_SECRET not configured')

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    }
  )

  if (!res.ok) {
    const body = await res.text()

    throw new Error(`[entra-webhook] Token request failed (${res.status}): ${body}`)
  }

  const data = await res.json()

  return data.access_token
}

// ── Client State ──

const getClientState = async (): Promise<string> => {
  const resolution = await resolveSecret({ envVarName: 'SCIM_BEARER_TOKEN' })

  // Use first 16 chars of SCIM token as client state for webhook validation
  return (resolution.value || process.env.SCIM_BEARER_TOKEN || 'greenhouse-entra-webhook').slice(0, 16)
}

// ── Subscription Management ──

export const createOrRenewSubscription = async (): Promise<{
  action: 'created' | 'renewed'
  subscription: GraphSubscription
}> => {
  const token = await getAccessToken()
  const clientState = await getClientState()
  const notificationUrl = 'https://greenhouse.efeoncepro.com/api/webhooks/entra-user-change'

  // Check for existing subscription
  const existing = await findExistingSubscription(token)

  if (existing) {
    // Renew: extend expiration by 3 days (max for /users)
    const newExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60_000).toISOString()

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${existing.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expirationDateTime: newExpiry })
      }
    )

    if (!res.ok) {
      const body = await res.text()

      console.warn(`[entra-webhook] Renewal failed (${res.status}), will recreate: ${body}`)
    } else {
      const renewed = await res.json()

      console.log(`[entra-webhook] Subscription renewed, expires: ${renewed.expirationDateTime}`)

      return { action: 'renewed', subscription: renewed }
    }
  }

  // Create new subscription
  const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60_000).toISOString()

  const res = await fetch(
    'https://graph.microsoft.com/v1.0/subscriptions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changeType: 'updated',
        notificationUrl,
        resource: '/users',
        expirationDateTime: expiry,
        clientState
      })
    }
  )

  if (!res.ok) {
    const body = await res.text()

    throw new Error(`[entra-webhook] Subscription creation failed (${res.status}): ${body}`)
  }

  const subscription = await res.json()

  console.log(`[entra-webhook] Subscription created: ${subscription.id}, expires: ${subscription.expirationDateTime}`)

  // Persist subscription ID for renewal
  await persistSubscriptionId(subscription.id)

  return { action: 'created', subscription }
}

// ── Helpers ──

const findExistingSubscription = async (token: string): Promise<GraphSubscription | null> => {
  // Check persisted ID first
  const persisted = await getPersistedSubscriptionId()

  if (persisted) {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${persisted}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.ok) {
      return await res.json()
    }
  }

  // Fallback: list all and find ours
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/subscriptions',
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) return null

  const data = await res.json()

  return data.value?.find(
    (s: GraphSubscription) => s.resource === '/users' && s.changeType === 'updated'
  ) || null
}

const persistSubscriptionId = async (subscriptionId: string): Promise<void> => {
  await query(
    `INSERT INTO greenhouse_sync.integration_registry (
       integration_key, display_name, integration_type, source_system,
       description, consumer_domains, auth_mode, sync_cadence,
       sync_endpoint, environment, readiness_status, active, metadata,
       created_at, updated_at
     ) VALUES (
       'entra-graph-webhook', 'Microsoft Graph User Change Webhook', 'api_connector', 'azure-ad',
       'Real-time user profile change notifications from Entra ID', ARRAY['greenhouse_core'], 'client_state',
       'real-time', '/api/webhooks/entra-user-change', 'production', 'ready', true,
       $1::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )
     ON CONFLICT (integration_key) DO UPDATE SET
       metadata = $1::jsonb,
       readiness_status = 'ready',
       active = true,
       updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify({ subscriptionId })]
  )
}

const getPersistedSubscriptionId = async (): Promise<string | null> => {
  const rows = await query<{ [key: string]: unknown; metadata: { subscriptionId?: string } }>(
    `SELECT metadata FROM greenhouse_sync.integration_registry
     WHERE integration_key = 'entra-graph-webhook' AND active = true
     LIMIT 1`
  )

  return rows[0]?.metadata?.subscriptionId || null
}
