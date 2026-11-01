import type { CaptureScenario } from '../lib/scenario'

/** Authoring «Vive el servicio» scenes from the desk: inventory, live stage at 1440 × 900 and the editor. Fictional volta. */
export const scenario: CaptureScenario = {
  name: 'rooms-authoring-scenes',
  route: '/demo/autoria',
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
  readiness: { selector: '[data-capture="authoring"] .authoring-add-scene', waitForFonts: true, postReadyDelayMs: 900 },
  assertions: [{ kind: 'visible', selector: '.authoring-scenes-head' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'add-scene-keyboard', startSelector: '.authoring-add-scene summary', keys: ['Enter'], expectedFocusSelector: '.authoring-add-scene summary', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 3500, maxRequests: 120, maxTransferBytes: 6000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'click', selector: '.authoring-inventory ul:nth-of-type(2) li:first-child .authoring-item' },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: 'showcase-editor', fullPage: false },
    { kind: 'click', selector: '.authoring-inventory ul:nth-of-type(2) li:nth-child(2) .authoring-item' },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: 'cycle-editor', fullPage: false },
    { kind: 'click', selector: '.authoring-add-scene summary' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: 'add-scene', fullPage: false },
  ],
}
