// Coming Soon launch page — enterprise visual verification (desktop + mobile).
// Verifies the hero (eyebrow + Poppins headline), premium countdown, cohesive
// capture pill (input + button aligned), brand character, and the bottom
// Efeonce wordmark across viewports.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'coming-soon',
  route: '/coming-soon',
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 800,
  readiness: {
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 12000,
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]']
  },
  assertions: [
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'snapshot',
      note: 'hero + countdown + capture pill + Efeonce footer'
    }
  ]
}
