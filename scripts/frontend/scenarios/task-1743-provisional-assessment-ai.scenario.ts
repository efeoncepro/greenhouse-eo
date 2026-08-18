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
    { kind: 'visible', selector: 'text=No incorporada al resultado efectivo' },
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
      allowHorizontalScrollSelectors: ['[data-capture="hiring-application-tabs"]'],
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
        name: 'open-close-ai-evidence',
        startSelector: '[data-capture="assessment-run-entry"] button',
        keys: ['Enter', 'Escape'],
        requireVisibleFocusRing: true,
      }],
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="assessment-scorecard"]',
      expectedDataCaptureRegions: ['assessment-provisional-summary', 'assessment-ai-coverage', 'assessment-ai-exceptions'],
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
    {
      kind: 'mark',
      label: 'provisional-coverage',
      clipSelector: '[data-capture="assessment-ai-coverage"]',
      note: 'Cobertura separa scores efectivos, propuestas, abstenciones y fallos.',
    },
    { kind: 'assert', assertion: { kind: 'visible', selector: 'text=Solo para operadores' } },
    { kind: 'assert', assertion: { kind: 'visible', selector: 'text=No incorporada al resultado efectivo' } },
  ],
}
