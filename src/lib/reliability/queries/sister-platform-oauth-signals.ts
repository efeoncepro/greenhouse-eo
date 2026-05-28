import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import type { ReliabilitySignal } from '@/types/reliability'

export const SISTER_PLATFORM_OAUTH_EXCHANGE_FAILURE_RATE_SIGNAL_ID =
  'identity.sister_platform_oauth.exchange_failure_rate'

export const SISTER_PLATFORM_OAUTH_REDIRECT_REJECTED_SIGNAL_ID =
  'identity.sister_platform_oauth.redirect_rejected'

export const SISTER_PLATFORM_OAUTH_STALE_CLIENT_CONFIG_SIGNAL_ID =
  'identity.sister_platform_oauth.stale_client_config'

const EXCHANGE_WINDOW_HOURS = 1
const REDIRECT_WINDOW_HOURS = 24

type ExchangeFailureRateRow = {
  total_events: string | number
  rejected_events: string | number
}

type CountRow = {
  n: string | number
}

const unknownSignal = ({
  signalId,
  label,
  source,
  error
}: {
  signalId: string
  label: string
  source: string
  error: unknown
}): ReliabilitySignal => ({
  signalId,
  moduleKey: 'identity',
  kind: 'drift',
  source,
  label,
  severity: 'unknown',
  summary: `No fue posible leer el signal: ${redactErrorForResponse(error)}`,
  observedAt: new Date().toISOString(),
  evidence: [
    { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
  ]
})

export const getSisterPlatformOAuthExchangeFailureRateSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<ExchangeFailureRateRow>(
      `
        SELECT
          COUNT(*)::text AS total_events,
          COUNT(*) FILTER (WHERE outcome <> 'success')::text AS rejected_events
        FROM greenhouse_core.sister_platform_oauth_audit_log
        WHERE event_type IN ('token_success', 'token_reject', 'code_replay')
          AND created_at >= NOW() - ($1::text || ' hours')::interval
      `,
      [String(EXCHANGE_WINDOW_HOURS)]
    )

    const totalEvents = Number(rows[0]?.total_events ?? 0)
    const rejectedEvents = Number(rows[0]?.rejected_events ?? 0)
    const failureRate = totalEvents > 0 ? rejectedEvents / totalEvents : 0
    const severity = failureRate >= 0.2 ? 'error' : failureRate >= 0.05 ? 'warning' : 'ok'

    return {
      signalId: SISTER_PLATFORM_OAUTH_EXCHANGE_FAILURE_RATE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getSisterPlatformOAuthExchangeFailureRateSignal',
      label: 'Sister-platform OAuth exchange failure rate',
      severity,
      summary:
        totalEvents === 0
          ? `0 token exchanges in last ${EXCHANGE_WINDOW_HOURS}h.`
          : `${rejectedEvents}/${totalEvents} token exchange event${totalEvents === 1 ? '' : 's'} rejected in last ${EXCHANGE_WINDOW_HOURS}h.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'total_events', value: String(totalEvents) },
        { kind: 'metric', label: 'rejected_events', value: String(rejectedEvents) },
        { kind: 'metric', label: 'failure_rate', value: failureRate.toFixed(4) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-948-greenhouse-identity-broker-kortex-sso.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_sister_platform_oauth_exchange_failure_rate' }
    })

    return unknownSignal({
      signalId: SISTER_PLATFORM_OAUTH_EXCHANGE_FAILURE_RATE_SIGNAL_ID,
      label: 'Sister-platform OAuth exchange failure rate',
      source: 'getSisterPlatformOAuthExchangeFailureRateSignal',
      error
    })
  }
}

export const getSisterPlatformOAuthRedirectRejectedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CountRow>(
      `
        SELECT COUNT(*)::text AS n
        FROM greenhouse_core.sister_platform_oauth_audit_log
        WHERE event_type = 'redirect_rejected'
          AND created_at >= NOW() - ($1::text || ' hours')::interval
      `,
      [String(REDIRECT_WINDOW_HOURS)]
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SISTER_PLATFORM_OAUTH_REDIRECT_REJECTED_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getSisterPlatformOAuthRedirectRejectedSignal',
      label: 'Sister-platform OAuth redirect rejected',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? `0 redirect URI rejects in last ${REDIRECT_WINDOW_HOURS}h.`
          : `${count} redirect URI reject${count === 1 ? '' : 's'} in last ${REDIRECT_WINDOW_HOURS}h.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'redirect_rejected_count', value: String(count) },
        { kind: 'metric', label: 'window_hours', value: String(REDIRECT_WINDOW_HOURS) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-948-greenhouse-identity-broker-kortex-sso.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_sister_platform_oauth_redirect_rejected' }
    })

    return unknownSignal({
      signalId: SISTER_PLATFORM_OAUTH_REDIRECT_REJECTED_SIGNAL_ID,
      label: 'Sister-platform OAuth redirect rejected',
      source: 'getSisterPlatformOAuthRedirectRejectedSignal',
      error
    })
  }
}

export const getSisterPlatformOAuthStaleClientConfigSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CountRow>(
      `
        SELECT COUNT(*)::text AS n
        FROM greenhouse_core.sister_platform_oauth_clients client
        JOIN greenhouse_core.sister_platform_consumers consumer
          ON consumer.sister_platform_consumer_id = client.sister_platform_consumer_id
        WHERE client.client_status = 'active'
          AND (
            consumer.credential_status <> 'active'
            OR (consumer.expires_at IS NOT NULL AND consumer.expires_at <= NOW())
            OR cardinality(client.redirect_uris) = 0
            OR NOT ('openid' = ANY(client.allowed_scopes))
          )
      `
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SISTER_PLATFORM_OAUTH_STALE_CLIENT_CONFIG_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getSisterPlatformOAuthStaleClientConfigSignal',
      label: 'Sister-platform OAuth stale client config',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? '0 active sister-platform OAuth clients with stale consumer/config.'
          : `${count} active sister-platform OAuth client${count === 1 ? '' : 's'} with stale consumer/config.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'stale_client_config_count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-948-greenhouse-identity-broker-kortex-sso.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_sister_platform_oauth_stale_client_config' }
    })

    return unknownSignal({
      signalId: SISTER_PLATFORM_OAUTH_STALE_CLIENT_CONFIG_SIGNAL_ID,
      label: 'Sister-platform OAuth stale client config',
      source: 'getSisterPlatformOAuthStaleClientConfigSignal',
      error
    })
  }
}
