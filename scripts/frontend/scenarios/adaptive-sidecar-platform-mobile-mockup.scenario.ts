// TASK-1028 — Adaptive Sidecar UI Platform mobile drawer verification.
// Mockup only: validates temporary mode, close, and re-open behavior.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'adaptive-sidecar-platform-mobile-mockup',
  route: '/platform/adaptive-sidecar/mockup',
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', device: 'iPhone 13' }],
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="adaptive-sidecar-platform"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    { kind: 'visible', selector: 'text=Reconciler · GH-1842', reason: 'el drawer móvil debe abrir con contexto' }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'mobile-drawer-open',
      note: 'El sidecar cae a bottom drawer para proteger el contenido principal'
    },
    { kind: 'click', selector: 'button[aria-label="Cerrar panel"]' },
    { kind: 'sleep', ms: 250 },
    {
      kind: 'mark',
      label: 'mobile-main-after-close',
      note: 'El workbench móvil vuelve a quedar operable después de cerrar el drawer'
    },
    { kind: 'click', selector: 'button:has-text("Abrir panel")' },
    { kind: 'sleep', ms: 300 },
    {
      kind: 'mark',
      label: 'mobile-drawer-reopened',
      note: 'El drawer se puede reabrir desde el trigger principal'
    }
  ]
}
