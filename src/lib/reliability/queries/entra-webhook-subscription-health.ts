import 'server-only'

import { getPersistedSubscriptionMetadata } from '@/lib/entra/webhook-subscription'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * ISSUE-075 hardening — Reliability signal:
 * `identity.entra.webhook_subscription_health`.
 *
 * Detecta cuando la Microsoft Graph webhook subscription para
 * `/users` (changeType=updated) se está acercando a su expiry, ya expiró,
 * o quedó en estado legacy sin metadata enriquecida.
 *
 * **Por qué existe**:
 *
 * El cron `ops-entra-webhook-renew` (Cloud Scheduler, cada 2 dias a las 06:00
 * America/Santiago) intenta PATCH renew. Si el endpoint receptor falla el validation
 * handshake (caso ISSUE-075), la subscription puede expirar (~3 días tras el
 * último renew exitoso) y Greenhouse pierde notifications en tiempo real de
 * cambios de profiles en Entra ID.
 *
 * Single source of failure feedback hasta ahora era Sentry alert cuando el
 * cron POST falla. Eso es reactive — el operator se entera DESPUÉS de la
 * expiración. Este signal lo hace proactivo: el subsystem `Identity & Access`
 * lo expone con severity escalada conforme el expiry se acerca.
 *
 * **Comportamiento canónico**:
 *
 *   | Estado del registry                         | Severity | Summary            |
 *   |---------------------------------------------|----------|--------------------|
 *   | No row activa (subscription nunca creada)   | unknown  | Awaiting bootstrap |
 *   | Row activa, `expirationDateTime` ausente    | warning  | Legacy metadata    |
 *   | `expirationDateTime` ya pasó                | error    | Expired            |
 *   | `expirationDateTime` < now() + 12h          | error    | Imminent expiry    |
 *   | `expirationDateTime` < now() + 48h          | warning  | Approaching expiry |
 *   | `expirationDateTime` > now() + 48h          | ok       | Healthy            |
 *
 * **Steady state esperado** = `ok`.
 *
 * **Kind**: `drift`. El estado canónico es "subscription siempre renovada con
 * suficiente margen"; cualquier drift contra ese estado el signal lo eleva.
 *
 * Pattern reference: `account-balances-fx-drift.ts` (TASK-774) +
 * `critical-tables-missing.ts` (TASK-838).
 */
export const ENTRA_WEBHOOK_SUBSCRIPTION_HEALTH_SIGNAL_ID =
  'identity.entra.webhook_subscription_health'

// Threshold canónico (horas). Si la lib emerge una segunda integration que use
// el mismo shape, promote a `src/lib/reliability/thresholds.ts`.
const IMMINENT_EXPIRY_HOURS = 12
const APPROACHING_EXPIRY_HOURS = 48

const MS_PER_HOUR = 60 * 60 * 1000

interface SubscriptionHealthEvaluation {
  readonly severity: 'ok' | 'warning' | 'error' | 'unknown'
  readonly summary: string
  readonly hoursUntilExpiry: number | null
  readonly state: 'unknown' | 'legacy_metadata' | 'expired' | 'imminent' | 'approaching' | 'healthy'
}

export const evaluateSubscriptionHealth = (
  metadata: {
    expirationDateTime: string | null
    subscriptionId: string | null
  } | null,
  now: Date = new Date()
): SubscriptionHealthEvaluation => {
  if (!metadata || !metadata.subscriptionId) {
    return {
      severity: 'unknown',
      summary: 'Microsoft Graph webhook subscription no registrada. Pendiente de bootstrap (próximo cron renew creará la subscription).',
      hoursUntilExpiry: null,
      state: 'unknown'
    }
  }

  if (!metadata.expirationDateTime) {
    return {
      severity: 'warning',
      summary: `Subscription ${metadata.subscriptionId} sin expirationDateTime en metadata (legacy row pre-ISSUE-075). Forzar create/renew para poblar el campo.`,
      hoursUntilExpiry: null,
      state: 'legacy_metadata'
    }
  }

  const expiryMs = Date.parse(metadata.expirationDateTime)

  if (Number.isNaN(expiryMs)) {
    return {
      severity: 'warning',
      summary: `Subscription ${metadata.subscriptionId} con expirationDateTime inválido: "${metadata.expirationDateTime}". Forzar create/renew.`,
      hoursUntilExpiry: null,
      state: 'legacy_metadata'
    }
  }

  const hoursUntilExpiry = (expiryMs - now.getTime()) / MS_PER_HOUR

  if (hoursUntilExpiry <= 0) {
    return {
      severity: 'error',
      summary: `Subscription ${metadata.subscriptionId} expiró hace ${Math.abs(hoursUntilExpiry).toFixed(1)}h. Greenhouse no recibe notifications en tiempo real desde Entra ID.`,
      hoursUntilExpiry,
      state: 'expired'
    }
  }

  if (hoursUntilExpiry < IMMINENT_EXPIRY_HOURS) {
    return {
      severity: 'error',
      summary: `Subscription expira en ${hoursUntilExpiry.toFixed(1)}h (<${IMMINENT_EXPIRY_HOURS}h). Trigger manual del cron renew para evitar interrupción.`,
      hoursUntilExpiry,
      state: 'imminent'
    }
  }

  if (hoursUntilExpiry < APPROACHING_EXPIRY_HOURS) {
    return {
      severity: 'warning',
      summary: `Subscription expira en ${hoursUntilExpiry.toFixed(1)}h (<${APPROACHING_EXPIRY_HOURS}h). El cron diario renovará automáticamente.`,
      hoursUntilExpiry,
      state: 'approaching'
    }
  }

  return {
    severity: 'ok',
    summary: `Subscription saludable. Expira en ${hoursUntilExpiry.toFixed(1)}h.`,
    hoursUntilExpiry,
    state: 'healthy'
  }
}

export const getEntraWebhookSubscriptionHealthSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const metadata = await getPersistedSubscriptionMetadata()
    const evaluation = evaluateSubscriptionHealth(metadata)

    return {
      signalId: ENTRA_WEBHOOK_SUBSCRIPTION_HEALTH_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getEntraWebhookSubscriptionHealthSignal',
      label: 'Microsoft Graph webhook subscription (Entra ID)',
      severity: evaluation.severity,
      summary: evaluation.summary,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'state',
          value: evaluation.state
        },
        {
          kind: 'metric',
          label: 'subscription_id',
          value: metadata?.subscriptionId ?? 'none'
        },
        {
          kind: 'metric',
          label: 'expiration_date_time',
          value: metadata?.expirationDateTime ?? 'unknown'
        },
        {
          kind: 'metric',
          label: 'hours_until_expiry',
          value:
            evaluation.hoursUntilExpiry === null
              ? 'unknown'
              : evaluation.hoursUntilExpiry.toFixed(1)
        },
        {
          kind: 'metric',
          label: 'last_renewed_at',
          value: metadata?.lastRenewedAt ?? 'unknown'
        },
        {
          kind: 'metric',
          label: 'notification_url',
          value: metadata?.notificationUrl ?? 'unknown'
        },
        {
          kind: 'doc',
          label: 'Issue',
          value: 'docs/issues/open/ISSUE-075-entra-webhook-validation-handshake-rejects-post.md'
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_entra_webhook_subscription_health' }
    })

    return {
      signalId: ENTRA_WEBHOOK_SUBSCRIPTION_HEALTH_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getEntraWebhookSubscriptionHealthSignal',
      label: 'Microsoft Graph webhook subscription (Entra ID)',
      severity: 'unknown',
      summary: 'No fue posible leer el estado del subscription registry. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
