import type { CaptureScenario } from '../lib/scenario'

/** TASK-2081 live room with two fictional people (demo peers, no network). Synthetic volta room. */
export const scenario: CaptureScenario = {
  name: 'rooms-live-room',
  route: '/demo/sala?vivo=1',
  authentication: 'anonymous',
  mutating: false,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [{ name: 'desktop', width: 1440, height: 900 }],
  readiness: { selector: '[data-capture="room-live"]', waitForFonts: true, postReadyDelayMs: 500 },
  assertions: [{ kind: 'visible', selector: '.room-live-presence' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [{ name: 'cursor-toggle-keeps-focus', startSelector: '.room-live-toggle', keys: ['Enter'], expectedFocusSelector: '.room-live-toggle', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 2200, maxRequests: 120, maxTransferBytes: 6000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'click', selector: '.room-camera-nav button:nth-child(3)' },
    { kind: 'sleep', ms: 1900 },
    { kind: 'mark', label: 'live-cursors-and-selection', fullPage: false },
    { kind: 'click', selector: '.room-live-toggle' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'live-cursors-hidden', fullPage: false },
  ],
}
