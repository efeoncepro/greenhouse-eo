import type { EnvSource } from '@/types/env-source'

export const isExpenseDistributionAiEnabled = (env: EnvSource = process.env) =>
  env.FINANCE_DISTRIBUTION_AI_ENABLED === 'true'
