import type { CaptureScenario } from '../lib/scenario'

/** TASK-2059 room on phones: the work first, chapters stacked, the map in a bottom sheet. Synthetic volta room. */
export const scenario: CaptureScenario = {
  name: 'rooms-orbit-room-mobile',
  route: '/demo/sala',
  authentication: 'anonymous',
  mutating: false,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 390, height: 844 },
  viewports: [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'compact', width: 320, height: 740 },
  ],
  readiness: { selector: '[data-capture="room-stack"] .room-scene', waitForFonts: true, postReadyDelayMs: 400 },
  assertions: [{ kind: 'visible', selector: '.room-stack-open' }, { kind: 'noErrorBoundary' }],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [{ name: 'sheet-open-close-focus', startSelector: '.room-stack-open', keys: ['Enter', 'Escape'], expectedFocusSelector: '.room-stack-open', expectedHiddenSelector: 'dialog.room-sheet[open]', requireVisibleFocusRing: true }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 2200, maxRequests: 120, maxTransferBytes: 6000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'stack-chapter-01', fullPage: false },
    { kind: 'scroll', selector: '.room-stack-chapter:nth-child(2)', scrollBlock: 'start' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: 'stack-chapter-02-piece-first', fullPage: false },
    { kind: 'scroll', selector: '.room-stack-chapter:nth-child(3)', scrollBlock: 'start' },
    { kind: 'sleep', ms: 400 },
    { kind: 'mark', label: 'stack-chapter-03-gallery', fullPage: false },
    { kind: 'click', selector: '.room-stack-open' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: 'stack-map-sheet', fullPage: false },
    { kind: 'press', key: 'Escape' },
  ],
}
