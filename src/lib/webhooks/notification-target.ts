const NOTIFICATION_DISPATCH_PATH = '/api/internal/webhooks/notification-dispatch'

const getNotificationProtectionBypassSecret = (env: NodeJS.ProcessEnv) =>
  env.WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET?.trim() ||
  env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
  ''

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
