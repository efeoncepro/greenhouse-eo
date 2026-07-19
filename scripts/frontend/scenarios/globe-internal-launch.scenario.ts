import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'globe-internal-launch',
  route: '/',
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 600,
  finalHoldMs: 200,
  readiness: {
    selector: '[data-capture="globe-launch"]',
    selectors: ['[data-capture="globe-brand-stage"]', '[data-capture="globe-primary-action"]'],
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]'],
    waitForFonts: true,
    postReadyDelayMs: 250,
    timeout: 12000,
    note: 'La portada anónima de Globe debe estar estable antes de producir evidencia.'
  },
  assertions: [
    { kind: 'noErrorBoundary', reason: 'La entrada interna no puede capturarse sobre un error.' },
    { kind: 'visible', selector: '[data-surface-recipe="orbital-threshold"]', reason: 'La dirección visual aprobada debe renderizar.' },
    { kind: 'visible', selector: '[data-capture="globe-primary-action"]', reason: 'Debe existir una sola entrada gobernada por Greenhouse.' }
  ],
  quality: {
    accessibility: { enabled: true, includeSelector: 'main', failOnViolations: true },
    layout: { enabled: true, includeSelector: 'main', failOnViolations: true },
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
      probes: [
        {
          name: 'entry-focus',
          startSelector: '.skip-link',
          keys: ['Tab'],
          expectedFocusSelector: '[data-capture="globe-primary-action"]',
          requireVisibleFocusRing: true
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'error',
      maxDomNodes: 500,
      maxRequests: 12,
      maxTransferBytes: 2_000_000,
      maxFcpMs: 3500
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: 'main',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'placeholder', 'fake', 'todo'],
      expectedDataCaptureRegions: ['globe-launch', 'globe-brand-stage', 'globe-primary-action'],
      requireSurfaceRecipeMarker: true,
      maxUniformCards: 2,
      maxNestedSurfaceDepth: 1,
      maxContainedSurfacesInViewport: 2,
      minHeadingScaleRatio: 1.35
    }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="globe-launch"]', timeout: 12000 },
    {
      kind: 'mark',
      label: 'anonymous-first-fold',
      note: 'Entrada internal-only con marca canónica, una acción primaria y estado operativo visible.'
    }
  ]
}
