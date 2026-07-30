import type { CaptureScenario } from '../lib/scenario'

/** TASK-1600: same color surface after switching the actual portal theme to dark. */
export const scenario: CaptureScenario = {
  name: 'task-1600-axis-colors-dark',
  route: '/design-system/colors',
  safeForCapture: true,
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="colors-brand-ramp"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'El laboratorio requiere actor GVC autenticado.' },
    { kind: 'noErrorBoundary', reason: 'La captura no puede ser un error boundary.' }
  ],
  steps: [
    { kind: 'click', selector: '[aria-label="Cambiar tema"]', note: 'Abrir selector de modo del portal.' },
    { kind: 'click', selector: 'text=Oscuro', note: 'Resolver el modo dark mediante el control real del portal.' },
    { kind: 'sleep', ms: 500 },
    {
      kind: 'mark',
      label: 'dark-colors-full-page',
      fullPage: true,
      note: 'Paleta AXIS y neutrales con el theme global real en modo oscuro.'
    }
  ]
}
