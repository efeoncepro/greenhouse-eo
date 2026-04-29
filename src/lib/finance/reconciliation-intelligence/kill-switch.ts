export const isReconciliationAiEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.FINANCE_RECONCILIATION_AI_ENABLED === 'true'
