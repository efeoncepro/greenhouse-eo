import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-demand-drawer',
  route: '/agency/hiring?captureDrawer=account-manager',
  viewport: { width: 1440, height: 900 },
  viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }],
  mutating: true,
  safeForCapture: true,
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: { selector: '[data-capture="hiring-demand-drawer"]', absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 300, timeout: 15000 },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: { enabled: true, includeSelector: 'body', ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'], allowHorizontalScrollSelectors: ['[role="region"]'], minTargetSize: 20, failOnViolations: true },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
  },
  steps: [
    { kind: 'mark', label: 'demand-drawer-template', clipSelector: '[data-capture="hiring-demand-drawer"]', note: 'Drawer completo con template, chips, preview y split action.' },
    { kind: 'click', selector: '[data-capture="hiring-demand-drawer"] button[aria-label="Cerrar"]' },
    { kind: 'wait', selector: '[data-capture="hiring-demand-discard-dialog"]' },
    { kind: 'mark', label: 'demand-dirty-confirm', clipSelector: '[data-capture="hiring-demand-discard-dialog"]', note: 'Confirmación por cambios sin guardar.' },
  ],
}
