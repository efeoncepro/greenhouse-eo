import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-demand-filtered',
  route: '/agency/hiring?captureQuery=zzzz-no-match',
  viewport: { width: 1440, height: 900 },
  viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }],
  initialHoldMs: 1000,
  finalHoldMs: 250,
  readiness: { selector: '[data-capture="hiring-demand"]', absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 300, timeout: 15000 },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: { enabled: true, includeSelector: 'body', ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'], allowHorizontalScrollSelectors: ['[role="region"]'], minTargetSize: 20, failOnViolations: true },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
  },
  steps: [
    { kind: 'wait', selector: 'text=Sin resultados', timeout: 10000 },
    { kind: 'mark', label: 'demand-filtered-empty', note: 'Empty state filtrado, distinto del zero-state.' },
  ],
}
