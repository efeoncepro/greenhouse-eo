import 'server-only'

import type { CloudObservabilityPosture } from '@/lib/cloud/contracts'

const hasValue = (value: string | undefined) => Boolean(value?.trim())

type ObservabilityEnv = Record<string, string | undefined>

export const getCloudObservabilityPosture = (env: ObservabilityEnv = process.env): CloudObservabilityPosture => {
  const sentryDsnConfigured = hasValue(env.SENTRY_DSN)
  const sentryAuthTokenConfigured = hasValue(env.SENTRY_AUTH_TOKEN)
  const slackAlertsWebhookConfigured = hasValue(env.SLACK_ALERTS_WEBHOOK_URL)

  const summaryParts = [
    sentryDsnConfigured
      ? sentryAuthTokenConfigured
        ? 'Sentry runtime + source maps configurados'
        : 'Sentry runtime configurado sin auth token de source maps'
      : null,
    slackAlertsWebhookConfigured ? 'Slack alerts configuradas' : null
  ].filter(Boolean)

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(' · ') : 'Observabilidad externa no configurada',
    sentry: {
      dsnConfigured: sentryDsnConfigured,
      authTokenConfigured: sentryAuthTokenConfigured,
      enabled: sentryDsnConfigured
    },
    slack: {
      alertsWebhookConfigured: slackAlertsWebhookConfigured,
      enabled: slackAlertsWebhookConfigured
    }
  }
}
