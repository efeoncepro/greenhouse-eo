// Rediseño enterprise de Nueva cotización: workspace Deal Desk con CompositionShell split,
// rail de readiness, canvas de líneas y aside económico.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'finance-quote-builder-deal-desk',
  route: '/finance/quotes/new',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 15' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="quote-builder-deal-desk"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 30000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Nueva cotización autenticada vía actor GVC local.' },
    { kind: 'noErrorBoundary', reason: 'El builder no debe caer a error boundary.' },
    {
      kind: 'visible',
      selector: '[data-capture="quote-builder-line-canvas"]',
      reason: 'El canvas de líneas debe estar montado.'
    }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="quote-builder-deal-desk"]' },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="quote-builder-deal-desk"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="quote-builder-line-canvas"]', timeout: 12000 },
    {
      kind: 'mark',
      label: 'deal-desk-first-fold',
      clipSelector: '[data-capture="quote-builder-deal-desk"]',
      note: 'Workspace Deal Desk: readiness rail, canvas de líneas y aside económico.'
    }
  ]
}
