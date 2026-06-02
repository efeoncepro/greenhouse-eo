import type { CaptureScenario } from '../lib/scenario'

/**
 * EPIC-017 / People Workforce Command Center mockup.
 *
 * Product contract:
 * - People is the workforce hub and the roster command center.
 * - Payroll remains a specialized rail; this surface shows evidence and links only.
 * - The route must preserve dense operational scanning and rich microinteractions.
 */
export const scenario: CaptureScenario = {
  name: 'people-workforce-command-center',
  route: '/people/mockup/workforce-command',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 700,
  readiness: {
    selector: '[data-capture="people-workforce-command-mockup"]',
    selectors: ['[data-capture="people-command-header"]', '[data-capture="people-command-summary"]'],
    absentSelectors: ['[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000,
    note: 'People Workforce Command Center mockup is ready.'
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup must render inside authenticated dashboard shell' },
    { kind: 'noErrorBoundary', reason: 'mockup route must render without app error boundary' },
    { kind: 'visible', selector: 'text=Exception queue', reason: 'work queue must be visible before roster' },
    { kind: 'visible', selector: 'text=Payroll boundary', reason: 'payroll boundary must be explicit' }
  ],
  quality: {
    allowLoading: false,
    allowLogin: false,
    allowErrorBoundary: false
  },
  steps: [
    {
      kind: 'mark',
      label: 'first-fold',
      note: 'Header, decision strip and exception queue establish the command center.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'saved-view-attention',
        intent: 'Switch saved view to Needs attention and capture filter feedback.',
        action: { kind: 'click', selector: 'text=Needs attention' },
        frames: [
          {
            label: 'applied',
            atMs: 350,
            note: 'Saved view changes roster counts and maintains command hierarchy.'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'open-inspector',
        intent: 'Open a row inspector to verify evidence, readiness and safe links.',
        action: { kind: 'click', selector: 'text=Felipe Zurita' },
        frames: [
          {
            label: 'drawer',
            atMs: 450,
            clipSelector: '[data-capture="people-command-inspector"]',
            note: 'Inspector shows domain readiness without mutating Payroll or Finance.'
          }
        ],
        keyboardEquivalent: {
          action: { kind: 'press', key: 'Escape' },
          expected: 'Drawer closes and focus returns to command surface.'
        }
      }
    },
    {
      kind: 'scroll',
      selector: '[data-capture="people-command-roster"]',
      scrollBlock: 'start'
    },
    {
      kind: 'mark',
      label: 'roster',
      clipSelector: '[data-capture="people-command-roster"]',
      note: 'Dense roster remains scannable with regime badges and readiness columns.'
    },
    {
      kind: 'scroll',
      scrollTo: 'bottom'
    },
    {
      kind: 'mark',
      label: 'payroll-boundary',
      note: 'Boundary section remains visible and layout holds at the bottom.'
    }
  ]
}
