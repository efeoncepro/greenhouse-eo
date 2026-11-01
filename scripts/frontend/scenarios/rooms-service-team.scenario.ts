import type { CaptureScenario } from '../lib/scenario'

/** «Vive el servicio» · Un equipo que gira a tu alrededor y tu semana. Fictional volta, approved canvas row 6. */
export const scenario: CaptureScenario = {
  name: 'rooms-service-team',
  route: '/demo/vive/vive-equipo',
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
  readiness: { selector: '[data-capture="service-team"] .sde-who', waitForFonts: true, postReadyDelayMs: 1200 },
  assertions: [{ kind: 'visible', selector: '.sde-week' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'week-replay-keyboard', startSelector: '.sde-btn', keys: ['Enter'], expectedFocusSelector: '.sde-btn', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 1600, maxRequests: 100, maxTransferBytes: 5000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'sleep', ms: 3000 },
    { kind: 'mark', label: 'orbit', fullPage: false },
    { kind: 'hover', selector: '.sde-you' },
    { kind: 'sleep', ms: 1800 },
    { kind: 'click', selector: '.sde-who:nth-child(3)' },
    { kind: 'sleep', ms: 2500 },
    { kind: 'mark', label: 'selected', fullPage: false },
  ],
}
