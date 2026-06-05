// TASK-1013 — Runtime capture for the onboarding cases cockpit (real data).
// Mirrors onboarding-cases-inbox-mockup but targets the live route
// /agency/clients/onboarding (flag-gated CLIENT_LIFECYCLE_ONBOARDING_ENABLED).
// Wizard stays /agency/clients/new; this cockpit only makes cases discoverable.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'onboarding-cases-inbox',
  route: '/agency/clients/onboarding',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="onboarding-cases"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el cockpit vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: 'text=Este cockpit no reemplaza el wizard', reason: 'el aviso de no-reemplazo del wizard siempre está presente' },
    { kind: 'visible', selector: 'text=Onboarding de clientes', reason: 'título del cockpit' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Cockpit runtime: header, aviso wizard, KPIs, inbox + preview + rail (datos reales)' },
    { kind: 'scroll', selector: '[data-capture="onboarding-cases"]', scrollBlock: 'end' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'lower-content', note: 'Contenido inferior y responsive stacking cuando aplica' }
  ]
}
