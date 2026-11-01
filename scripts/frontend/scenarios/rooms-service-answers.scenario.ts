import type { CaptureScenario } from '../lib/scenario'

/** «Vive el servicio» · Cuando pregunten, que aparezcas: hoy y con el plan. Fictional volta, approved canvas row 6. */
export const scenario: CaptureScenario = {
  name: 'rooms-service-answers',
  route: '/demo/vive/vive-respuestas',
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
  readiness: { selector: '[data-capture="service-answers"] .sdr-q', waitForFonts: true, postReadyDelayMs: 1200 },
  assertions: [{ kind: 'visible', selector: '.sdr-card' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'moment-keyboard', startSelector: '.sdr-seg button', keys: ['Tab'], expectedFocusSelector: '.sdr-seg button:nth-of-type(2)', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 1600, maxRequests: 100, maxTransferBytes: 5000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'sleep', ms: 4000 },
    { kind: 'mark', label: 'today', fullPage: false },
    { kind: 'click', selector: '.sdr-seg button:nth-of-type(2)' },
    { kind: 'sleep', ms: 6000 },
    { kind: 'mark', label: 'plan', fullPage: false },
  ],
}
