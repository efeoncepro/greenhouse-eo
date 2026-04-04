import 'server-only'

import { materializeAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-worker'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const toText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toText((value as { value?: unknown }).value)
  }

  return null
}

const buildPeriodKey = (periodYear: number, periodMonth: number) =>
  `${periodYear}-${String(periodMonth).padStart(2, '0')}`

const resolveScopeFromPayload = (payload: Record<string, unknown>) => {
  const periodYear = toNumber(payload.periodYear)
  const periodMonth = toNumber(payload.periodMonth)
  const spaceId = toText(payload.spaceId)

  if (!Number.isInteger(periodYear) || !Number.isInteger(periodMonth)) {
    return null
  }

  if (spaceId) {
    return {
      entityType: 'ico_ai_llm_enrichments_space',
      entityId: `${spaceId}:${buildPeriodKey(periodYear as number, periodMonth as number)}`
    }
  }

  return {
    entityType: 'ico_ai_llm_enrichments_period',
    entityId: buildPeriodKey(periodYear as number, periodMonth as number)
  }
}

const parseScope = (scope: { entityType: string; entityId: string }) => {
  if (scope.entityType === 'ico_ai_llm_enrichments_space') {
    const [spaceId, periodKey] = scope.entityId.split(':')
    const [yearPart, monthPart] = (periodKey ?? '').split('-')

    return {
      spaceId: toText(spaceId),
      periodYear: toNumber(yearPart),
      periodMonth: toNumber(monthPart)
    }
  }

  const [yearPart, monthPart] = scope.entityId.split('-')

  return {
    spaceId: null,
    periodYear: toNumber(yearPart),
    periodMonth: toNumber(monthPart)
  }
}

export const icoLlmEnrichmentsProjection: ProjectionDefinition = {
  name: 'ico_llm_enrichments',
  description: 'Generate and mirror advisory LLM enrichments from persisted ICO AI signals',
  domain: 'delivery',
  triggerEvents: [EVENT_TYPES.icoAiSignalsMaterialized],
  extractScope: payload => resolveScopeFromPayload(payload),
  refresh: async (scope, payload) => {
    const parsed = parseScope(scope)

    if (!Number.isInteger(parsed.periodYear) || !Number.isInteger(parsed.periodMonth)) {
      return `skipped ico_llm_enrichments refresh for ${scope.entityId}: invalid period`
    }

    const result = await materializeAiLlmEnrichments({
      periodYear: parsed.periodYear as number,
      periodMonth: parsed.periodMonth as number,
      spaceId: parsed.spaceId,
      triggerEventId: toText(payload._eventId),
      triggerType: EVENT_TYPES.icoAiSignalsMaterialized
    })

    const scopeLabel = parsed.spaceId
      ? `${parsed.spaceId} @ ${buildPeriodKey(parsed.periodYear as number, parsed.periodMonth as number)}`
      : buildPeriodKey(parsed.periodYear as number, parsed.periodMonth as number)

    return `refreshed ico_llm_enrichments for ${scopeLabel} (${result.recordsWritten} rows; ${result.succeeded} ok / ${result.failed} failed / ${result.skipped} skipped)`
  },
  maxRetries: 1
}
