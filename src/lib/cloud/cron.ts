import type { EnvSource } from '@/types/env-source'

export const getCronSecretValue = (env: EnvSource = process.env) => env.CRON_SECRET?.trim() || ''

export const getCronSecretState = (env: EnvSource = process.env) => {
  const secret = getCronSecretValue(env)

  return {
    configured: secret.length > 0,
    source: secret.length > 0 ? 'env' : 'missing'
  } as const
}

export const hasCronSecretConfigured = (env: EnvSource = process.env) => getCronSecretState(env).configured

export const isVercelCronRequest = (request: Request) => {
  const vercelCronHeader = request.headers.get('x-vercel-cron')?.trim() || ''
  const userAgent = request.headers.get('user-agent')?.trim() || ''

  return vercelCronHeader === '1' || userAgent.startsWith('vercel-cron/')
}
