import type { CaptureScenario } from '../lib/scenario'

/** TASK-2071 authoring desk of the approved canvas. Fictional volta draft, edits in memory only (no network). */
export const scenario: CaptureScenario = {
  name: 'rooms-authoring',
  route: '/demo/autoria',
  authentication: 'anonymous',
  // The demo keeps every edit in local state; nothing leaves the page.
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  readiness: { selector: '[data-capture="authoring"] .authoring-stage .room-scene', waitForFonts: true, postReadyDelayMs: 900 },
  assertions: [{ kind: 'visible', selector: '.authoring-roles' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'view-as-arrows', startSelector: '.authoring-roles [aria-checked="true"]', keys: ['ArrowRight'], expectedFocusSelector: '.authoring-roles [aria-checked="true"]', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 2200, maxRequests: 120, maxTransferBytes: 6000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'desk-buyer', fullPage: false },
    { kind: 'click', selector: '.authoring-roles [data-role="champion"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'desk-champion', fullPage: false },
    { kind: 'click', selector: '.authoring-inventory li:nth-child(3) .authoring-item' },
    { kind: 'sleep', ms: 700 },
    { kind: 'click', selector: '.authoring-switch' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: 'piece-excluded', fullPage: false },
    { kind: 'click', selector: '.authoring-bar-actions button:last-of-type' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'publish-confirm', fullPage: false },
    { kind: 'press', key: 'Escape' },
  ],
}
