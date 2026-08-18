// TASK-1363 — Focused assessment radar regression.
// Requires TASK1363_REVIEW_APP_ID to point to a disposable application with a submitted candidate_test.

import type { CaptureScenario } from '../lib/scenario'

const applicationId = process.env.TASK1363_REVIEW_APP_ID ?? 'missing-task1363-review-application'

export const scenario: CaptureScenario = {
  name: 'task1363-assessment-radar-runtime',
  route: `/agency/hiring/applications/${applicationId}`,
  mutating: false,
  safeForCapture: true,
  viewport: { width: 1440, height: 980 },
  viewports: [
    { name: 'desktop', width: 1440, height: 980 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="hiring-application"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 450,
    timeout: 20000,
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'GVC debe autenticar al operador y no capturar login.' },
    { kind: 'noErrorBoundary', reason: 'Application360 debe renderizar sin error boundary.' },
  ],
  quality: {
    layout: {
      enabled: true,
      includeSelector: 'body',
      allowHorizontalScrollSelectors: ['[role="region"]', '[data-capture="hiring-application-tabs"]'],
      failOnViolations: false,
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update'],
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="hiring-application-panel-assessment"]',
      expectedDataCaptureRegions: ['assessment-scorecard', 'assessment-competency-radar', 'assessment-review-queue'],
    },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Evaluación")' },
    { kind: 'wait', selector: '[data-capture="hiring-application-panel-assessment"]', timeout: 12000 },
    { kind: 'click', selector: 'button:has-text("Revisar evaluación")' },
    { kind: 'wait', selector: '[data-capture="assessment-mode-radar"]', timeout: 15000 },
    { kind: 'click', selector: '[data-capture="assessment-mode-radar"]' },
    { kind: 'wait', selector: '[data-capture="assessment-competency-radar"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'operator-assessment-radar',
      clipSelector: '[data-capture="assessment-scorecard"]',
      note: 'Radar Recharts completo con nombres humanos, leyenda, guía textual y cola compacta.',
    },
    {
      kind: 'mark',
      label: 'operator-application-workspace',
      clipSelector: '[data-capture="hiring-application"]',
      note: 'Workspace completo: header global contenido, hero de candidata con navegación local y superficie de evaluación.',
    },
  ],
}
