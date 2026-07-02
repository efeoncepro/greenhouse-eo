// TASK-1247 — Admin Review UI del AEO Grader · RUNTIME mobile (390px).
// Verifica que la surface real degrada bien en viewport chico (empty state honesto).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-ai-visibility-admin-review-runtime-mobile',
  route: '/admin/growth/ai-visibility',
  viewport: { width: 390, height: 844 },
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
  steps: [{ kind: 'mark', label: 'runtime-empty-mobile', note: 'Ruta real en 390px: empty state honesto responsive' }]
}
