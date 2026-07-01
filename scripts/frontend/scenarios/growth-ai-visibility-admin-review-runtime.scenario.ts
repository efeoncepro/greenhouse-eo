// TASK-1247 — Admin Review UI del AEO Grader · RUNTIME (ruta real, data real).
// Verifica route + page-guard (viewCode + capability) + data path end-to-end.
// En dev la cola está vacía (todos los review_required ya tienen decisión) → estado
// empty HONESTO: prueba que el fetch a /reviews resuelve y la surface degrada bien.
// Los visuales poblados (cola + drawer) los cubre el mockup (mismos primitives compartidos).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-ai-visibility-admin-review-runtime',
  route: '/admin/growth/ai-visibility',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1500,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="admin-review-empty"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta admin autenticada (agent superadmin)' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [{ kind: 'mark', label: 'runtime-empty', note: 'Ruta real: estado empty honesto (cola sin pendientes en dev)' }]
}
