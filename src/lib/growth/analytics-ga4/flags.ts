export const GROWTH_GA4_FLAG = 'GROWTH_GA4_ENABLED'

export const isGa4Enabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[GROWTH_GA4_FLAG]?.trim().toLowerCase() === 'true'
