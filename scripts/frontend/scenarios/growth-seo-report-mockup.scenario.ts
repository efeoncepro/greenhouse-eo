// TASK-1310 — deterministic populated Trust Report Artifact for local GVC review.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-seo-report-mockup',
  route: '/growth/seo/report/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  qualityProfile: 'standard',
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="seo-client-report"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 1200,
    timeout: 30000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el artifact mockup vive dentro de la sesión autenticada' },
    { kind: 'noErrorBoundary', reason: 'el artifact debe renderizar sin error boundary' },
    { kind: 'visible', selector: '[data-capture="seo-client-report-quadrant"]', reason: 'el informe debe incluir el Visibility Map' },
    { kind: 'visible', selector: '[data-capture="seo-client-report-evolution"]', reason: 'el informe debe incluir la evidencia temporal' }
  ],
  steps: [
    { kind: 'mark', label: 'report', clipSelector: '[data-capture="seo-client-report"]', note: 'Trust Report Artifact web: masthead, veredicto, evidence and provenance' },
    { kind: 'scroll', selector: '[data-capture="seo-client-report-quadrant"]', scrollBlock: 'center' },
    { kind: 'mark', label: 'quadrant', clipSelector: '[data-capture="seo-client-report-quadrant"]', note: 'Visibility Map dentro del entregable' },
    { kind: 'scroll', selector: '[data-capture="seo-client-report-evolution"]', scrollBlock: 'center' },
    { kind: 'mark', label: 'evolution', clipSelector: '[data-capture="seo-client-report-evolution"]', note: 'Evolución con fallback tabular disponible' }
  ]
}

export default scenario
