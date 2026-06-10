// TASK-1036/1038 — typography application map: real components annotated with the
// type token they resolve to. Clips the "Aplicaciones · Controles" section.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'typography-applications',
  route: '/design-system/typography/mockup',
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
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'peso-500',
      clipSelector: '[data-capture="peso-500"]',
      note: 'Cap 5b · Peso 500 (TASK-1039) — evaluado y descartado: comparación live 400/500/600 conservada como récord del análisis'
    },
    {
      kind: 'mark',
      label: 'transversales',
      clipSelector: '[data-capture="transversales"]',
      note: 'Cap 6 · Transversales — decisiones resueltas (a11y, color, truncation, i18n, fluid, display, PDF/email, íconos)'
    },
    {
      kind: 'mark',
      label: 'apps-impact',
      clipSelector: '[data-capture="apps-impact"]',
      note: 'Aplicaciones · impacto AS-IS → TO-BE'
    }
  ]
}
