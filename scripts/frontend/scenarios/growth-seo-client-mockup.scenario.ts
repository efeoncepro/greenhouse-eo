// TASK-1310 — deterministic populated visual family for local GVC review.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-seo-client-mockup',
  route: '/growth/seo/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  qualityProfile: 'premium',
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="seo-client-dashboard"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 1200,
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
    { kind: 'noLoginRedirect', reason: 'el harness vive dentro de la sesión autenticada' },
    { kind: 'noErrorBoundary', reason: 'el harness debe renderizar el runtime compartido' },
    { kind: 'visible', selector: '[data-capture="seo-client-summary"]', reason: 'Evidence Narrative debe estar poblada' },
    { kind: 'visible', selector: '[data-capture="seo-client-report-cta"]', reason: 'el siguiente paso al Trust Report debe ser visible' }
  ],
  steps: [
    { kind: 'mark', label: 'summary', clipSelector: '[data-capture="seo-client-summary"]', note: 'Evidence Narrative + KPI evidence' },
    { kind: 'click', selector: '[role="tab"]:has-text("Evolución"), [role="button"]:has-text("Evolución")' },
    { kind: 'sleep', ms: 400 },
    { kind: 'scroll', selector: '[data-capture="seo-client-evolution"]', scrollBlock: 'start' },
    { kind: 'mark', label: 'evolution', clipSelector: '[data-capture="seo-client-evolution"]', note: 'Evolución como evidencia: timeline si la muestra es corta, chart cuando hay cobertura suficiente' },
    { kind: 'click', selector: '[role="tab"]:has-text("SEO × AEO"), [role="button"]:has-text("SEO × AEO")' },
    { kind: 'sleep', ms: 400 },
    { kind: 'scroll', selector: '[data-capture="seo-client-quadrant"]', scrollBlock: 'start' },
    { kind: 'wait', selector: '[data-capture="seo-client-quadrant"] canvas', timeout: 12000 },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'quadrant', clipSelector: '[data-capture="seo-client-quadrant"]', note: 'X citabilidad IA · Y posición SEO; zonas y estados explícitos' }
  ]
}

export default scenario
