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
  baseline: {
    surfaceId: 'growth.ai-visibility.report-artifact',
    baselineName: 'ai-visibility-report-artifact-approved-v1',
    approvedMockupCaptureDir: '.captures/2026-06-28T11-57-25_ai-visibility-report-artifact-mockup',
    requiredFrameLabels: [
      '01-score-gauge',
      '02-readiness-levels',
      '02b-engine-visibility',
      '03-dimensions',
      '04-aeo-signals',
      '05-share-of-voice'
    ],
    requiredRegions: [
      '[data-capture="ai-visibility-report"]',
      '[data-capture="ai-visibility-report-score"]',
      '[data-capture="ai-visibility-report-levels"]',
      '[data-capture="ai-visibility-report-engine-snapshot"]',
      '[data-capture="ai-visibility-report-dimensions"]',
      '[data-capture="ai-visibility-report-aeo-signals"]',
      '[data-capture="ai-visibility-report-sov"]'
    ],
    maxDiffRatio: 0.08
  },
  readiness: {
    selector: '[data-capture="ai-visibility-report"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 15000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="ai-visibility-report"]',
      failOnViolations: false
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="ai-visibility-report"]',
      failOnViolations: false
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 4000,
      maxRequests: 80,
      maxFcpMs: 12000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="ai-visibility-report"]',
      failOnViolations: false,
      expectedDataCaptureRegions: [
        'ai-visibility-report',
        'ai-visibility-report-score',
        'ai-visibility-report-levels',
        'ai-visibility-report-engine-snapshot',
        'ai-visibility-report-dimensions',
        'ai-visibility-report-aeo-signals',
        'ai-visibility-report-sov'
      ],
      placeholderTerms: ['lorem', 'placeholder', 'fake', 'todo']
    }
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
    { kind: 'scroll', selector: '[data-capture="ai-visibility-report-sov"]', scrollBlock: 'center' },
    { kind: 'mark', label: '05-share-of-voice', clipSelector: '[data-capture="ai-visibility-report-sov"]' }
  ]
}

export default scenario
