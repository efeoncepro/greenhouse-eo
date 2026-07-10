import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-application-360',
  route: '/agency/hiring/pipeline?captureApplication=first',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 350,
  readiness: { selector: '[data-capture="hiring-application"]', absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 400, timeout: 15000 },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: { enabled: true, includeSelector: 'body', ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full', '.MuiLinearProgress-bar'], allowHorizontalScrollSelectors: ['[role="region"]', '[data-capture="hiring-application-tabs"]'], minTargetSize: 20, failOnViolations: true },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="hiring-application"]' },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 1000 },
    { kind: 'mark', label: 'application-overview', note: 'Header candidato, PII masked y affinity advisory.' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Evaluación")' },
    { kind: 'mark', label: 'application-assessment', clipSelector: '[data-capture="hiring-application-panel-assessment"]', note: 'Assessment real o estado degradado honesto.' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Documentos")' },
    { kind: 'mark', label: 'application-documents', clipSelector: '[data-capture="hiring-application-panel-documents"]', note: 'Documentos con PII masked y dependencia 1362 explícita.' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Decisión")' },
    { kind: 'mark', label: 'application-decision', clipSelector: '[data-capture="hiring-application-panel-decision"]', note: 'Decisión estructurada, humana y defendible.' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Actividad")' },
    { kind: 'mark', label: 'application-activity', clipSelector: '[data-capture="hiring-application-panel-activity"]', note: 'Timeline append-only.' },
  ],
}
