// TASK-999 — Direct avatar-triggered logo editor for a non-operating organization.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'organization-logo-avatar-editor',
  route: '/agency/organizations/EO-ORG-0099',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1600,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="organization-logo-avatar-trigger"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="organization-logo-avatar-editor"]'
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="organization-logo-avatar-editor"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="organization-logo-avatar-editor"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'el editor no debe renderizar error boundary' },
    { kind: 'visible', selector: '[data-capture="organization-logo-avatar-trigger"]', reason: 'el avatar editable debe estar visible' }
  ],
  steps: [
    { kind: 'click', selector: '[data-capture="organization-logo-avatar-trigger"]' },
    { kind: 'mark', label: 'avatar-editor-open', clipSelector: '[data-capture="organization-logo-avatar-editor"]', note: 'Avatar-triggered logo editor pop-up' }
  ]
}
