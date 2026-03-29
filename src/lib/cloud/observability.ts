import 'server-only'

import type { CloudObservabilityPosture } from '@/lib/cloud/contracts'
import { getSecretSource } from '@/lib/secrets/secret-manager'

const hasValue = (value: string | undefined) => Boolean(value?.trim())

type ObservabilityEnv = Partial<NodeJS.ProcessEnv>

export const getCloudObservabilityPosture = async (env: ObservabilityEnv = process.env): Promise<CloudObservabilityPosture> => {
  const [sentryDsnSource, slackWebhookSource] = await Promise.all([
    getSecretSource({
      envVarName: 'SENTRY_DSN',
      env: env as NodeJS.ProcessEnv
    }),
    getSecretSource({
      envVarName: 'SLACK_ALERTS_WEBHOOK_URL',
      env: env as NodeJS.ProcessEnv
    })
  ])

  const sentryDsnConfigured = sentryDsnSource.source !== 'unconfigured' || hasValue(env.NEXT_PUBLIC_SENTRY_DSN)
  const sentryClientDsnConfigured = hasValue(env.NEXT_PUBLIC_SENTRY_DSN)
  const sentryAuthTokenConfigured = hasValue(env.SENTRY_AUTH_TOKEN)
  const sentryOrgConfigured = hasValue(env.SENTRY_ORG)
  const sentryProjectConfigured = hasValue(env.SENTRY_PROJECT)
  const sentrySourceMapsReady = sentryAuthTokenConfigured && sentryOrgConfigured && sentryProjectConfigured
  const slackAlertsWebhookConfigured = slackWebhookSource.source !== 'unconfigured'

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
