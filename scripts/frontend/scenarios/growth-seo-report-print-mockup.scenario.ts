// TASK-1310 — deterministic print/attachment adapter for local GVC review.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-seo-report-print-mockup',
  route: '/growth/seo/report/mockup?print=1',
  viewport: { width: 1440, height: 900 },
  viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', device: 'iPhone 13' }],
  qualityProfile: 'standard',
  initialHoldMs: 1000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="seo-client-report-print"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 30000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el attachment mockup vive dentro de la sesión autenticada' },
    { kind: 'noErrorBoundary', reason: 'el attachment debe renderizar sin error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'attachment', clipSelector: '[data-capture="seo-client-report-print"]', note: 'Attachment tabular, público-safe y listo para imprimir' }
  ]
}

export default scenario
