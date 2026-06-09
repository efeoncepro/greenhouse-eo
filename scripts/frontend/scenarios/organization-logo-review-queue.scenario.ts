// TASK-999 — Runtime review queue for organization logo candidates.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'organization-logo-review-queue',
  route: '/admin/data-quality/organization-logos',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1600,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="organization-logo-review-queue"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="organization-logo-review-queue"]'
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="organization-logo-review-queue"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="organization-logo-review-queue"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la cola debe renderizar sin error boundary' },
    { kind: 'visible', selector: '[data-capture="organization-logo-review-queue"]', reason: 'la cola debe renderizar' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Organization logo review queue first fold' },
    { kind: 'scroll', scrollTo: 'bottom' },
    { kind: 'mark', label: 'queue-bottom', note: 'Bottom of the review queue or empty state' }
  ]
}
