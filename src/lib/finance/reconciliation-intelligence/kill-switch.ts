import type { EnvSource } from '@/types/env-source'

export const isReconciliationAiEnabled = (env: EnvSource = process.env) =>
  env.FINANCE_RECONCILIATION_AI_ENABLED === 'true'
