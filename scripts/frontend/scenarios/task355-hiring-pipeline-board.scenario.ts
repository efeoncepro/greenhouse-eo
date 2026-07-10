import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-pipeline-board',
  route: '/agency/hiring/pipeline?captureFailure=stage',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 350,
  readiness: { selector: '[data-capture="hiring-pipeline-board"]', absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 400, timeout: 15000 },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: { enabled: true, includeSelector: 'body', ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'], allowHorizontalScrollSelectors: ['[data-capture="hiring-pipeline-board"]'], minTargetSize: 20, failOnViolations: true },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="hiring-pipeline"]' },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'pipeline-default', note: 'Kanban real con scroll interno y columnas canónicas.' },
    { kind: 'click', selector: '[data-capture="hiring-card-stage-menu"]' },
    { kind: 'wait', selector: '[role="menu"]' },
    { kind: 'mark', label: 'pipeline-keyboard-menu', clipSelector: '[role="menu"]', note: 'Alternativa de etapa operable por teclado.' },
    { kind: 'click', selector: '[role="menu"] li:has-text("Screening")' },
    { kind: 'wait', selector: 'text=No se pudo mover, se revirtió.', timeout: 8000 },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'pipeline-rollback', note: 'Rollback visible tras fallo de red inyectado solo por harness GVC.' },
  ],
}
