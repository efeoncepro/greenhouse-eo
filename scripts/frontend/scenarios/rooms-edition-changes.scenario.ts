import type { CaptureScenario } from '../lib/scenario'

/** TASK-2071 «Qué cambió desde la edición N». Fictional volta history (edition 3 → 4). */
export const scenario: CaptureScenario = {
  name: 'rooms-edition-changes',
  route: '/demo/ediciones',
  authentication: 'anonymous',
  mutating: false,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  readiness: { selector: '[data-capture="edition-changes"] .editions-detail', waitForFonts: true, postReadyDelayMs: 700 },
  assertions: [{ kind: 'visible', selector: '.editions-timeline' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'wipe-slider-keyboard', startSelector: '.editions-wipe input', keys: ['ArrowRight'], expectedFocusSelector: '.editions-wipe input', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 1600, maxRequests: 100, maxTransferBytes: 5000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'piece-wipe', fullPage: false },
    { kind: 'click', selector: '.editions-list li:nth-child(2) .editions-change' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'text-diff', fullPage: false },
    { kind: 'click', selector: '.editions-list li:first-child .editions-change' },
    { kind: 'sleep', ms: 700 },
  ],
}
