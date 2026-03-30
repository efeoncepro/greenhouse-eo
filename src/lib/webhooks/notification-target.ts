const NOTIFICATION_DISPATCH_PATH = '/api/internal/webhooks/notification-dispatch'

import { resolveWebhookProtectionBypassSecret } from './target-url'

const getNotificationProtectionBypassSecret = (env: NodeJS.ProcessEnv) =>
  resolveWebhookProtectionBypassSecret({
    dedicatedSecret: env.WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET,
    fallbackSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET
  })

export const buildNotificationDispatchTargetUrl = ({
  baseUrl,
  env = process.env
}: {
  baseUrl: string
  env?: NodeJS.ProcessEnv
}) => {
  const url = new URL(NOTIFICATION_DISPATCH_PATH, baseUrl)
  const bypassSecret = getNotificationProtectionBypassSecret(env)

  if (bypassSecret) {
    url.searchParams.set('x-vercel-protection-bypass', bypassSecret)
  }

  return url.toString()
}
