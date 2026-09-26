import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'ga4-connection-panel',
  route: '/agency/clients/org-32333527-02a8-487b-819e-6f76a761777d/lifecycle',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  readiness: {
    selector: '[data-capture="ga4-connect-panel"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Account 360 requiere sesión interna' },
    { kind: 'noErrorBoundary', reason: 'El panel debe montar sin error de aplicación' }
  ],
  steps: [
    { kind: 'scroll', selector: '[data-capture="ga4-connect-panel"]', scrollBlock: 'center' },
    { kind: 'mark', label: 'ga4-connect', note: 'GA4 junto a Search Console en Grupo Berel' }
  ]
}
