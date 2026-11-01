import type { CaptureScenario } from '../lib/scenario'

/** TASK-2068 invitation: «Entra.» in the orbit, the code, the error and «Listo.». Fictional people and client. */
export const scenario: CaptureScenario = {
  name: 'rooms-invitation-stage',
  route: '/demo/invitacion',
  authentication: 'anonymous',
  // Typing in the demo code field only changes local state; no request leaves the page.
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'compact', width: 320, height: 740 },
  ],
  readiness: { selector: '[data-capture="invitation-entry"] .room-orbit', waitForFonts: true, postReadyDelayMs: 2200 },
  assertions: [{ kind: 'visible', selector: 'input[name="code"]' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'code-then-resend', startSelector: 'input[name="code"]', keys: ['Tab'], expectedFocusSelector: '.invite-stage-buttons button:not([disabled])', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 1600, maxRequests: 100, maxTransferBytes: 5000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'entra', fullPage: true },
    { kind: 'fill', selector: 'input[name="code"]', value: '000000' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: 'code-error', fullPage: false },
    { kind: 'fill', selector: 'input[name="code"]', value: '482913' },
    { kind: 'sleep', ms: 1400 },
    { kind: 'mark', label: 'listo', fullPage: false },
  ],
}
