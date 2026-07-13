// TASK-1363 — Assessment review runtime fidelity (operator surface).
// Requires TASK1363_REVIEW_APP_ID to point to a disposable application with a submitted candidate_test.

import type { CaptureScenario } from '../lib/scenario'

const applicationId = process.env.TASK1363_REVIEW_APP_ID ?? 'missing-task1363-review-application'

export const scenario: CaptureScenario = {
  name: 'task1363-assessment-review-runtime',
  route: `/agency/hiring/applications/${applicationId}`,
  mutating: true,
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
      expectedDataCaptureRegions: ['assessment-scorecard', 'assessment-review-queue'],
    },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Evaluación")' },
    { kind: 'wait', selector: '[data-capture="hiring-application-panel-assessment"]', timeout: 12000 },
    {
      kind: 'mark',
      label: 'operator-assessment-tab-before-load',
      clipSelector: '[data-capture="hiring-application-panel-assessment"]',
      note: 'Tab Evaluación antes de cargar detalle: tarjeta de assessment y CTA de revisión.',
    },
    { kind: 'click', selector: 'button:has-text("Revisar evaluación")' },
    {
      kind: 'mark',
      label: 'operator-load-review-transition',
      clipSelector: '[data-capture="hiring-application-panel-assessment"]',
      note: 'Transición de carga hacia scorecard; no debe adelantar sugerencia IA antes de la rúbrica.',
    },
    { kind: 'wait', selector: '[data-capture="assessment-mode-radar"]', timeout: 15000 },
    {
      kind: 'mark',
      label: 'operator-scorecard-bars',
      clipSelector: '[data-capture="assessment-scorecard"]',
      note: 'Scorecard advisory con barras, objetivo, pesos y estado por competencia.',
    },
    { kind: 'click', selector: '[data-capture="assessment-mode-radar"]' },
    {
      kind: 'mark',
      label: 'operator-scorecard-radar',
      clipSelector: '[data-capture="assessment-scorecard"]',
      note: 'Modo radar con polígono de puntaje y target; tabla sr-only contenida.',
    },
    {
      kind: 'mark',
      label: 'operator-review-queue',
      clipSelector: '[data-capture="assessment-review-queue"]',
      note: 'Cola humana: respuestas abiertas pendientes de corrección.',
    },
    { kind: 'click', selector: '[data-capture="assessment-review-row"]' },
    { kind: 'wait', selector: '[data-capture="assessment-review-drawer"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'operator-review-drawer',
      clipSelector: '[data-capture="assessment-review-drawer"]',
      note: 'Drawer de corrección: pregunta, respuesta, rúbrica antes de IA, score manual y confirmación.',
    },
  ],
}
