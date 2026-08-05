import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'globe-credits-operations-workbench',
  route: '/admin/globe/credits/mockup',
  // GVC classifies dialog/selection interactions as mutating; this fixture never dispatches an economic command.
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 }
  ],
  initialHoldMs: 900,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="globe-credits-operations-workbench"]',
    selectors: [
      '[data-capture="globe-credits-header"]',
      '[data-capture="globe-credit-operation-op-aug-capacity-003"]'
    ],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  baseline: {
    surfaceId: 'greenhouse.admin.globe-credits-operations-workbench',
    requiredFrameLabels: ['credits-first-fold', 'credits-operation-selection-credits-operation-selection-settled', 'credits-full-page'],
    requiredRegions: [
      '[data-capture="globe-credits-header"]',
      '[data-capture="globe-credits-resources"]',
      '[data-capture="globe-credits-ledger"]',
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
          name: 'funding-dialog-trigger',
          startSelector: '[data-capture="globe-credit-funding-open"]',
          keys: ['Enter', 'Escape'],
          requireVisibleFocusRing: true
        },
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
      expectedDataCaptureRegions: [
        'globe-credits-operations-workbench',
        'globe-credits-header',
        'globe-credits-historical-ledger',
        'globe-credits-forecast',
        'globe-credits-resources',
        'globe-credits-ledger',
        'globe-credits-operation-detail'
      ],
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
    { kind: 'click', selector: '[data-capture="globe-credit-funding-open"]', note: 'Abre la revisión sin ejecutar ningún command.' },
    { kind: 'wait', selector: '[data-capture="globe-credit-funding-dialog"]', timeout: 5000 },
    { kind: 'mark', label: 'credits-funding-dialog-open', fullPage: true, note: 'La autorización expone período, objetivo y límites antes de ejecutar.' },
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
