// Lab interno de NexaMomentComposition (GAP A — Nexa Moment Fabric). Captura el specimen canónico del
// Design System: el Momento Nexa compone con el host (respuesta protagonista + fuentes ancladas al doc real
// + next-step gobernado + puente) y el host de documentos persiste condensado vivo abajo. Specimen de
// registry de la capacidad TRANSVERSAL (no de Knowledge).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-moment-composition',
  route: '/design-system/nexa-moment-composition',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1000,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-moment-composition-lab"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Lab interno autenticado vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="nexa-moment-composition-lab"]' },
    runtime: { failOnConsoleError: false, failOnPageError: false, failOnHydrationWarning: false, ignoreUrlPatterns: ['/_next/', 'hot-update'] },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="nexa-moment-composition-lab"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="nexa-moment-composition-lab"]', timeout: 12000 },
    { kind: 'scroll', selector: '[data-capture="nexa-moment-composition-lab"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'moment-composition-lab-composed',
      clipSelector: '[data-capture="nexa-moment-composition-lab"]',
      note: 'Lab composed (variant leadOverlay): Momento Nexa arriba (respuesta + fuentes ancladas + next-step gobernado + puente) y el host condensado vivo abajo, con el doc anclado resaltado.'
    }
  ]
}
