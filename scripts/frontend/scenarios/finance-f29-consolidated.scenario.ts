// TASK-1197 — Card F29 mensual consolidado en el Finance Dashboard.
// Verifica el render enterprise de las 3 líneas (IVA/retención/PPM) con badge
// oficial vs shadow + degradación honesta. El dashboard hace ~13 fetches (varios
// contra PG), por eso readiness usa un timeout amplio hasta que los skeletons
// limpian (el flag `loading` cae en el finally de fetchData).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'finance-f29-consolidated',
  route: '/finance',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="f29-consolidated-card"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 90000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta finance autenticada via actor GVC local' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar error boundary' },
    { kind: 'visible', selector: '[data-capture="f29-consolidated-card"]', reason: 'card F29 consolidado montado' }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'f29-card',
      note: 'Card F29 consolidado: 3 líneas (IVA/retención/PPM) con badge oficial/shadow',
      clipSelector: '[data-capture="f29-consolidated-card"]'
    }
  ]
}
