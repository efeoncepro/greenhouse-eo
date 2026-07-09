import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-demand-error',
  route: '/agency/hiring?captureFailure=load',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  mutating: true,
  safeForCapture: true,
  initialHoldMs: 1400,
  finalHoldMs: 300,
  readiness: { selector: '[data-capture="hiring-demand"]', absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 350, timeout: 15000 },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: { enabled: true, includeSelector: 'body', ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'], allowHorizontalScrollSelectors: ['[role="region"]'], minTargetSize: 20, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false, failOnHttpStatus: false },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'wait', selector: 'text=No pudimos cargar las demandas.', timeout: 8000 },
    { kind: 'mark', label: 'demand-error-retry', note: 'Error accionable con retry; inyección solo de harness local.' },
  ],
}
