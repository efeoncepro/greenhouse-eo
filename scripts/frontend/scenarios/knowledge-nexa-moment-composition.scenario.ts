// GAP A — demo de NexaMomentComposition DENTRO del mockup de Nexa Answers (un solo espacio, decisión del
// operador). Captura la sección de composición con host: el Momento Nexa + las fuentes ancladas al doc real
// + el next-step gobernado + el puente, y el host (documentos) que persiste condensado abajo.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'knowledge-nexa-moment-composition',
  route: '/knowledge/mockup/nexa-answers',
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
    selector: '[data-capture="nexa-moment-composition-section"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Mockup interno autenticado vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="nexa-moment-composition-section"]' },
    runtime: { failOnConsoleError: false, failOnPageError: false, failOnHydrationWarning: false, ignoreUrlPatterns: ['/_next/', 'hot-update'] },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="nexa-moment-composition-section"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="nexa-moment-composition-section"]', timeout: 12000 },
    { kind: 'scroll', selector: '[data-capture="nexa-moment-composition-section"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'moment-composition-composed',
      clipSelector: '[data-capture="nexa-moment-composition-section"]',
      note: 'Composición: Momento Nexa arriba (respuesta + fuentes ancladas + next-step gobernado + puente) y el host condensado vivo abajo, con el doc anclado resaltado.'
    }
  ]
}
