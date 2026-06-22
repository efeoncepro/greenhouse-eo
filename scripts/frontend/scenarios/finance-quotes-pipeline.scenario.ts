import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'finance-quotes-pipeline',
  route: '/finance/quotes',
  mutating: false,
  safeForCapture: true,
  viewport: { width: 1440, height: 960 },
  viewports: [
    { name: 'desktop', width: 1440, height: 960 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="finance-quotes-summary"]',
    absentSelectors: ['[data-testid="login-card"]', '[data-testid="LoginCard"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 900,
    timeout: 30000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Quotes pipeline vive bajo dashboard autenticado via GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' },
    {
      kind: 'visible',
      selector: '[data-capture="finance-quotes-summary"]',
      reason: 'El summary strip debe estar visible en el primer fold.'
    },
    {
      kind: 'visible',
      selector: '[data-capture="finance-quotes-table"]',
      reason: 'La tabla ledger debe seguir siendo la superficie primaria.'
    }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="finance-quotes-page"]',
      ignoreSelectors: ['[data-gvc-ignore-layout="true"]']
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    keyboard: {
      enabled: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'row-action-tab-reachability',
          startSelector: '[data-capture="finance-quotes-table"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="finance-quotes-page"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="finance-quotes-table"]', timeout: 30000 },
    {
      kind: 'mark',
      label: 'quotes-pipeline-closed',
      fullPage: false,
      note: 'Ledger cerrado: summary strip, filtros compactos y tabla full-width sin preview abierto.'
    },
    {
      kind: 'mark',
      label: 'quotes-pipeline-table',
      clipSelector: '[data-capture="finance-quotes-table"]',
      note: 'Tabla ledger con acciones de fila disponibles en hover/focus y visibles en mobile.'
    },
    { kind: 'click', selector: '[data-capture="finance-quotes-row-actions"] button', timeout: 12000 },
    { kind: 'wait', selector: '[data-capture="finance-quotes-preview"]', timeout: 12000 },
    { kind: 'sleep', ms: 900 },
    {
      kind: 'mark',
      label: 'quotes-pipeline-preview-open',
      fullPage: false,
      note: 'Preview contextual abierto con Adaptive Sidecar en desktop y drawer temporal en mobile.'
    },
    {
      kind: 'mark',
      label: 'quotes-pipeline-preview',
      clipSelector: '[data-capture="finance-quotes-preview"]',
      note: 'Vista rápida de la cotización: métricas, ciclo comercial, salud de margen y acciones.'
    }
  ]
}
