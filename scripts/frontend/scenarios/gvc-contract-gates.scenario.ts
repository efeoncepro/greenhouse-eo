// TASK-1018 — Regression scenario for the GVC mockup→runtime contract gates.
// Exercises baseline contract + layout + runtime + performance + enterprise rubric
// + accessibility on a stable existing mockup surface. Read-only.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'gvc-contract-gates',
  route: '/agency/organizations/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="organization-list-enterprise-mockup"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  baseline: {
    surfaceId: 'task1018.gvc-contract-gates',
    baselineName: 'gvc-contract-gates-regression',
    requiredFrameLabels: ['first-fold'],
    maskSelectors: ['[data-relative-time]', '[data-dynamic-count]'],
    maxDiffRatio: 0.05
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="organization-list-enterprise-mockup"]'
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="organization-list-enterprise-mockup"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 6000,
      maxRequests: 400
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="organization-list-enterprise-mockup"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' }
  ],
  steps: [{ kind: 'mark', label: 'first-fold', note: 'Workbench list-detail enterprise surface' }]
}
