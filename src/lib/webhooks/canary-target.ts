const CANARY_PATH = '/api/internal/webhooks/canary'

const getCanaryProtectionBypassSecret = (env: NodeJS.ProcessEnv) =>
  env.WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET?.trim() ||
  env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
  ''

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

