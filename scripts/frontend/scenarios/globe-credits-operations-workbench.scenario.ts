import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'globe-credits-operations-workbench',
  route: '/admin/globe/credits/mockup',
  mutating: false,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 900,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="globe-credits-operations-workbench"]',
    selectors: [
      '[data-capture="globe-credits-header"]',
      '[data-capture="globe-credit-operation-op-aug-capacity-003"]',
      '[data-capture="globe-credits-operation-detail"]'
    ],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  baseline: {
    surfaceId: 'greenhouse.admin.globe-credits-operations-workbench',
    requiredFrameLabels: ['credits-first-fold', 'credits-operation-selection-settled', 'credits-full-page'],
    requiredRegions: [
      '[data-capture="globe-credits-header"]',
      '[data-capture="globe-credits-operation-detail"]'
    ],
    maxDiffRatio: 0.045
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'La evidencia requiere la sesión humana autenticada indicada por el operador.' },
    { kind: 'noErrorBoundary', reason: 'El first fold no puede aprobarse sobre un error de aplicación.' },
    { kind: 'visible', selector: '[data-surface-recipe="operationalWorkbench"]', reason: 'La receta operativa debe renderizar.' }
  ],
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="globe-credits-operations-workbench"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: 'main',
      failOnViolations: true
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'operation-selection',
          startSelector: '[data-capture="globe-credit-operation-op-aug-capacity-003"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'error',
      maxDomNodes: 3600,
      maxRequests: 110,
      maxTransferBytes: 28_000_000,
      maxFcpMs: 9000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: 'main',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'placeholder', 'fake', 'todo'],
      requireSurfaceRecipeMarker: true,
      expectedDataCaptureRegions: ['globe-credits-operations-workbench', 'globe-credits-header', 'globe-credits-operation-detail'],
      maxUniformCards: 4,
      maxNestedSurfaceDepth: 2,
      maxContainedSurfacesInViewport: 4,
      minHeadingScaleRatio: 1.25
    }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="globe-credits-operations-workbench"]', timeout: 15000 },
    { kind: 'press', key: 'Escape', note: 'Normaliza el menú lateral persistido antes de evaluar el viewport compacto.' },
    { kind: 'mark', label: 'credits-first-fold', note: 'Header operativo, runway, riesgo, inventario y detalle comparten una jerarquía clara.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'credits-funding-dialog',
        action: { kind: 'click', selector: '[data-capture="globe-credit-funding-open"]' },
        intent: 'La acción abre una autorización exacta con límites explícitos, sin ejecutar durante la captura.',
        frames: [{ label: 'credits-funding-dialog-open', atMs: 220, fullPage: true }],
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="globe-credit-funding-open"]', key: 'Enter' },
          expected: 'El diálogo recibe foco y expone período, objetivo, máximo a otorgar y tope resultante.'
        },
        reducedMotion: 'capture'
      }
    },
    { kind: 'press', key: 'Escape', note: 'Cierra el diálogo sin enviar ningún command durante la evidencia visual.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'credits-operation-selection',
        action: { kind: 'click', selector: '[data-capture="globe-credit-operation-op-jul-readback-002"]' },
        intent: 'La selección cambia el plan y el recibo visibles sin alterar datos económicos.',
        frames: [
          { label: 'credits-operation-selection-feedback', atMs: 0, fullPage: true },
          { label: 'credits-operation-selection-settled', atMs: 320, fullPage: true }
        ],
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="globe-credit-operation-op-jul-readback-002"]', key: 'Enter' },
          expected: 'La segunda operación queda seleccionada y su recibo no_effect se presenta en el detalle.'
        },
        reducedMotion: 'capture'
      }
    },
    { kind: 'mark', label: 'credits-full-page', fullPage: true, note: 'Workbench completo sin overflow horizontal accidental.' }
  ]
}
