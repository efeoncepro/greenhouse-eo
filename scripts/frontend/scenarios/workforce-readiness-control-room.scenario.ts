import type { CaptureScenario } from '../lib/scenario'

/**
 * EPIC-017 / TASK-962 Workforce Coverage & Readiness Control Room mockup.
 *
 * Product contract:
 * - Diagnostic/read-only surface for gap classification.
 * - No inline remediation, payroll recalculation, payment execution or document signing.
 * - Fixture/demo residue must be separated from the real active-worker cohort.
 */
export const scenario: CaptureScenario = {
  name: 'workforce-readiness-control-room',
  route: '/people/mockup/workforce-readiness',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 700,
  readiness: {
    selector: '[data-capture="workforce-readiness-mockup"]',
    selectors: [
      '[data-capture="workforce-readiness-header"]',
      '[data-capture="workforce-readiness-baseline-matrix"]',
      '[data-capture="workforce-readiness-disposition-board"]'
    ],
    absentSelectors: ['[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000,
    note: 'Workforce readiness control room mockup is ready.'
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup must render inside authenticated dashboard shell' },
    { kind: 'noErrorBoundary', reason: 'mockup route must render without app error boundary' },
    { kind: 'visible', selector: 'text=Diagnostic only', reason: 'read-only boundary must be explicit' },
    { kind: 'visible', selector: 'text=Disposition board', reason: 'gap classification board must be visible' }
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
      note: 'Header, scope toggle and baseline matrix establish diagnostic posture.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'include-fixtures',
        intent: 'Toggle audit-only fixtures into the cohort without mixing them into real-worker health.',
        action: { kind: 'click', selector: 'text=Include fixtures' },
        frames: [
          {
            label: 'fixtures-visible',
            atMs: 350,
            note: 'Fixture excluded lane appears as separate audit context.'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'open-domain-follow-up',
        intent: 'Select a disposition and verify owner, source codes and masked sample evidence.',
        action: { kind: 'click', selector: 'text=Domain follow-up' },
        frames: [
          {
            label: 'gap-detail',
            atMs: 350,
            clipSelector: '[data-capture="workforce-readiness-gap-detail"]',
            note: 'Gap detail shows masked samples and safe next action only.'
          }
        ]
      }
    },
    {
      kind: 'scroll',
      selector: '[data-capture="workforce-readiness-remediation-queue"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'remediation-queue',
      clipSelector: '[data-capture="workforce-readiness-remediation-queue"]',
      note: 'Remediation queue previews task sequencing without inline fixes.'
    },
    {
      kind: 'scroll',
      scrollTo: 'bottom'
    },
    {
      kind: 'mark',
      label: 'boundary',
      clipSelector: '[data-capture="workforce-readiness-boundary"]',
      note: 'Boundary statement remains visible at the bottom.'
    }
  ]
}
