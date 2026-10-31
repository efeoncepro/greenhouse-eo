import type { CaptureScenario } from '../lib/scenario'

/** TASK-2083: the login stopped before the room (identity_unbound). Anonymous; fixed synthetic reference. */
export const scenario: CaptureScenario = {
  name: 'rooms-access-issue',
  // TASK-2082: the real identity_unbound case carries the access request code the person shares.
  route: '/auth/error?reason=identity_unbound&ref=7b6ef4e7-a936-4ec6-84ac-9865732e40d3&code=K7M29QXA',
  authentication: 'anonymous',
  // Copying the reference only writes to the clipboard; no request leaves the page.
  mutating: false,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  readiness: { selector: '[data-capture="access-issue"] .room-orbit', waitForFonts: true, postReadyDelayMs: 2200 },
  assertions: [{ kind: 'visible', selector: 'h1' }, { kind: 'visible', selector: '[data-capture="access-issue-reference"]' }, { kind: 'noErrorBoundary' }],
  quality: {
    // /auth/error is the designed destination of a stopped login, not an auth redirect.
    allowLogin: true,
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'login-then-copy', startSelector: '.access-issue-buttons a', keys: ['Tab'], expectedFocusSelector: '.access-issue-reference button', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 800, maxRequests: 100, maxTransferBytes: 5000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'identity-unbound', fullPage: false },
  ],
}
