// TASK-1310 — client SEO dashboard, visual family: Evidence Narrative + Visibility Map.
//
// The route is read-only and tenant-scoped. The same scenario remains useful when staging
// has no active SEO assignment: it captures the honest locked/empty state instead of forcing
// data into the environment. When the client fixture is available, the section marks cover
// the summary, inverted rank evolution and 360 quadrant independently.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-seo-client',
  route: '/growth/seo',
  // Superficie CLIENTE: con la sesión de operador interno la página renderiza su card
  // de bloqueo, la captura muere por `selector_timeout` y el gate reporta BLOCK como si
  // fuera defecto de producto. Declarar la identidad evita ese diagnóstico falso.
  requiresStorageState: '.auth/storageState.local-berel-client.json',
  // Sólo navega tabs con teclado/click dentro del cliente; no escribe backend ni dispara commands.
  mutating: true,
  safeForCapture: true,
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
      includeSelector: '[data-capture="seo-client-dashboard"]',
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
          name: 'report-cta-focus',
          startSelector: '[data-capture="seo-client-report-cta"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        },
        {
          name: 'section-switch',
          startSelector: '[role="tab"]:has-text("Evolución"), [role="button"]:has-text("Evolución")',
          keys: ['Enter'],
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
      includeSelector: '[data-capture="seo-client-dashboard"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la superficie cliente debe conservar la sesión' },
    { kind: 'noErrorBoundary', reason: 'el dashboard no debe caer en error boundary' }
  ],
  steps: [
    { kind: 'click', selector: '[data-capture="seo-client-summary"]' },
    { kind: 'sleep', ms: 400 },
    { kind: 'scroll', selector: '[data-capture="seo-client-summary"]', scrollBlock: 'start' },
    { kind: 'mark', label: 'summary', timeout: 15000, clipSelector: '[data-capture="seo-client-summary"]', note: 'Evidence Narrative + KPI evidence del estado Resumen' },
    { kind: 'press', selector: '#seo-client-tab-evolution', key: 'Enter' },
    { kind: 'sleep', ms: 400 },
    { kind: 'wait', selector: '[data-capture="seo-client-evolution"]', timeout: 15000 },
    { kind: 'scroll', selector: '[data-capture="seo-client-evolution"]', scrollBlock: 'start' },
    { kind: 'mark', label: 'evolution', timeout: 15000, clipSelector: '[data-capture="seo-client-evolution"]', note: 'Evolución como evidencia: timeline si la muestra es corta, chart cuando hay cobertura suficiente' },
    { kind: 'click', selector: 'button:has-text("Ver datos de la evolución")' },
    { kind: 'sleep', ms: 500 },
    { kind: 'scroll', selector: '[data-capture="seo-client-evolution"]', scrollBlock: 'start' },
    { kind: 'mark', label: 'evolution-table', timeout: 15000, clipSelector: '[data-capture="seo-client-evolution"]', note: 'Tabla de fallback con keywords destacadas, estados de medición y scroll controlado' },
    { kind: 'press', selector: '#seo-client-tab-quadrant', key: 'Enter' },
    { kind: 'sleep', ms: 400 },
    { kind: 'wait', selector: '[data-capture="seo-client-quadrant"]', timeout: 15000 },
    { kind: 'scroll', selector: '[data-capture="seo-client-quadrant"]', scrollBlock: 'start' },
    { kind: 'wait', selector: '[data-capture="seo-client-quadrant"] canvas', timeout: 12000 },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'quadrant', timeout: 15000, clipSelector: '[data-capture="seo-client-quadrant"]', note: 'Cruce SEO × AEO: visibilidad IA del dominio × posición SEO, sin score fusionado' }
  ]
}

export default scenario
