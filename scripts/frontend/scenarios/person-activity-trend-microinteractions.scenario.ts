import type { CaptureScenario } from '../lib/scenario'

/**
 * Person 360 → Activity tab → MetricTrendCard microinteractions audit.
 *
 * Proves the cards are FUNCTIONAL, not decorative:
 * - chart hover surfaces a tooltip + crosshair + marker with the real value
 *   (OTD healthy/green, FTR critical/magenta — value-derived semaphore)
 * - card hover lifts + shows the accent border
 *
 * Desktop only — microinteractions don't need responsive coverage.
 * Read-only.
 */
export const scenario: CaptureScenario = {
  name: 'person-activity-trend-microinteractions',
  route: '/people/daniela-ferreira?tab=activity',
  viewport: { width: 1440, height: 1400 },
  initialHoldMs: 2400,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="person-trend-otd_pct"]',
    selectors: ['[data-capture="person-trend-ftr_pct"]', '.recharts-surface'],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 1000,
    timeout: 18000,
    note: 'Both trend cards mounted with their ApexCharts canvases rendered.'
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Activity tab must render inside the authenticated Person 360 shell' },
    { kind: 'noErrorBoundary', reason: 'tab must render without the app error boundary' },
    { kind: 'visible', selector: 'text=On-Time Delivery', reason: 'OTD trend card must be present' },
    { kind: 'visible', selector: 'text=First Time Right', reason: 'FTR trend card must be present' }
  ],
  quality: { allowLoading: false, allowLogin: false, allowErrorBoundary: false },
  steps: [
    {
      kind: 'mark',
      label: 'both-cards',
      note: 'OTD green (optimal) vs FTR magenta (critical) — value-derived semaphore. Lines span edge-to-edge, no floating start.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'otd-chart-tooltip',
        intent: 'Hover the OTD chart to verify the tooltip + crosshair + marker show the real value.',
        action: { kind: 'hover', selector: '[data-capture="person-trend-otd_pct"] .recharts-surface' },
        frames: [
          {
            label: 'tooltip',
            atMs: 500,
            clipSelector: '[data-capture="person-trend-otd_pct"]',
            note: 'Tooltip shows month + On-Time Delivery %, crosshair + enlarged marker at the point.'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'ftr-chart-tooltip',
        intent: 'Hover the FTR chart to verify the tooltip on the critical (magenta) card.',
        action: { kind: 'hover', selector: '[data-capture="person-trend-ftr_pct"] .recharts-surface' },
        frames: [
          {
            label: 'tooltip',
            atMs: 500,
            clipSelector: '[data-capture="person-trend-ftr_pct"]',
            note: 'Tooltip shows month + First Time Right %, magenta crosshair + marker.'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'card-hover-lift',
        intent: 'Hover the OTD card to confirm the lift + accent-border microinteraction.',
        action: { kind: 'hover', selector: '[data-capture="person-trend-otd_pct"]' },
        frames: [
          {
            label: 'lift',
            atMs: 260,
            clipSelector: '[data-capture="person-trend-otd_pct"]',
            note: 'Card lifts 2px + accent border. Brief, subordinate, enterprise.'
          }
        ]
      }
    }
  ]
}
