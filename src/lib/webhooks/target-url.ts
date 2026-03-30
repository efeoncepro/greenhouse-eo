const trimWebhookValue = (value: string | undefined) => {
  const normalized = value?.replace(/\\[rn]/g, '').trim()

  return normalized ? normalized : ''
}

export const resolveWebhookBaseUrl = ({
  request,
  env = process.env
}: {
  request: Request
  env?: NodeJS.ProcessEnv
}) => {
  const requestUrl = new URL(request.url)
  const forwardedProto = trimWebhookValue(request.headers.get('x-forwarded-proto') ?? undefined)
  const forwardedHost = trimWebhookValue(request.headers.get('x-forwarded-host') ?? undefined)

  if (forwardedHost) {
    return `${forwardedProto || requestUrl.protocol.replace(':', '') || 'https'}://${forwardedHost}`
  }

  if (requestUrl.origin && requestUrl.origin !== 'null') {
    return requestUrl.origin
  }

  const nextAuthUrl = trimWebhookValue(env.NEXTAUTH_URL)

  if (nextAuthUrl) {
    return nextAuthUrl
  }

  const vercelUrl = trimWebhookValue(env.VERCEL_URL)

  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  return requestUrl.origin
}

export const resolveWebhookProtectionBypassSecret = ({
  dedicatedSecret,
  fallbackSecret
}: {
  dedicatedSecret?: string
  fallbackSecret?: string
}) => trimWebhookValue(dedicatedSecret) || trimWebhookValue(fallbackSecret)
