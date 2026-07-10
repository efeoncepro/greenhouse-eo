import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-tabs-transition',
  route: '/agency/hiring',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="hiring-tabs"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 250,
    timeout: 15000,
  },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: {
      enabled: true,
      includeSelector: 'body',
      ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'],
      allowHorizontalScrollSelectors: ['[data-capture="hiring-pipeline-board"]'],
      minTargetSize: 20,
      failOnViolations: true,
    },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: { enabled: true, includeSelector: 'body' },
  },
  steps: [
    { kind: 'mark', label: 'tabs-demand', note: 'Pestaña Demanda activa dentro del chrome Greenhouse.' },
    { kind: 'click', selector: '[role="tab"][data-tab="pipeline"]' },
    { kind: 'wait', selector: '[data-capture="hiring-pipeline-board"]', timeout: 12000 },
    { kind: 'sleep', ms: 260 },
    { kind: 'mark', label: 'tabs-pipeline', note: 'Transición Demand → Pipeline con tab activa y panel montado.' },
    { kind: 'click', selector: '[role="tab"][data-tab="publication"]' },
    { kind: 'wait', selector: '[data-capture="hiring-publication-diff"]', timeout: 12000 },
    { kind: 'sleep', ms: 260 },
    { kind: 'mark', label: 'tabs-publication', note: 'Transición Pipeline → Publicación con panel montado.' },
  ],
}
