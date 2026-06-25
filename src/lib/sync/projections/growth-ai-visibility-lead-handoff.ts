import 'server-only'

/**
 * TASK-1242 — Reactive consumer: lead del grader → upsert contact/company en HubSpot.
 *
 * Trigger: `growth.ai_visibility.lead_handoff_requested` (emitido por el command gobernado
 * `syncAiVisibilityRunToHubSpot` — auto desde el publish del snapshot, o re-trigger admin).
 * Hace el WRITE authoritative via `executeLeadHandoff` (re-lee de PG, NUNCA confía en el
 * payload). Gates duros viven en execute (flag + consent + score `ready`). Lane: `ops-reactive-growth`.
 *
 * Idempotente: `executeLeadHandoff` converge (upsert por email/dominio + `hubspot_synced_at`).
 * Manejo de fallo: `failed` retryable → throw (retry/dead-letter); `failed` no-retryable
 * (400/auth) → captura + ack (no reintentar lo que no se arregla solo). `skipped` → ack.
 */

import { executeLeadHandoff } from '@/lib/growth/ai-visibility/hubspot/execute'
import { GROWTH_AI_VISIBILITY_LEAD_HANDOFF_REQUESTED_EVENT } from '@/lib/growth/ai-visibility/hubspot/events'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

export const growthAiVisibilityLeadHandoffProjection: ProjectionDefinition = {
  name: 'growth_ai_visibility_lead_handoff',
  description:
    'TASK-1242 — growth.ai_visibility.lead_handoff_requested → upsert contact/company en HubSpot (in-app directo, idempotente, consent+score gated)',
  domain: 'growth',
  triggerEvents: [GROWTH_AI_VISIBILITY_LEAD_HANDOFF_REQUESTED_EVENT],
  extractScope: payload => {
    const runId = typeof payload.runId === 'string' ? payload.runId.trim() : ''

    if (!runId) return null

    return { entityType: 'growth_ai_visibility_lead', entityId: runId }
  },
  refresh: async scope => {
    const runId = scope.entityId
    const result = await executeLeadHandoff(runId)

    if (result.status === 'failed') {
      if (result.retryable) {
        // Fallo transitorio (429/5xx/red/timeout): throw → retry/dead-letter del consumer.
        const err = new Error(`lead_handoff transient failure for run ${runId}: ${result.reason ?? 'unknown'}`)

        captureWithDomain(err, 'integrations.hubspot', {
          tags: { source: 'growth_ai_visibility_lead_handoff', stage: 'execute', retryable: 'true' },
          extra: { runId },
        })

        throw err
      }

      // No-retryable (400/auth): reintentar no ayuda. Captura + ack para no quemar reintentos.
      captureWithDomain(new Error(`lead_handoff permanent failure for run ${runId}: ${result.reason ?? 'unknown'}`), 'integrations.hubspot', {
        level: 'error',
        tags: { source: 'growth_ai_visibility_lead_handoff', stage: 'execute', retryable: 'false' },
        extra: { runId },
      })

      return `lead_handoff permanent-fail (acked): run ${runId} reason=${result.reason ?? 'unknown'}`
    }

    if (result.status === 'skipped') {
      return `lead_handoff skipped: run ${runId} reason=${result.reason ?? 'unknown'}`
    }

    return `lead_handoff ok: run ${runId} contact=${result.contactId ?? '-'} company=${result.companyId ?? '-'}`
  },
  maxRetries: 3,
}
