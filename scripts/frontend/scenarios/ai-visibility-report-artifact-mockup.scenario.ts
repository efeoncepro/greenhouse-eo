// TASK-1252 — AI Visibility Report Artifact mockup verification.
// The harness now renders the REAL feature-local artifact (web adapter) + the
// print/attachment adapter, fed by the real contract fixtures. Clipped section
// marks keep the long report legible without the fixed sidebar; the last steps
// switch to the `attachment` variant to verify the print adapter.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'ai-visibility-report-artifact-mockup',
  route: '/growth/ai-visibility/report-artifact/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 4000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="ai-visibility-report"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: '01-score-gauge', clipSelector: '[data-capture="ai-visibility-report-score"]' },
    { kind: 'mark', label: '02-readiness-levels', clipSelector: '[data-capture="ai-visibility-report-levels"]' },
    { kind: 'scroll', selector: '[data-capture="ai-visibility-report-engine-snapshot"]', scrollBlock: 'center' },
    { kind: 'mark', label: '02b-engine-visibility', clipSelector: '[data-capture="ai-visibility-report-engine-snapshot"]' },
    { kind: 'scroll', selector: '[data-capture="ai-visibility-report-dimensions"]', scrollBlock: 'center' },
    { kind: 'mark', label: '03-dimensions', clipSelector: '[data-capture="ai-visibility-report-dimensions"]' },
    { kind: 'scroll', selector: '[data-capture="ai-visibility-report-aeo-signals"]', scrollBlock: 'center' },
    { kind: 'mark', label: '04-aeo-signals', clipSelector: '[data-capture="ai-visibility-report-aeo-signals"]' },
    { kind: 'mark', label: '05-share-of-voice', clipSelector: '[data-capture="ai-visibility-report-sov"]' }
  ]
}

export default scenario
