// TASK-1035 — Dashboard Floating Action Dock shell collision model.
// Verifies persistent viewport actions share one bottom-right dock and do not
// overlap footer/sticky content after scroll.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'dashboard-floating-action-dock',
  route: '/agency',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-gh-floating-action-dock="true"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'dashboard route authenticated via GVC local actor' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar error boundary' },
    { kind: 'visible', selector: '[data-gh-floating-action-dock="true"]', reason: 'dock global montado' },
    { kind: 'visible', selector: '[data-nexa-floating-trigger="true"]', reason: 'Nexa vive dentro del dock' }
  ],
  steps: [
    { kind: 'mark', label: 'initial-dock', note: 'Dock inicial: Nexa ocupa la accion persistente inferior derecha' },
    { kind: 'scroll', scrollTo: 'bottom' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'bottom-with-scroll-top', note: 'Estado scrolleado: ScrollToTop aparece apilado sobre Nexa sin solapar footer' },
    { kind: 'click', selector: '[data-nexa-floating-trigger="true"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'nexa-open-from-dock', note: 'Panel Nexa abre usando offsets del dock y queda separado de la columna de acciones' }
  ]
}
