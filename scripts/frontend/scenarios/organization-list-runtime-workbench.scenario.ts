// TASK-1016 — Runtime adoption of the approved Organization Operations Workbench.
// Read-only: validates /agency/organizations after wiring real API data.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'organization-list-runtime-workbench',
  route: '/agency/organizations',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1600,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="organization-list-runtime-workbench"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="organization-list-runtime-workbench"]'
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="organization-list-runtime-workbench"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="organization-list-runtime-workbench"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: '[data-capture="organization-list-runtime-workbench"]', reason: 'el workbench runtime debe renderizar' },
    { kind: 'visible', selector: 'text=Readiness operacional', reason: 'el rail contextual debe renderizar evidencia operacional' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Runtime workbench list-detail using /api/organizations' },
    { kind: 'click', selector: 'button[aria-label="Vista matriz"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'matrix-mode', note: 'Secondary runtime matrix mode' },
    { kind: 'click', selector: 'button[aria-label="Vista workbench"]' },
    { kind: 'click', selector: 'button[aria-label^="Sin Space"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'filtered-risk', note: 'Runtime operational filter remains usable' }
  ]
}
