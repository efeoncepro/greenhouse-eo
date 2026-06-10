// Internal Nexa Brand Mark Lab verification — identity primitive and kinds.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-brand',
  route: '/design-system/nexa-brand',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
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
      label: 'nexa-brand-lab',
      fullPage: true,
      note: 'Hoja interna dedicada para GreenhouseNexaBrandMark y sus kinds'
    },
    {
      kind: 'mark',
      label: 'nexa-brand-primary-specimen',
      clipSelector: '[data-capture="nexa-brand-primary-specimen"]',
      note: 'Specimen principal del badge conversacional Preguntale a Nexa'
    },
    {
      kind: 'mark',
      label: 'nexa-brand-kind-matrix',
      clipSelector: '[data-capture="nexa-brand-kind-matrix"]',
      note: 'Matriz de kinds askNexaBadge, badgeIcon, inlineMark y monoMark'
    }
  ]
}
