import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-colors',
  route: '/design-system/colors',
  safeForCapture: true,
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="colors-brand-ramp"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  baseline: {
    surfaceId: 'design-system.colors',
    requiredFrameLabels: ['brand-ramps', 'colors-full-page'],
    requiredRegions: ['[data-capture="colors-brand-ramp"]'],
    maxDiffRatio: 0.02
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'El laboratorio interno requiere actor GVC autenticado.' },
    { kind: 'noErrorBoundary', reason: 'La referencia canónica de color no puede renderizar un error boundary.' },
    {
      kind: 'visible',
      selector: '[data-capture="colors-brand-ramp"]',
      reason: 'La familia Tidal Teal debe estar visible en la referencia canónica.'
    }
  ],
  quality: {
    accessibility: { enabled: true, includeSelector: '[data-capture="colors-lab"]', failOnViolations: true },
    layout: { enabled: true, includeSelector: 'main', failOnViolations: true },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    }
  },
  steps: [
    {
      kind: 'scroll',
      selector: '[data-capture="colors-brand-ramp"]',
      scrollBlock: 'start',
      scrollY: -120
    },
    {
      kind: 'mark',
      label: 'brand-ramps',
      clipSelector: '[data-capture="colors-brand-ramp"]',
      note: 'Primary y Tidal Teal juntos; revisar continuidad 100→900 y separación de success.'
    },
    {
      kind: 'mark',
      label: 'colors-full-page',
      fullPage: true,
      note: 'Inventario canónico completo con ramp, aliases, feedback, neutrales y nombres de tokens.'
    }
  ]
}
