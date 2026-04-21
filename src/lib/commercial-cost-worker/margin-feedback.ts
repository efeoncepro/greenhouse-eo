import 'server-only'

import type {
  MarginFeedbackBatchInput,
  MarginFeedbackBatchResult
} from '@/lib/commercial-intelligence/margin-feedback-materializer'
import { runMarginFeedbackBatch } from '@/lib/commercial-intelligence/margin-feedback-materializer'

// ────────────────────────────────────────────────────────────────────────────
// TASK-482 — Worker contract glue for margin-feedback batch endpoint.
//
// Keeps the server.ts file free of request parsing / defaulting logic, and
// mirrors the pattern used by `commercial-cost-worker/materialize.ts` and
// `quote-reprice-bulk.ts`.
// ────────────────────────────────────────────────────────────────────────────

const MAX_MONTHS_BACK = 12

const toInt = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? Math.trunc(n) : null
}

const normalizeYear = (value: unknown): number | null => {
  const parsed = toInt(value)

  if (parsed === null) return null

  // Guard against nonsense years; accept 2000-2100 to stay future-proof.
  if (parsed < 2000 || parsed > 2100) return null
  
return parsed
}

const normalizeMonth = (value: unknown): number | null => {
  const parsed = toInt(value)

  if (parsed === null) return null
  if (parsed < 1 || parsed > 12) return null
  
return parsed
}

const normalizeMonthsBack = (value: unknown): number => {
  const parsed = toInt(value)

  if (parsed === null) return 1
  if (parsed < 0) return 0
  if (parsed > MAX_MONTHS_BACK) return MAX_MONTHS_BACK
  
return parsed
}

export const normalizeMarginFeedbackRequest = (
  body: Record<string, unknown>
): MarginFeedbackBatchInput => ({
  year: normalizeYear(body.year),
  month: normalizeMonth(body.month),
  monthsBack: normalizeMonthsBack(body.monthsBack)
})

export const runMarginFeedback = async (
  input: MarginFeedbackBatchInput
): Promise<MarginFeedbackBatchResult> => runMarginFeedbackBatch(input)
