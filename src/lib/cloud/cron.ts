export const getCronSecretValue = (env: NodeJS.ProcessEnv = process.env) => env.CRON_SECRET?.trim() || ''

export const getCronSecretState = (env: NodeJS.ProcessEnv = process.env) => {
  const secret = getCronSecretValue(env)

  return {
    configured: secret.length > 0,
    source: secret.length > 0 ? 'env' : 'missing'
  } as const
}

export const hasCronSecretConfigured = (env: NodeJS.ProcessEnv = process.env) => getCronSecretState(env).configured

export const isVercelCronRequest = (request: Request) => {
  const vercelCronHeader = request.headers.get('x-vercel-cron')?.trim() || ''
  const userAgent = request.headers.get('user-agent')?.trim() || ''

  return vercelCronHeader === '1' || userAgent.startsWith('vercel-cron/')
}
