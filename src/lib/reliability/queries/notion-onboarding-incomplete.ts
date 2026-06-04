import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1009 — `integrations.notion.onboarding_incomplete`
 *
 * Detecta clientes con un caso de onboarding abierto (in_progress|blocked) cuyo
 * ítem bloqueante `verify_notion_flowing` sigue sin completarse después de 7 días
 * → su data NO está fluyendo al portal y el onboarding está estancado en ese
 * eslabón. Steady state = 0.
 *
 * Barato por diseño: COUNT PG O(1) sobre casos abiertos + su ítem. NO corre el
 * preflight de 9 checks por caso (eso es N×BQ, anti-escalable) — el preflight
 * pesado queda on-demand (CLI / endpoint notion-preflight).
 */

const SIGNAL_ID = 'integrations.notion.onboarding_incomplete'
const SOURCE = 'getNotionOnboardingIncompleteSignal'
const LABEL = 'Onboarding Notion sin fluir'
const OVERDUE_DAYS = 7

export const getNotionOnboardingIncompleteSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM greenhouse_core.client_lifecycle_cases c
       WHERE c.case_kind = 'onboarding'
         AND c.status IN ('in_progress', 'blocked')
         AND c.created_at < NOW() - INTERVAL '${OVERDUE_DAYS} days'
         AND EXISTS (
           SELECT 1 FROM greenhouse_core.client_lifecycle_checklist_items i
           WHERE i.case_id = c.case_id
             AND i.item_code = 'verify_notion_flowing'
             AND i.status NOT IN ('completed', 'skipped', 'not_applicable')
         )`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SIGNAL_ID,
      moduleKey: 'integrations.notion',
      kind: 'data_quality',
      source: SOURCE,
      label: LABEL,
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin onboardings trabados en el flujo Notion→portal.'
          : `${count} onboarding(s) con verify_notion_flowing pendiente hace +${OVERDUE_DAYS} días (data no fluye al portal).`,
      observedAt: new Date().toISOString(),
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `client_lifecycle_cases (onboarding, in_progress|blocked, >${OVERDUE_DAYS}d) con item verify_notion_flowing no completado`
        },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/complete/TASK-1009-notion-onboarding-flow-preflight.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.notion', { tags: { source: `reliability_signal_${SOURCE}` } })

    return {
      signalId: SIGNAL_ID,
      moduleKey: 'integrations.notion',
      kind: 'data_quality',
      source: SOURCE,
      label: LABEL,
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt: new Date().toISOString(),
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
