import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'globe-credits-operations-workbench-mobile',
  route: '/admin/globe/credits/mockup',
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', width: 390, height: 844 }],
  initialHoldMs: 900,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="globe-credits-operations-workbench"]',
    selectors: [
      '[data-capture="globe-credits-header"]',
      '[data-capture="globe-credit-operation-op-jul-readback-002"]',
      '[data-capture="composition-shell-primary-drawer-trigger"]'
    ],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 20000
  },
  baseline: {
    surfaceId: 'greenhouse.admin.globe-credits-operations-workbench.mobile-detail',
    requiredFrameLabels: ['credits-mobile-detail-open', 'credits-mobile-ledger'],
    requiredRegions: [
      '[data-capture="globe-credits-resources"]',
      '[data-capture="globe-credits-ledger"]',
      '[data-capture="globe-credits-operation-detail"]'
    ],
    maxDiffRatio: 0.045
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'La evidencia requiere la sesión humana autenticada indicada por el operador.' },
    { kind: 'noErrorBoundary', reason: 'El drawer móvil no puede aprobarse sobre un error de aplicación.' },
    { kind: 'visible', selector: '[data-capture="composition-shell-primary-drawer-trigger"]', reason: 'El detalle debe tener un acceso explícito en 390 px.' }
  ],
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="composition-shell-primary-drawer"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="composition-shell-primary-drawer"]',
      minTargetSize: 24,
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
      probes: [{
        name: 'ledger-filter',
        startSelector: '[data-capture="globe-credits-ledger"] button',
        keys: ['Tab'],
        requireVisibleFocusRing: true
      }]
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
      includeSelector: '[data-capture="composition-shell-primary-drawer"]',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'placeholder', 'fake', 'todo'],
      requireSurfaceRecipeMarker: false,
      expectedDataCaptureRegions: [
        'globe-credits-historical-ledger',
        'globe-credits-forecast',
        'globe-credits-resources',
        'globe-credits-ledger',
        'globe-credits-operation-detail'
      ],
      maxUniformCards: 4,
      // Drawer transport + operational section + one semantic datum is the intentional compact hierarchy.
      maxNestedSurfaceDepth: 3,
      maxContainedSurfacesInViewport: 4,
      minHeadingScaleRatio: 1.25
    }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="composition-shell-primary-drawer-trigger"]', timeout: 20000 },
    { kind: 'click', selector: '[data-capture="globe-credit-operation-op-jul-readback-002"]' },
    { kind: 'click', selector: '[data-capture="composition-shell-primary-drawer-trigger"]' },
    { kind: 'wait', selector: '[data-capture="globe-credits-operation-detail"]', timeout: 5000 },
    { kind: 'mark', label: 'credits-mobile-detail-open', clipSelector: '[data-capture="composition-shell-primary-drawer"]', note: 'El drawer presenta la proyección operativa sin ocultar el contexto seleccionado.' },
    { kind: 'scroll', selector: '[data-capture="globe-credits-ledger"]', scrollBlock: 'center' },
    { kind: 'mark', label: 'credits-mobile-ledger', clipSelector: '[data-capture="composition-shell-primary-drawer"]', note: 'Inventario, ledger y detalle siguen accesibles dentro del mismo drawer.' }
  ]
}
