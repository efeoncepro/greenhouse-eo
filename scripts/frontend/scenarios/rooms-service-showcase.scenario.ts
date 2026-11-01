import type { CaptureScenario } from '../lib/scenario'

/** «Vive el servicio» · Tu marca, en el mundo: contextos con morph líquido y lente de construcción. Fictional volta, approved canvas row 6. */
export const scenario: CaptureScenario = {
  name: 'rooms-service-showcase',
  route: '/demo/vive/vive-marca',
  authentication: 'anonymous',
  mutating: false,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  readiness: { selector: '[data-capture="service-showcase"] .sdm-box img', waitForFonts: true, postReadyDelayMs: 1200 },
  assertions: [{ kind: 'visible', selector: '.sdm-ctx' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'context-keyboard', startSelector: '.sdm-ctx', keys: ['Tab'], expectedFocusSelector: '.sdm-ctx:nth-child(2)', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 1600, maxRequests: 100, maxTransferBytes: 5000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'feed', fullPage: false },
    { kind: 'click', selector: '.sdm-ctx:nth-child(3)' },
    { kind: 'sleep', ms: 1800 },
    { kind: 'mark', label: 'ooh', fullPage: false },
    { kind: 'click', selector: '.sdm-lensb' },
    { kind: 'sleep', ms: 1200 },
    { kind: 'mark', label: 'lens', fullPage: false },
  ],
}
