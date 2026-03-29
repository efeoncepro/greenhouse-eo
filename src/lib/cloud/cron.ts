export const getCronSecretState = (env: NodeJS.ProcessEnv = process.env) => {
  const secret = env.CRON_SECRET?.trim() || ''

  return {
    configured: secret.length > 0,
    source: secret.length > 0 ? 'env' : 'missing'
  } as const
}

export const hasCronSecretConfigured = (env: NodeJS.ProcessEnv = process.env) => getCronSecretState(env).configured
