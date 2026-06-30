// TASK-1247 — Admin Review UI del AEO Grader (gate humano pre-publicación).
// Mockup: valida cola full-width + drawer overlay (temporary) abrir/cerrar.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-ai-visibility-admin-review',
  route: '/admin/growth/ai-visibility/mockup',
  viewport: { width: 1440, height: 900 },
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
    { kind: 'mark', label: 'queue-closed', note: 'Cola full-width, drawer cerrado (estado default que respira)' },
    { kind: 'click', selector: 'text=globe.com' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'drawer-open', note: 'Reconciler abre como drawer overlay sobre la cola' },
    { kind: 'click', selector: 'button[aria-label="Cerrar"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'queue-after-close', note: 'La cola vuelve a quedar full-width al cerrar el drawer' }
  ]
}
