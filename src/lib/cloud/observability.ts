import 'server-only'

import type { CloudObservabilityPosture } from '@/lib/cloud/contracts'

const hasValue = (value: string | undefined) => Boolean(value?.trim())

type ObservabilityEnv = Record<string, string | undefined>

export const getCloudObservabilityPosture = (env: ObservabilityEnv = process.env): CloudObservabilityPosture => {
  const sentryDsnConfigured = hasValue(env.SENTRY_DSN) || hasValue(env.NEXT_PUBLIC_SENTRY_DSN)
  const sentryClientDsnConfigured = hasValue(env.NEXT_PUBLIC_SENTRY_DSN)
  const sentryAuthTokenConfigured = hasValue(env.SENTRY_AUTH_TOKEN)
  const sentryOrgConfigured = hasValue(env.SENTRY_ORG)
  const sentryProjectConfigured = hasValue(env.SENTRY_PROJECT)
  const sentrySourceMapsReady = sentryAuthTokenConfigured && sentryOrgConfigured && sentryProjectConfigured
  const slackAlertsWebhookConfigured = hasValue(env.SLACK_ALERTS_WEBHOOK_URL)

  const summaryParts = [
    sentryDsnConfigured
      ? sentrySourceMapsReady
        ? 'Sentry runtime + source maps listos'
        : sentryClientDsnConfigured
          ? 'Sentry runtime configurado con source maps pendientes'
          : 'Sentry server configurado; falta DSN público o source maps'
      : null,
    slackAlertsWebhookConfigured ? 'Slack alerts configuradas' : null
  ].filter(Boolean)

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(' · ') : 'Observabilidad externa no configurada',
    sentry: {
      dsnConfigured: sentryDsnConfigured,
      clientDsnConfigured: sentryClientDsnConfigured,
      authTokenConfigured: sentryAuthTokenConfigured,
      orgConfigured: sentryOrgConfigured,
      projectConfigured: sentryProjectConfigured,
      enabled: sentryDsnConfigured,
      sourceMapsReady: sentrySourceMapsReady
    },
    slack: {
      alertsWebhookConfigured: slackAlertsWebhookConfigured,
      enabled: slackAlertsWebhookConfigured
    }
  }
}
