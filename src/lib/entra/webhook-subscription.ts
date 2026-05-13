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

// ── Notification URL (env-aware) ──

/**
 * Resuelve la `notificationUrl` para Microsoft Graph webhook subscriptions.
 *
 * Order canónico (TASK ISSUE-075 hardening):
 *
 *   1. `GREENHOUSE_ENTRA_NOTIFICATION_URL` — override explícito (testing,
 *      preview deployments con URL pública alternativa)
 *   2. `GREENHOUSE_PUBLIC_BASE_URL` — base URL canónica del environment
 *      (staging: `https://dev-greenhouse.efeoncepro.com`)
 *   3. `NEXTAUTH_URL` — fallback al canonical URL de NextAuth (típicamente
 *      apunta al public host del env)
 *   4. Hard fallback: producción
 *
 * **Constraints Microsoft Graph**:
 *   - HTTPS obligatorio
 *   - URL pública accesible (NO localhost, NO IP privada)
 *   - El endpoint NO puede requerir auth headers — Microsoft no envía bypass
 *
 * **Implicación staging**: el custom domain `dev-greenhouse.efeoncepro.com`
 * tiene SSO Protection activa que rechaza requests sin
 * `x-vercel-protection-bypass` header. Microsoft Graph NO envía ese header
 * durante el handshake, por lo tanto staging custom domain NO funciona como
 * notification URL. Opciones:
 *   - Dejar el cron de staging desactivado (no setear `GREENHOUSE_PUBLIC_BASE_URL`)
 *   - Publicar una URL pública sin SSO para staging Entra webhook
 *   - Configurar Vercel para excluir `/api/webhooks/entra-user-change` del SSO
 *
 * V1.0 por defecto: prod-only (env vars no seteadas en staging).
 */
export const resolveNotificationUrl = (
  env: NodeJS.ProcessEnv = process.env
): string => {
  const explicit = env.GREENHOUSE_ENTRA_NOTIFICATION_URL?.trim()

  if (explicit) return explicit

  const baseUrl = env.GREENHOUSE_PUBLIC_BASE_URL?.trim()
    || env.NEXTAUTH_URL?.trim()
    || 'https://greenhouse.efeoncepro.com'

  // Normalize: strip trailing slash, append canonical path
  const normalized = baseUrl.replace(/\/+$/, '')

  return `${normalized}/api/webhooks/entra-user-change`
}

// ── Subscription Management ──

export const createOrRenewSubscription = async (): Promise<{
  action: 'created' | 'renewed'
  subscription: GraphSubscription
}> => {
  const token = await getAccessToken()
  const clientState = await getClientState()
  const notificationUrl = resolveNotificationUrl()

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

      // ISSUE-075 hardening — persist expirationDateTime + notificationUrl on every
      // successful renew so the reliability signal can detect approaching expiry
      // even when the cron just renewed (not just on initial create).
      await persistSubscriptionState({
        subscriptionId: renewed.id,
        expirationDateTime: renewed.expirationDateTime,
        notificationUrl
      })

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

  // ISSUE-075 hardening — persist full subscription state (id + expiry + URL)
  // so the reliability signal `identity.entra.webhook_subscription_health` can
  // detect approaching expiry without re-querying Microsoft Graph.
  await persistSubscriptionState({
    subscriptionId: subscription.id,
    expirationDateTime: subscription.expirationDateTime,
    notificationUrl
  })

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

/**
 * Persist canonical subscription state to `greenhouse_sync.integration_registry`.
 *
 * **ISSUE-075 hardening** — `metadata` JSONB ahora incluye:
 *   - `subscriptionId` — Microsoft Graph subscription ID (used for renew lookup)
 *   - `expirationDateTime` — ISO timestamp; consumed by reliability signal
 *     `identity.entra.webhook_subscription_health` to detect approaching expiry
 *   - `notificationUrl` — audit trail of which env URL was used (forensic for
 *     env-aware URL resolution; helps diagnose staging vs prod drift)
 *   - `lastRenewedAt` — ISO timestamp of this write (created_at OR renewed_at,
 *     whichever path called this)
 *
 * Backwards-compatible: previous rows with only `subscriptionId` keep working
 * (renewal flow re-populates the full state on next successful create/renew).
 * The reliability signal treats `expirationDateTime: null` as `warning`
 * (legacy row, recreate to populate).
 */
export interface PersistedSubscriptionState {
  readonly subscriptionId: string
  readonly expirationDateTime: string
  readonly notificationUrl: string
}

const persistSubscriptionState = async (state: PersistedSubscriptionState): Promise<void> => {
  const metadata = {
    ...state,
    lastRenewedAt: new Date().toISOString()
  }

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
    [JSON.stringify(metadata)]
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

/**
 * Exported reader for the reliability signal
 * `identity.entra.webhook_subscription_health` (TASK ISSUE-075 hardening).
 *
 * Returns `null` when no active subscription is persisted, or when the row
 * exists with legacy shape (only `subscriptionId`). The signal interprets
 * `null` as `unknown` (informational) and `expirationDateTime` absent
 * as `warning` (legacy row — recreate to populate).
 */
export interface PersistedSubscriptionMetadata {
  readonly subscriptionId: string | null
  readonly expirationDateTime: string | null
  readonly notificationUrl: string | null
  readonly lastRenewedAt: string | null
}

export const getPersistedSubscriptionMetadata = async (): Promise<PersistedSubscriptionMetadata | null> => {
  const rows = await query<{
    metadata: {
      subscriptionId?: string
      expirationDateTime?: string
      notificationUrl?: string
      lastRenewedAt?: string
    } | null
  }>(
    `SELECT metadata FROM greenhouse_sync.integration_registry
     WHERE integration_key = 'entra-graph-webhook' AND active = true
     LIMIT 1`
  )

  if (rows.length === 0) return null

  const m = rows[0]?.metadata ?? null

  if (!m) return null

  return {
    subscriptionId: m.subscriptionId ?? null,
    expirationDateTime: m.expirationDateTime ?? null,
    notificationUrl: m.notificationUrl ?? null,
    lastRenewedAt: m.lastRenewedAt ?? null
  }
}
