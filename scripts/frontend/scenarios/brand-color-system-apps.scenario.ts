import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'brand-color-system-apps',
  route: '/design-system/mockup/brand-color-system',
  viewport: { width: 1280, height: 1400 },
  initialHoldMs: 1500,
  readiness: { absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 400, timeout: 12000 },
  assertions: [{ kind: 'noLoginRedirect', reason: 'mockup interno' }, { kind: 'noErrorBoundary', reason: 'sin error boundary' }],
  quality: { allowLoading: true },
  steps: [
    { kind: 'scroll', selector: '[data-capture="color-system-apps"]' },
    { kind: 'mark', label: 'apps', clipSelector: '[data-capture="color-system-apps"]' }
  ]
}
