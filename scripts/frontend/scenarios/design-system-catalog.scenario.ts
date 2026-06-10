import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-catalog',
  route: '/design-system',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'wide', width: 1920, height: 1080 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'catalogo interno vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'catalog-workbench',
      fullPage: true,
      note: 'Home canonica del Design System: catalogo interno de tokens, primitives, patrones y labs'
    },
    {
      kind: 'hover',
      selector: '[data-capture="axis-interactive-wordmark"]'
    },
    {
      kind: 'sleep',
      ms: 170
    },
    {
      kind: 'mark',
      label: 'axis-dot-hover',
      fullPage: false,
      note: 'Hover sobre el logo AXIS: el circulo naranja de la i salta sutilmente via Motion/GSAP'
    }
  ]
}
