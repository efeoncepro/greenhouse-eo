import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-demand-desk',
  route: '/agency/hiring',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="hiring-demand"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000,
  },
  assertions: [
    { kind: 'noLoginRedirect' },
    { kind: 'noErrorBoundary' },
  ],
  quality: {
    layout: {
      enabled: true,
      includeSelector: 'body',
      ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'],
      allowHorizontalScrollSelectors: ['[role="region"]'],
      minTargetSize: 20,
      failOnViolations: true,
    },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="hiring-demand"]' },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'demand-default', note: 'KPI, filtros server-side y tabla de openings.' },
  ],
}
