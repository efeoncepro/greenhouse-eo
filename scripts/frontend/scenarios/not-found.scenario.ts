// Not Found 404 page — enterprise visual verification (desktop + mobile).
// Verifies the not-found hierarchy, prominent 404 code, recovery actions,
// brand character, and bottom Efeonce wordmark across viewports.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'not-found',
  route: '/404',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 800,
  readiness: {
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000,
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]']
  },
  assertions: [{ kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }],
  steps: [
    {
      kind: 'mark',
      label: 'snapshot',
      note: 'not-found hierarchy + recovery actions + Efeonce footer'
    }
  ]
}
