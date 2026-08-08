// TASK-1310 — SEO Trust Report Artifact print/attachment adapter.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-seo-report-print',
  route: '/growth/seo/report?print=1',
  viewport: { width: 1440, height: 900 },
  viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', device: 'iPhone 13' }],
  qualityProfile: 'premium',
  initialHoldMs: 1000,
  finalHoldMs: 500,
  readiness: {
    selector: 'main',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 30000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="seo-client-report-print"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="seo-client-report-print"]',
      failOnViolations: false
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'print-table-focus',
          startSelector: '[data-capture="seo-client-report-print"] [role="region"]',
          keys: ['Tab'],
          requireVisibleFocusRing: false
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 3600,
      maxRequests: 200,
      maxTransferBytes: 28_000_000,
      maxFcpMs: 15000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="seo-client-report-print"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el attachment debe conservar la sesión cliente' },
    { kind: 'noErrorBoundary', reason: 'el attachment no debe caer en error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'attachment', clipSelector: '[data-capture="seo-client-report-print"]', note: 'Salida imprimible con tablas accesibles y disclosure público-safe' }
  ]
}

export default scenario
