// Internal Nexa Insights Lab — NexaInsightsBlock pattern (TASK-1075 follow-up).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-insights',
  route: '/design-system/nexa-insights',
  viewport: { width: 1280, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1280, height: 1000 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    selectors: ['[data-capture="nexa-insights-lab"]'],
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'live-specimen',
      clipSelector: '[data-capture="nexa-insights-live-specimen"]',
      note: 'Superficie real: disclosure nexaMark + rotating headline + thinking beat + segmented + insight rows'
    },
    {
      kind: 'mark',
      label: 'composition',
      clipSelector: '[data-capture="nexa-insights-composition"]',
      note: 'Composición: de qué primitives está hecho el pattern'
    },
    {
      kind: 'mark',
      label: 'states',
      clipSelector: '[data-capture="nexa-insights-states"]',
      note: 'Matriz de estados: empty-pending / empty-positive / stale-degraded / loading'
    }
  ]
}
