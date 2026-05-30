import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'gvc-multi-viewport',
  route: '/agency/sample-sprints/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1400,
  readiness: {
    selector: 'h4',
    absentSelectors: ['[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 8000
  },
  assertions: [
    { kind: 'noErrorBoundary', reason: 'responsive capture must render without app error' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Primer fold por viewport' },
    { kind: 'scroll', scrollTo: 'bottom' },
    { kind: 'mark', label: 'bottom', note: 'Final de pantalla por viewport' }
  ]
}
