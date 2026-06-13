// Internal Roadmap Timeline Lab verification — GreenhouseRoadmapTimeline primitive.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-roadmap-timeline',
  route: '/design-system/roadmap-timeline',
  viewport: { width: 1280, height: 920 },
  viewports: [
    { name: 'desktop', width: 1280, height: 920 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    selectors: ['[data-capture="roadmap-timeline-lab"]', '[data-capture="roadmap-timeline-product-roadmap"]'],
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="roadmap-timeline-lab"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'roadmap-timeline-lab',
      fullPage: true,
      note: 'Laboratorio interno dedicado para GreenhouseRoadmapTimeline y variants/kinds de roadmap'
    }
  ]
}
