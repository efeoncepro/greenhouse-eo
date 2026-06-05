// TASK-1013 — Product Design prototype for the onboarding cases cockpit.
// Mockup only: no writes, no API calls, wizard remains /agency/clients/new.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'onboarding-cases-inbox-mockup',
  route: '/agency/clients/onboarding/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="onboarding-cases-mockup"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: 'text=Este cockpit no reemplaza el wizard', reason: 'el mockup debe dejar claro que complementa el wizard existente' },
    { kind: 'visible', selector: 'text=Abrir timeline', reason: 'la acción principal debe ser abrir el timeline del caso' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Cockpit: CTA Nuevo cliente, warning no reemplaza wizard, KPIs, inbox + preview + action rail' },
    { kind: 'scroll', selector: '[data-capture="onboarding-cases-mockup"]', scrollBlock: 'end' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'lower-content', note: 'Contenido inferior y responsive stacking cuando aplica' }
  ]
}
