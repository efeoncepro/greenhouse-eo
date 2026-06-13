// Internal Border Beam Lab verification — tokenized perimeter beam primitive.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-border-beam',
  route: '/design-system/border-beam',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="border-beam-lab"]',
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
      label: 'border-beam-lab-fullpage',
      fullPage: true,
      note: 'Laboratorio interno de Border Beam tokenizado'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="border-beam-hero"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'border-beam-hero',
      clipSelector: '[data-capture="border-beam-hero"]',
      note: 'Hero specimen con GreenhouseBorderBeam kind nexaSurface'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="border-beam-adjuster"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'border-beam-adjuster',
      clipSelector: '[data-capture="border-beam-adjuster"]',
      note: 'Workbench de ajuste de kind, variant e intensidad'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="border-beam-specimen-grid"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'border-beam-button-specimen',
      clipSelector: '[data-capture="border-beam-button-card"]',
      note: 'CTA real con GreenhouseButton envuelto por GreenhouseBorderBeam'
    },
    {
      kind: 'mark',
      label: 'border-beam-nexa-spectrum-box',
      clipSelector: '[data-capture="border-beam-nexa-spectrum-box"]',
      note: 'Caja tipo Nexa glow usando la primitive GreenhouseSpectrumBeam'
    },
    {
      kind: 'mark',
      label: 'border-beam-nexa-brand-spectrum-box',
      clipSelector: '[data-capture="border-beam-nexa-brand-spectrum-box"]',
      note: 'Caja tipo Nexa glow con GreenhouseSpectrumBeam usando colores de marca Nexa'
    },
    {
      kind: 'mark',
      label: 'border-beam-specimen-grid',
      clipSelector: '[data-capture="border-beam-specimen-grid"]',
      note: 'Grid de specimens oficiales para prompt, evidencia y progreso'
    }
  ]
}
