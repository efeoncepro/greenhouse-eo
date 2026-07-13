import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'hiring-activation-lane',
  route: '/hr/onboarding?lane=hiring-activation',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1600,
  finalHoldMs: 400,
  readiness: {
    selectors: ['[data-capture="activation-hero"]', '[data-capture="activation-lane"]', '[data-capture="composition-shell"]'],
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 700,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Hiring Activation Lane vive bajo (dashboard) autenticado.' },
    { kind: 'noErrorBoundary', reason: 'La lane no debe renderizar un error boundary.' },
    { kind: 'visible', selector: '[data-capture="activation-hero"]', reason: 'Header/lane chrome propio de TASK-1368.' },
    { kind: 'visible', selector: '[data-capture="activation-lane"]', reason: 'Cola o estado flag-off/empty visible.' }
  ],
  quality: {
    allowLogin: false,
    allowErrorBoundary: false,
    layout: {
      enabled: true,
      includeSelector: 'body',
      ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full'],
      allowHorizontalScrollSelectors: ['[role="region"]'],
      minTargetSize: 20,
      failOnViolations: true
    },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="composition-shell"]',
      expectedDataCaptureRegions: ['activation-hero', 'activation-lane']
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'first-fold',
      note: 'Header propio, tabs, KPIs y composition shell de cola/detalle sin heredar el chrome viejo de Onboarding.'
    },
    {
      kind: 'mark',
      label: 'queue',
      note: 'Cola de handoffs o estado flag-off/empty/error honesto visible en el fold estable.'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="composition-shell"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'composition-shell',
      clipSelector: '[data-capture="composition-shell"]',
      note: 'Master-detail responsive: navigator a la izquierda y detalle/empty-state a la derecha.'
    },
    {
      kind: 'mark',
      label: 'read-only-state',
      note: 'Estado estable sin mutaciones: las acciones críticas permanecen detrás de diálogos explícitos.'
    }
  ]
}
