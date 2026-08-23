import type { CaptureScenario } from '../lib/scenario'

const applicationId = process.env.TASK1743_APPLICATION_ID ?? 'happ-031318c2-02ce-4623-8ada-6970cf4a8fb4'

export const scenario: CaptureScenario = {
  name: 'task-1743-provisional-assessment-ai',
  route: `/agency/hiring/applications/${applicationId}?tab=assessment`,
  viewport: { width: 1440, height: 1100 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  qualityProfile: 'premium',
  initialHoldMs: 1800,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="assessment-provisional-summary"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 250,
    timeout: 25000,
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la evaluación provisional es operator-only' },
    { kind: 'noErrorBoundary', reason: 'Application 360 debe renderizar sin degradación' },
    { kind: 'visible', selector: 'text=Evaluación asistida revisada' },
  ],
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="assessment-scorecard"]',
      failOnViolations: true,
    },
    layout: {
      enabled: true,
      includeSelector: 'main',
      ignoreSelectors: ['.MuiLinearProgress-bar'],
      allowHorizontalScrollSelectors: [
        '[data-capture="hiring-tabs"]',
        '[data-capture="hiring-application-tabs"]',
      ],
      failOnViolations: true,
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update'],
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [{
        name: 'switch-scorecard-mode',
        startSelector: '[data-capture="assessment-mode-radar"]',
        keys: ['Space'],
        requireVisibleFocusRing: true,
      }],
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 3600,
      maxRequests: 200,
      maxTransferBytes: 28_000_000,
      maxFcpMs: 15000,
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="assessment-scorecard"]',
      expectedDataCaptureRegions: ['assessment-provisional-summary', 'assessment-scorecard', 'assessment-competency-radar'],
    },
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="assessment-provisional-summary"]', timeout: 15000 },
    {
      kind: 'mark',
      label: 'provisional-summary',
      clipSelector: '[data-capture="assessment-run-entry"]',
      note: 'Score provisional, autoridad operator-only, cobertura y competencias sin mezclarse con el resultado efectivo.',
    },
    { kind: 'assert', assertion: { kind: 'visible', selector: 'text=Solo para operadores' } },
    { kind: 'assert', assertion: { kind: 'visible', selector: 'text=Evaluación asistida revisada' } },
    { kind: 'click', selector: 'button:has-text("Revisar evaluación")' },
    { kind: 'wait', selector: '[data-capture="assessment-mode-radar"]', timeout: 15000 },
    {
      kind: 'mark',
      label: 'assessment-bars',
      clipSelector: '[data-capture="assessment-scorecard"]',
      note: 'Barras contenidas y centradas; el selector vive junto a la visualización que controla.',
    },
    { kind: 'click', selector: '[data-capture="assessment-mode-radar"]' },
    { kind: 'wait', selector: '[data-capture="assessment-competency-radar"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'assessment-radar',
      clipSelector: '[data-capture="assessment-scorecard"]',
      note: 'Radar con etiquetas completas, objetivo comparable y ancho legible.',
    },
  ],
}
