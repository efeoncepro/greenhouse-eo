import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'globe-producer-credit-capacity-self-view',
  route: '/producer',
  // GVC classifies any click/key sequence as mutating even though this journey is economically read-only.
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="producer-budget-trigger"]',
    selectors: ['[data-capture="producer-console"]', '[data-capture="producer-budget-trigger"]'],
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 20000
  },
  baseline: {
    surfaceId: 'globe.producer.credit-capacity-self-view',
    requiredFrameLabels: [
      'credits-self-trigger',
      'credits-self-panel-credits-self-panel-feedback',
      'credits-self-panel-credits-self-panel-settled',
      'credits-self-closed'
    ],
    requiredRegions: [
      '[data-capture="producer-budget-trigger"]'
    ],
    maxDiffRatio: 0.045
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'La evidencia usa el fixture contractual o una sesión Producer humana autorizada.' },
    { kind: 'noErrorBoundary', reason: 'El self-view no puede aprobarse sobre un error de aplicación.' },
    { kind: 'visible', selector: '[data-capture="producer-budget-trigger"]', reason: 'El saldo efectivo permanece visible también en móvil.' }
  ],
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="producer-budget"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="producer-budget"]',
      minTargetSize: 24,
      failOnViolations: true
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [{
        name: 'credits-self-trigger',
        startSelector: '[data-capture="producer-budget-trigger"]',
        keys: ['Enter', 'Escape'],
        requireVisibleFocusRing: true
      }]
    },
    performance: {
      enabled: true,
      severity: 'error',
      maxDomNodes: 4200,
      maxRequests: 120,
      maxTransferBytes: 35_000_000,
      maxFcpMs: 9000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="producer-console"]',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'fake', 'todo'],
      expectedDataCaptureRegions: [
        'producer-budget',
        'producer-budget-trigger',
        'producer-budget-panel',
        'producer-budget-effective',
        'producer-budget-period',
        'producer-budget-period-cap',
        'producer-budget-funding',
        'producer-budget-fence',
        'producer-budget-ledger',
        'producer-budget-action'
      ],
      maxUniformCards: 4,
      maxNestedSurfaceDepth: 2,
      maxContainedSurfacesInViewport: 5,
      minHeadingScaleRatio: 1.25
    }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="producer-budget-trigger"]', timeout: 20000 },
    { kind: 'mark', label: 'credits-self-trigger', selector: '[data-capture="producer-budget-trigger"]', note: 'El valor efectivo y su estado se leen sin abrir el detalle.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'credits-self-panel',
        action: { kind: 'click', selector: '[data-capture="producer-budget-trigger"]' },
        intent: 'La persona consulta período, tope, fondeo, fence diario y ledger sin capacidad de mutación.',
        frames: [
          { label: 'credits-self-panel-feedback', atMs: 0, clipSelector: '[data-capture="producer-budget-panel"]' },
          { label: 'credits-self-panel-settled', atMs: 240, clipSelector: '[data-capture="producer-budget-panel"]' }
        ],
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="producer-budget-trigger"]', key: 'Enter' },
          expected: 'El trigger anuncia aria-expanded, el panel expone su lectura y Escape devuelve el foco.'
        },
        reducedMotion: 'capture'
      }
    },
    { kind: 'press', key: 'Escape', note: 'Cierra el panel y devuelve foco al trigger.' },
    { kind: 'mark', label: 'credits-self-closed', selector: '[data-capture="producer-budget-trigger"]', note: 'El control queda listo para continuar en Producer.' }
  ]
}
