// TASK-1044 — canonical typography reference (the authoritative design-system
// surface, not the mockup). Clips the dense sections for review.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'typography-canonical',
  route: '/admin/design-system/typography',
  viewport: { width: 1280, height: 1100 },
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'vista interna bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'escala', clipSelector: '[data-capture="escala"]', note: 'Escala de roles — specimen + spec por token' },
    { kind: 'mark', label: 'aplicaciones', clipSelector: '[data-capture="aplicaciones"]', note: 'Aplicaciones en componentes reales' },
    { kind: 'mark', label: 'gobernanza', clipSelector: '[data-capture="gobernanza"]', note: 'Gobernanza 6 cards + reglas duras' }
  ]
}
