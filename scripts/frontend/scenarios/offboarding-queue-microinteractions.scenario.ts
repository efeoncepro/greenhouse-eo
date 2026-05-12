/**
 * Demo scenario para validar el helper de captura en V1.
 *
 * Cubre las 4 microinteractions del round 4 sobre /hr/offboarding:
 *   1. KPI tile hover (whileHover y: -1)
 *   2. KPI tile click → layoutId active bar sliding
 *   3. Table row hover (boxShadow inset 1px tone)
 *   4. Inspector cross-fade al seleccionar otro caso (AnimatePresence)
 */

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'offboarding-queue-microinteractions',
  route: '/hr/offboarding',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 2000,
  finalHoldMs: 800,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 8000 },
    { kind: 'mark', label: 'initial-loaded', note: 'Página recién montada, "Todos los casos" tile activo' },

    { kind: 'hover', selector: '[role="tab"][aria-label*="Requieren acción"]' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'kpi-tile-hover', note: 'whileHover y:-1 + bg-tint del tono warning' },

    { kind: 'click', selector: '[role="tab"][aria-label*="Requieren acción"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'kpi-filter-active', note: 'layoutId bar slid + bg-tint stronger + filter aplicado' },

    { kind: 'click', selector: '[role="tab"][aria-label*="Todos los casos"]' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: 'kpi-back-to-all', note: 'layoutId bar volvió al tile inicial (movimiento de regreso)' },

    { kind: 'hover', selector: 'tbody tr:first-child' },
    { kind: 'sleep', ms: 200 },
    { kind: 'mark', label: 'row-hover', note: 'row hover lift + inset shadow 1px tono info' },

    { kind: 'click', selector: 'tbody tr:nth-child(2)' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'inspector-cross-fade', note: 'AnimatePresence mode=wait — inspector swap caso 1 → 2' }
  ]
}
