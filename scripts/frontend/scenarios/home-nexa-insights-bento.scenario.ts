import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'home-nexa-insights-bento',
  route: '/home',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="home-nexa-insights-bento"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 14000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Home vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar error boundary' },
    { kind: 'visible', selector: 'text=Nexa Insights', reason: 'la sección de insights debe renderizar' }
  ],
  steps: [
    {
      kind: 'scroll',
      selector: '[data-capture="home-nexa-insights-bento"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'nexa-insights-bento',
      clipSelector: '[data-capture="home-nexa-insights-bento"]',
      note: 'Bento de Nexa Insights: header, badges de severidad, menciones y CTA de causa raíz con primitives Greenhouse'
    }
  ]
}
