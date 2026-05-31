import type { CaptureScenario } from '../lib/scenario'

/**
 * EPIC-017 / Person 360 future-state mockup.
 *
 * Contract under review:
 * - Workforce becomes a first-class facet of Person 360.
 * - Existing person-level rails are preserved: Nexa, ICO, memberships,
 *   economy/finance, payment profiles and AI tooling.
 * - The mockup is read-only and route-local; it must not mutate runtime data.
 */
export const scenario: CaptureScenario = {
  name: 'person-daniela-workforce-profile',
  route: '/people/mockup/daniela-workforce',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="person-workforce-profile-mockup"]',
    selectors: [
      '[data-capture="person-workforce-header"]',
      'text=Workforce command profile'
    ],
    absentSelectors: ['[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000,
    note: 'Person 360 mockup shell is ready and authenticated.'
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup must be visible inside authenticated dashboard shell' },
    { kind: 'noErrorBoundary', reason: 'mockup route must render without app error boundary' },
    { kind: 'visible', selector: 'text=Nexa Insights', reason: 'Nexa rail must be preserved' },
    { kind: 'visible', selector: 'text=Current People surfaces preserved', reason: 'no-regression map must be explicit' }
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
      note: 'Header + summary. Must communicate Person 360 hub without hiding operational rails.'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="person-operations-ico-nexa"]',
      scrollBlock: 'start'
    },
    {
      kind: 'mark',
      label: 'ico-nexa-preserved',
      clipSelector: '[data-capture="person-operations-ico-nexa"]',
      note: 'Nexa Insights and ICO metrics remain first-class.'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="person-no-regression-map"]',
      scrollBlock: 'start'
    },
    {
      kind: 'mark',
      label: 'no-regression-map',
      clipSelector: '[data-capture="person-no-regression-map"]',
      note: 'Current People tabs mapped to future rails.'
    },
    {
      kind: 'scroll',
      scrollTo: 'bottom'
    },
    {
      kind: 'mark',
      label: 'bottom',
      note: 'Lower sections render without overlap or blank states.'
    }
  ]
}
