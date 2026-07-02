// TASK-1320 — Growth Forms Success Card renderer evidence.
// Uses the internal design-system preview with a simulated submit; no public API writes.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-forms-success-card',
  route: '/design-system/growth-forms-renderer',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile-390', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="growth-forms-renderer-preview"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'preview interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true,
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="growth-forms-renderer-canvas"]'
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="growth-forms-renderer-canvas"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    keyboard: {
      enabled: true,
      probes: [
        {
          name: 'success-card-focus-path',
          startSelector: '[data-capture="growth-form-success-card"]',
          keys: ['Tab'],
          requireVisibleFocusRing: false
        }
      ]
    }
  },
  steps: [
    {
      kind: 'click',
      selector: 'button:has-text("Success card")',
      note: 'Cambia a la fixture success-card gobernada por success_behavior_json'
    },
    { kind: 'sleep', ms: 500, note: 'Re-monta el renderer con fixture success-card' },
    {
      kind: 'mark',
      label: 'before-submit',
      clipSelector: '[data-capture="growth-forms-renderer-canvas"]',
      note: 'Formulario antes del submit'
    },
    { kind: 'fill', selector: '[name="work_email"]', value: 'lead@brand.com', note: 'Email de prueba sin PII real' },
    { kind: 'fill', selector: '[name="brand"]', value: 'Brand', note: 'Marca de prueba' },
    { kind: 'click', selector: '[data-ghf-consent="tos"]', note: 'Acepta consentimiento en fixture' },
    { kind: 'click', selector: '[data-ghf-primary]', note: 'Submit simulado accepted' },
    {
      kind: 'wait',
      selector: '[data-capture="growth-form-success-card"]',
      timeout: 6000,
      note: 'Espera success card'
    },
    {
      kind: 'assert',
      assertion: { kind: 'visible', selector: '[data-capture="growth-form-success-card"]', reason: 'success card visible tras accepted' }
    },
    {
      kind: 'assert',
      assertion: { kind: 'visible', selector: '[data-capture="growth-form-success-reward"]', reason: 'reward gobernado visible' }
    },
    {
      kind: 'assert',
      assertion: { kind: 'visible', selector: '[data-capture="growth-form-success-actions"]', reason: 'acciones gobernadas visibles' }
    },
    {
      kind: 'mark',
      label: 'after-success',
      clipSelector: '[data-capture="growth-forms-renderer-canvas"]',
      note: 'Success card completa con reward y action row'
    }
  ]
}
