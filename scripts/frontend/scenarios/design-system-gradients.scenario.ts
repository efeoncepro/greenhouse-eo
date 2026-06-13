// Internal Gradient Background Lab verification — tokenized gradient presets and adjuster.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-gradients',
  route: '/design-system/gradients',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="gradient-background-lab"]',
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
      label: 'gradient-background-lab-fullpage',
      fullPage: true,
      note: 'Laboratorio interno de fondos degradados tokenizados'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="gradient-background-hero"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'gradient-background-hero',
      clipSelector: '[data-capture="gradient-background-hero"]',
      note: 'Hero specimen con GreenhouseGradientBackground kind efeonceBrand'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="gradient-background-adjuster"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'gradient-background-adjuster',
      clipSelector: '[data-capture="gradient-background-adjuster"]',
      note: 'Workbench de ajuste de kind, intensidad y animación'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="gradient-background-preset-grid"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'gradient-background-preset-grid',
      clipSelector: '[data-capture="gradient-background-preset-grid"]',
      note: 'Grid de kinds oficiales sin blobs radiales'
    }
  ]
}
