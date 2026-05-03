import { randomUUID } from 'node:crypto'

export const generateExpenseDistributionSuggestionId = () =>
  `ed-ai-${randomUUID()}`
