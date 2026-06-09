// Mockup verification — semantic color a11y comparison (current vs proposed contrast-safe tint).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'semantic-colors-a11y-mockup',
  route: '/admin/semantic-colors/mockup',
  viewport: { width: 1280, height: 900 },
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
      label: 'semantic-colors-full',
      fullPage: true,
      note: 'Comparación completa actual vs propuesta, light + dark, 4 semánticos'
    }
  ]
}
