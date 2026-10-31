import type { CaptureScenario } from '../lib/scenario'

/** «Vive el servicio» · Pide, mira, ajusta, aprueba: el ciclo de trabajo simulado. Fictional volta, approved canvas row 6. */
export const scenario: CaptureScenario = {
  name: 'rooms-service-cycle',
  route: '/demo/vive/vive-ciclo',
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
  readiness: { selector: '[data-capture="service-cycle"] .sdc-chip', waitForFonts: true, postReadyDelayMs: 1200 },
  assertions: [{ kind: 'visible', selector: '.sdc-steps' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'goal-keyboard', startSelector: '.sdc-chip', keys: ['Tab'], expectedFocusSelector: '.sdc-chip:nth-child(2)', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 1600, maxRequests: 100, maxTransferBytes: 5000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'brief', fullPage: false },
    { kind: 'click', selector: '.sdc-chip' },
    { kind: 'click', selector: '.sdc-solid' },
    { kind: 'sleep', ms: 6000 },
    { kind: 'mark', label: 'proposal', fullPage: false },
  ],
}
