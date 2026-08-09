// TASK-1310 — SEO Trust Report Artifact, web + print handoff.
//
// The report is read-only and tenant-scoped. `?print=1` is the attachment/print adapter;
// the visual artifact keeps its public-safe disclosure boundary and never exposes operator data.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-seo-report',
  route: '/growth/seo/report',
  // Superficie CLIENTE: con la sesión de operador interno la página renderiza su card
  // de bloqueo, la captura muere por `selector_timeout` y el gate reporta BLOCK como si
  // fuera defecto de producto. Declarar la identidad evita ese diagnóstico falso.
  requiresStorageState: '.auth/storageState.local-berel-client.json',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  qualityProfile: 'premium',
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: 'main',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 30000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="seo-client-report"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: 'main',
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
          name: 'report-action-focus',
          startSelector: 'button:has-text("Descargar informe")',
          keys: ['Tab'],
          requireVisibleFocusRing: true
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
      includeSelector: '[data-capture="seo-client-report"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'el artifact cliente debe conservar la sesión' },
    { kind: 'noErrorBoundary', reason: 'el report no debe caer en error boundary' }
  ],
  steps: [
    { kind: 'wait', selector: '[data-capture="seo-client-report"] canvas', timeout: 15000 },
    { kind: 'sleep', ms: 1200 },
    { kind: 'mark', label: 'web', clipSelector: '[data-capture="seo-client-report"]', note: 'Trust Report Artifact web con veredicto, KPIs, quadrant y evolución' },
    { kind: 'click', selector: 'button:has-text("Descargar informe")' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'print-triggered', clipSelector: '[data-capture="seo-client-report"]', note: 'La acción de salida queda disponible sin duplicar el modelo de datos' }
  ]
}

export default scenario
