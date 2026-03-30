const CANARY_PATH = '/api/internal/webhooks/canary'

import { resolveWebhookProtectionBypassSecret } from './target-url'

const getCanaryProtectionBypassSecret = (env: NodeJS.ProcessEnv) =>
  resolveWebhookProtectionBypassSecret({
    dedicatedSecret: env.WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET,
    fallbackSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET
  })

export const buildCanaryTargetUrl = ({
  baseUrl,
  env = process.env
}: {
  baseUrl: string
  env?: NodeJS.ProcessEnv
}) => {
  const url = new URL(CANARY_PATH, baseUrl)
  const bypassSecret = getCanaryProtectionBypassSecret(env)

  if (bypassSecret) {
    url.searchParams.set('x-vercel-protection-bypass', bypassSecret)
  }

  return url.toString()
}
