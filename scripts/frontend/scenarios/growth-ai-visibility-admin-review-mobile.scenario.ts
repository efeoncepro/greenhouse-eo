// TASK-1247 — Admin Review UI del AEO Grader · mobile (390px).
// Verifica que el drawer reconciler cae a drawer móvil y la cola scrollea horizontal contenida.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-ai-visibility-admin-review-mobile',
  route: '/admin/growth/ai-visibility/mockup',
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', device: 'iPhone 13' }],
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="admin-review-queue"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'queue-closed-mobile', note: 'Cola en mobile (drawer cerrado)' },
    { kind: 'click', selector: 'text=globe.com' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'drawer-open-mobile', note: 'Reconciler cae a drawer móvil' }
  ]
}
