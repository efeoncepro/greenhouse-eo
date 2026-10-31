import type { CaptureScenario } from '../lib/scenario'

/** TASK-2085 «Actividad de agentes» — el umbral (approved canvas 2026-10-31). Fictional volta fixture, anonymous and
 * without network: reversals only change local state (`latencia=0` keeps the keyboard probes deterministic).
 * The first-day state (`?estado=vacio`) and the mobile «Salas» view (`?vista=salas`) live on other query strings of the
 * same route; this runner takes one route per scenario, so they are captured by the TASK-2085 Playwright pass. */
export const scenario: CaptureScenario = {
  name: 'rooms-agent-activity',
  route: '/demo/actividad?latencia=0',
  authentication: 'anonymous',
  // Reversals and «Crear sala» stay in memory in the demo; nothing leaves the page.
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  readiness: { selector: '[data-capture="agent-activity"] [data-capture="agent-activity-entry"]', waitForFonts: true, postReadyDelayMs: 2600 },
  assertions: [
    { kind: 'visible', selector: 'h1' },
    { kind: 'visible', selector: '[data-capture="agent-activity-reversal"] button' },
    { kind: 'noErrorBoundary' },
  ],
  quality: {
    accessibility: { enabled: true, failOnViolations: true },
    layout: { enabled: true, minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true, failOnHydrationWarning: true },
    assets: { enabled: true, failOnViolations: true },
    keyboard: {
      enabled: true, failOnViolations: true, reducedMotionCheck: true,
      probes: [
        // Open the reversal and leave with Escape: no effect, focus back on the button that opened it.
        { name: 'reversal-dialog-escape', startSelector: '[data-entry-id="demo-act-member-hum"] [data-capture="agent-activity-reversal"] button', keys: ['Enter', 'Escape'],
          expectedFocusSelector: '[data-entry-id="demo-act-member-hum"] [data-capture="agent-activity-reversal"] button', requireVisibleFocusRing: true },
        // Confirm with the keyboard: focus lands on «Revertida por…» in the same entry (Shift presses only give the demo a beat).
        { name: 'reversal-confirm-focus', startSelector: '[data-entry-id="demo-act-publish-reforma"] [data-capture="agent-activity-reversal"] button', keys: ['Enter', 'Tab', 'Tab', 'Enter', 'Shift', 'Shift', 'Shift'],
          expectedFocusSelector: '[data-entry-id="demo-act-publish-reforma"] .activity-status', requireVisibleFocusRing: true },
      ],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 2200, maxRequests: 120, maxTransferBytes: 6000000, maxFcpMs: 10000 },
  },
  steps: [
    { kind: 'mark', label: 'home-ready', fullPage: false },
    { kind: 'mark', label: 'quota-banner', clipSelector: '.activity-quota' },
    { kind: 'click', selector: '[data-entry-id="demo-act-invite-volta"] [data-capture="agent-activity-reversal"] button' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'reversal-confirm', fullPage: false },
    { kind: 'click', selector: '.activity-dialog .activity-dialog-actions button:last-child' },
    { kind: 'sleep', ms: 1200 },
    { kind: 'mark', label: 'reversal-done', fullPage: false },
    { kind: 'click', selector: '[data-entry-id="demo-act-publish-volta"] [data-capture="agent-activity-reversal"] button' },
    { kind: 'sleep', ms: 600 },
    { kind: 'click', selector: '.activity-dialog .activity-dialog-actions button:last-child' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: 'reversal-conflict', fullPage: false },
    { kind: 'scroll', selector: '[data-kind="rejected"]', scrollBlock: 'center' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'rejected-entry', fullPage: false },
    { kind: 'scroll', scrollTo: 'top' },
    { kind: 'click', selector: '.activity-intro-actions > button' },
    { kind: 'sleep', ms: 1600 },
    { kind: 'mark', label: 'create-room-dialog', fullPage: false },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 400 },
    { kind: 'click', selector: '.activity-filters [role="group"]:first-child a:last-child' },
    { kind: 'wait', selector: '.activity-filters [role="group"]:first-child a:last-child[aria-current]', timeout: 15000 },
    { kind: 'sleep', ms: 2600 },
    { kind: 'mark', label: 'filter-all', fullPage: false },
    { kind: 'click', selector: '[data-entry-id="demo-act-publish-volta"] .activity-room-link' },
    { kind: 'wait', selector: '.activity-title-room', timeout: 15000 },
    { kind: 'sleep', ms: 2600 },
    { kind: 'mark', label: 'room-activity', fullPage: false },
  ],
}
