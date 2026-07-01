// TASK-1247 — Admin Review UI del AEO Grader (gate humano pre-publicación).
// Mockup: valida cola full-width + drawer overlay (temporary) abrir/cerrar.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-ai-visibility-admin-review',
  route: '/admin/growth/ai-visibility/mockup',
  mutating: true,
  safeForCapture: true,
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
    { kind: 'mark', label: 'drawer-open-conflict', note: 'Reconciler con banner de conflicto multi-revisor (Globe)' },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 350 },
    { kind: 'click', selector: 'text=bemmbo.com' },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'drawer-abstained', note: 'Abstención del grader (insufficient_data) — no se publica' },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 350 },
    { kind: 'click', selector: 'button:has-text("Cargando")' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'loading', note: 'Skeleton de la cola (loading)' },
    { kind: 'click', selector: 'button:has-text("Cola vacía")' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: 'empty', note: 'Estado vacío: sin reportes pendientes' },
    { kind: 'click', selector: 'button:has-text("Sin acceso")' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'denied', note: 'Permission denied: sin capability de revisión' }
  ]
}
