import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'search-console-connect',
  route: '/agency/clients/org-berel/lifecycle',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 2500,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="search-console-connect-panel"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'account-360 autenticado con agent auth' },
    { kind: 'noErrorBoundary', reason: 'el panel debe degradar honesto, no romper la ruta' },
    { kind: 'visible', selector: '[data-capture="search-console-connect-panel"]' }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true },
    runtime: { failOnConsoleError: true, failOnHydrationWarning: true }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="search-console-connect-panel"]', timeout: 15000 },
    { kind: 'press', key: 'Escape', note: 'Normaliza el drawer móvil si una sesión previa lo dejó abierto' },
    { kind: 'sleep', ms: 250 },
    { kind: 'wait', selector: '[data-capture="search-console-connect-panel"]', timeout: 15000 },
    {
      kind: 'mark',
      label: 'search-console-account-360-fullpage',
      fullPage: true,
      note: 'Account-360 lifecycle con panel Search Console montado a nivel organización'
    },
    {
      kind: 'mark',
      label: 'search-console-connect-panel',
      clipSelector: '[data-capture="search-console-connect-panel"]',
      note: 'Panel de conexión Search Console: flag/capability/estado local del runtime'
    }
  ]
}
