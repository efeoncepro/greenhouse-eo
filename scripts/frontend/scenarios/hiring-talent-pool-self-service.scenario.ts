import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'hiring-talent-pool-self-service',
  route: '/public/careers/talent-profile-preview',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 800,
  finalHoldMs: 200,
  qualityProfile: 'premium',
  readiness: {
    selector: '[data-capture="talent-pool-status"]',
    absentSelectors: ['[data-capture="talent-pool-loading"]', '[data-capture="talent-pool-unavailable"]'],
    waitForFonts: true,
    postReadyDelayMs: 200,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect' },
    { kind: 'noErrorBoundary' },
    { kind: 'visible', selector: '[data-capture="talent-pool-status"]' },
    { kind: 'visible', selector: '[data-capture="talent-pool-purpose"]' }
  ],
  baseline: {
    surfaceId: 'hiring.talent-pool.self_service',
    requiredFrameLabels: ['consent-status', 'availability-actions'],
    requiredRegions: ['[data-capture="talent-pool-status"]'],
    maxDiffRatio: 0.05
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="talent-pool-status"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: 'body',
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
      reducedMotionCheck: true,
      probes: [
        {
          name: 'availability-radio',
          startSelector: 'input[type="radio"][value="within_30_days"]',
          keys: ['ArrowDown'],
          expectedFocusSelector: 'input[type="radio"]:focus'
        }
      ]
    },
    performance: { enabled: true, severity: 'warning', maxDomNodes: 2500 },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="talent-pool-status"]',
      expectedDataCaptureRegions: ['talent-pool-purpose', 'talent-pool-primary-action'],
      maxContainedSurfacesInViewport: 2,
      minHeadingScaleRatio: 1.35
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'consent-status',
      note: 'Estado, propósito, vigencia y límites de uso visibles para la persona candidata.'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="talent-pool-primary-action"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'availability-actions',
      note: 'Disponibilidad, actualización y retiro permanecen comprensibles y accesibles en la misma superficie.'
    }
  ]
}
