// TASK-1252 — AI Visibility Report Artifact (web adapter) mockup verification.
// Concept A "Executive cockpit": clipped section marks so the long report is
// legible without the fixed sidebar (gauge, 5-level ladder, dimensions radar,
// Share of Voice, sentiment).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'ai-visibility-report-artifact-mockup',
  route: '/growth/ai-visibility/report-artifact/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', device: 'iPhone 13' }],
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
    { kind: 'mark', label: '02-readiness-ladder', clipSelector: '[data-capture="ai-visibility-report-levels"]' },
    { kind: 'scroll', selector: '[data-capture="ai-visibility-report-dimensions"]', scrollBlock: 'center' },
    { kind: 'mark', label: '03-dimensions-radar', clipSelector: '[data-capture="ai-visibility-report-dimensions"]' },
    { kind: 'mark', label: '04-share-of-voice', clipSelector: '[data-capture="ai-visibility-report-sov"]' },
    { kind: 'scroll', selector: '[data-capture="ai-visibility-report-sentiment"]', scrollBlock: 'center' },
    { kind: 'mark', label: '05-sentiment', clipSelector: '[data-capture="ai-visibility-report-sentiment"]' }
  ]
}

export default scenario
