import type { CaptureScenario } from '../lib/scenario'

/**
 * Person 360 → Activity tab → monthly trend cards (OTD% / FTR%).
 *
 * Validates the Figma "OTD mensual" card (Design System | Vuexy → AXIS,
 * node 11853:17766) implemented as the reusable `MetricTrendCard`:
 * canonical typography (Geist + kpiValue, Poppins display-only), zone-driven
 * green area, end marker, month axis, and the enterprise microinteractions
 * (hover lift + accent border, area draw-in, count-up).
 *
 * Read-only: no data is mutated.
 */
export const scenario: CaptureScenario = {
  name: 'person-activity-otd-trend',
  route: '/people/daniela-ferreira?tab=activity',
  viewport: { width: 1440, height: 1400 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1400 },
    { name: 'laptop', width: 1280, height: 1400 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 2200,
  finalHoldMs: 700,
  readiness: {
    selector: 'text=Actividad del período',
    selectors: ['[data-capture="person-trend-otd_pct"]'],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 700,
    timeout: 18000,
    note: 'Activity tab loaded with the monthly trend cards rendered.'
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Activity tab must render inside the authenticated Person 360 shell' },
    { kind: 'noErrorBoundary', reason: 'tab must render without the app error boundary' },
    { kind: 'visible', selector: 'text=On-Time Delivery', reason: 'OTD trend card must be present' },
    { kind: 'visible', selector: 'text=First Time Right', reason: 'FTR trend card must be present' }
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
      note: 'Header + Nexa + trend cards. The OTD/FTR cards must read as the hero metrics.'
    },
    {
      kind: 'mark',
      label: 'trend-cards',
      clipSelector: '[data-capture="person-trend-otd_pct"]',
      note: 'OTD card: title, Mensual, kpiValue %, delta chip, green area + end marker + month axis.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'card-hover-lift',
        intent: 'Hover the OTD card to confirm the lift + accent-border microinteraction.',
        action: { kind: 'hover', selector: '[data-capture="person-trend-otd_pct"]' },
        frames: [
          {
            label: 'card-hover',
            atMs: 260,
            clipSelector: '[data-capture="person-trend-otd_pct"]',
            note: 'Card lifts 2px, shadow + accent border. Subordinate, brief, enterprise.'
          }
        ]
      }
    }
  ]
}
