import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'gvc-readiness-assertions-report',
  route: '/hr/offboarding/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1200,
  readiness: {
    selector: 'h4',
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 150,
    timeout: 8000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup route should render inside authenticated shell when auth is present' },
    { kind: 'noErrorBoundary', reason: 'capture evidence must not be an app error' },
    { kind: 'notVisible', selector: '[data-testid="login-card"]', reason: 'avoid false evidence from login page' }
  ],
  steps: [
    { kind: 'mark', label: 'readiness-first-fold', note: 'Readiness + assertions + report regression' }
  ]
}
