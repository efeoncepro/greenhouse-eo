import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { advanceLifecycleChecklistItem } from '@/lib/client-lifecycle/commands/advance-checklist-item'
import { resolveOnboardingEvidence } from '@/lib/client-lifecycle/evidence/composer'
import { canAutoCompleteFromEvidence } from '@/lib/client-lifecycle/evidence/evidence-types'
import { isOnboardingItemEvidenceAutocompleteEnabled } from '@/lib/client-lifecycle/flags'
import { getChecklistItems } from '@/lib/client-lifecycle/store'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

/**
 * TASK-1017 — POST /api/admin/clients/lifecycle/cases/[caseId]/verify-evidence
 *
 * Lee la evidencia REAL de los 6 ítems auto-derivables del checklist (read-only,
 * degradación honesta) y, SOLO si la flag está ON, auto-completa los ítems con
 * evidencia `detected` que NO requieren un asset de evidencia humano. Anti-fake-green:
 * nunca completa con evidencia `pending`/`unverifiable`. Idempotente; respeta el
 * override manual. Mirror del patrón de auto-complete de TASK-1009 (notion-preflight).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const { tenant, userId, errorResponse } = await authorizeLifecycle('client.lifecycle.case.advance')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const evidence = await resolveOnboardingEvidence(caseId)
    const autocompleteEnabled = isOnboardingItemEvidenceAutocompleteEnabled()
    const autoCompleted: string[] = []

    if (autocompleteEnabled) {
      const items = await getChecklistItems(caseId)
      const byCode = new Map(items.map(item => [item.itemCode, item]))

      for (const ev of evidence.items) {
        const item = byCode.get(ev.itemCode)

        // Decisión pura + safety-critical (anti-fake-green + respeta override manual).
        // `requiresEvidence` items (p.ej. provision_notion_workspace) necesitan un
        // asset humano: la evidencia del sistema NO lo reemplaza → quedan manuales.
        if (
          !item ||
          !canAutoCompleteFromEvidence({
            evidenceStatus: ev.status,
            requiresEvidence: item.requiresEvidence,
            itemStatus: item.status
          })
        ) {
          continue
        }

        try {
          await advanceLifecycleChecklistItem({
            caseId,
            itemCode: ev.itemCode,
            newStatus: 'completed',
            notes: `Verificación automática: ${ev.detail}`.slice(0, 480),
            actorUserId: userId
          })
          autoCompleted.push(ev.itemCode)
        } catch (itemError) {
          // Best-effort: un ítem que no pudo cerrarse no rompe la verificación.
          captureWithDomain(itemError, 'commercial', {
            tags: { source: 'client_lifecycle:verify_evidence', item: ev.itemCode }
          })
        }
      }
    }

    return NextResponse.json({
      caseId: evidence.caseId,
      items: evidence.items,
      autoCompleted,
      autocompleteEnabled,
      checkedAt: evidence.checkedAt
    })
  } catch (error) {
    return mapLifecycleError(error, 'verify_evidence')
  }
}
