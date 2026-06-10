import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-efeonce-brand',
  route: '/design-system/efeonce-brand',
  viewport: { width: 1440, height: 1100 },
  initialHoldMs: 1800,
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
  viewports: [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  steps: [
    {
      kind: 'wait',
      selector: '[data-capture="efeonce-orbital-signature"]',
      timeout: 12000
    },
    {
      kind: 'mark',
      label: 'orbital-hero',
      clipSelector: '[data-capture="efeonce-brand-orbital-hero"]',
      note: 'Firma orbital principal con entrada GSAP.'
    },
    {
      kind: 'mark',
      label: 'orbital-variants',
      clipSelector: '[data-capture="efeonce-brand-orbital-variants"]',
      note: 'Variantes signature-once y ambient para revisar fluidez.'
    },
    {
      kind: 'mark',
      label: 'orbital-notes',
      clipSelector: '[data-capture="efeonce-brand-orbital-notes"]',
      note: 'Contrato de selectores y reduced-motion.'
    }
  ]
}
