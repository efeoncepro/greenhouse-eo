import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-publication-desk',
  route: '/agency/hiring/publication',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 350,
  readiness: { selector: '[data-capture="hiring-publication-diff"]', absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 400, timeout: 15000 },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: { enabled: true, includeSelector: 'body', ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'], minTargetSize: 20, failOnViolations: true },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="hiring-publication"]' },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'publication-diff', note: 'Diff explícito entre allowlist pública y campos internos.' },
    { kind: 'click', selector: 'button:has-text("Editar contenido")' },
    { kind: 'mark', label: 'publication-editor', clipSelector: '[data-capture="hiring-publication-diff"]', note: 'Edición del payload público sin tocar datos internos.' },
    { kind: 'click', selector: 'button:has-text("Cancelar")' },
    { kind: 'click', selector: 'button:has-text("Pausar")' },
    { kind: 'wait', selector: '[data-capture="hiring-publication-confirm-dialog"]' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'publication-confirm', clipSelector: '[data-capture="hiring-publication-confirm-dialog"]', note: 'Confirmación consecuente antes de pausar.' },
  ],
}
