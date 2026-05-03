export const isExpenseDistributionAiEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.FINANCE_DISTRIBUTION_AI_ENABLED === 'true'
