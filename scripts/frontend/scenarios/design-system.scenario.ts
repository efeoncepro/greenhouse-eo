// Mockup verification — full AXIS palette rendered in-portal from axis-tokens.ts.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system',
  route: '/admin/design-system',
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
  steps: [{ kind: 'mark', label: 'axis-palette-full', fullPage: true, note: 'Paleta AXIS completa: ramps + opacity + neutrales' }]
}
