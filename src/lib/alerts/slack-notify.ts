import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'

const getSlackWebhookUrl = async () => {
  const resolution = await resolveSecret({
    envVarName: 'SLACK_ALERTS_WEBHOOK_URL'
  })

  return resolution.value?.trim() || null
}

const toMessage = (error: unknown) => {
  if (error instanceof Error) return error.stack || error.message

  return String(error)
}

export const sendSlackAlert = async (text: string) => {
  const webhookUrl = await getSlackWebhookUrl()

  if (!webhookUrl) return false

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })

    return response.ok
  } catch (error) {
    console.error('[slack-alert] Failed to send Slack alert', error)

    return false
  }
}

export const alertCronFailure = async (cronName: string, error: unknown, context?: Record<string, unknown>) => {
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'
  const contextSuffix = context ? `\nContext: \`${JSON.stringify(context)}\`` : ''

  return sendSlackAlert(
    `:warning: Cron failure \`${cronName}\`\nEnv: \`${environment}\`\nError:\n\`\`\`${toMessage(error).slice(0, 1200)}\`\`\`${contextSuffix}`
  )
}
