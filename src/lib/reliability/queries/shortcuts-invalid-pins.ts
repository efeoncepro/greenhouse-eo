import 'server-only'

import { isKnownShortcutKey } from '@/lib/shortcuts/catalog'
import { listDistinctPinnedShortcutKeys } from '@/lib/shortcuts/pins-store'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-553 Slice 4 — Reliability signal: shortcuts pinned with keys that are
 * no longer in the canonical catalog (`src/lib/shortcuts/catalog.ts`).
 *
 * The reader of `/api/me/shortcuts` already filters out invalid pins so the
 * UI never breaks. This signal exists so operators detect catalog retirement
 * drift and can clean up stale pins (or restore the catalog entry).
 *
 * **Steady state**: 0. Severity warning if > 0 (degraded UX but not blocking).
 *
 * Pattern reference: TASK-780 home-rollout-drift, TASK-774 account-balances-fx-drift.
 */
export const SHORTCUTS_INVALID_PINS_SIGNAL_ID = 'home.shortcuts.invalid_pins'

export const getShortcutsInvalidPinsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const distinctKeys = await listDistinctPinnedShortcutKeys()
    const invalidKeys = distinctKeys.filter(key => !isKnownShortcutKey(key))

    const severity: ReliabilitySignal['severity'] = invalidKeys.length === 0 ? 'ok' : 'warning'

    return {
      signalId: SHORTCUTS_INVALID_PINS_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getShortcutsInvalidPinsSignal',
      label: 'Pines de accesos rápidos sin entrada en el catálogo',
      severity,
      summary:
        invalidKeys.length === 0
          ? `Catálogo coherente. ${distinctKeys.length} llaves distintas pineadas.`
          : `${invalidKeys.length} llave${invalidKeys.length === 1 ? '' : 's'} pineada${invalidKeys.length === 1 ? '' : 's'} sin entry en el catálogo: ${invalidKeys.join(', ')}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'distinct_pinned_keys', value: String(distinctKeys.length) },
        { kind: 'metric', label: 'invalid_keys', value: String(invalidKeys.length) },
        { kind: 'doc', label: 'Catálogo', value: 'src/lib/shortcuts/catalog.ts' },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-553-quick-access-shortcuts-platform.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'home', {
      tags: { source: 'reliability_signal_shortcuts_invalid_pins' }
    })

    return {
      signalId: SHORTCUTS_INVALID_PINS_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getShortcutsInvalidPinsSignal',
      label: 'Pines de accesos rápidos sin entrada en el catálogo',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
