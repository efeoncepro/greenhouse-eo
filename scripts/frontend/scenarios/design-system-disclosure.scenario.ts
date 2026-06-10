// Internal Disclosure Lab — GreenhouseDisclosureTrigger + GreenhouseAnchoredDisclosure (TASK-1072).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-disclosure',
  route: '/design-system/disclosure',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1300,
  finalHoldMs: 400,
  readiness: {
    selectors: ['[data-capture="disclosure-lab"]'],
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
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
      label: 'disclosure-trigger',
      clipSelector: '[data-capture="disclosure-trigger-specimens"]',
      note: 'DisclosureTrigger: variants addToggle/expand/reveal en cerrado + abierto (rotación) + interactivo'
    },
    {
      kind: 'mark',
      label: 'anchored-disclosure',
      clipSelector: '[data-capture="anchored-disclosure-specimen"]',
      note: 'AnchoredDisclosure: contextualEditor abierto con companion + actionMenu'
    }
  ]
}
