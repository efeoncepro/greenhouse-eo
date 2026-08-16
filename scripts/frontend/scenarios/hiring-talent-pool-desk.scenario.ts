import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'hiring-talent-pool-desk',
  route: '/agency/hiring/talent-pool',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 250,
  qualityProfile: 'premium',
  readiness: {
    selector: '[data-capture="talent-pool-results"]',
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]'],
    waitForFonts: true,
    postReadyDelayMs: 200,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect' },
    { kind: 'noErrorBoundary' },
    { kind: 'visible', selector: '[data-capture="talent-pool-header"]' },
    { kind: 'visible', selector: '[data-capture="talent-pool-results"]' }
  ],
  baseline: {
    surfaceId: 'hiring.talent-pool.desk',
    requiredFrameLabels: ['first-fold', 'evidence-inspector'],
    requiredRegions: ['[data-capture="talent-pool-results"]'],
    maskSelectors: ['[data-capture="talent-pool-results"]'],
    maxDiffRatio: 0.05
  },
  quality: {
    layout: {
      enabled: true,
      includeSelector: 'body',
      ignoreSelectors: [
        '.ts-vertical-nav-root',
        '.ts-vertical-nav-container',
        '.ts-vertical-nav-bg-color-container',
        '.bs-full'
      ],
      minTargetSize: 20,
      failOnViolations: true
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true
    },
    keyboard: {
      enabled: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'profile-inspector',
          keys: ['Tab', 'Enter'],
          expectedVisibleSelector: '[data-capture="talent-pool-evidence"]'
        }
      ]
    },
    performance: { enabled: true, severity: 'warning', maxDomNodes: 6000 },
    enterpriseRubric: { enabled: true, includeSelector: 'body' }
  },
  steps: [
    {
      kind: 'mark',
      label: 'first-fold',
      note: 'Búsqueda, filtros, resultados y gobernanza de contacto visibles sin exponer PII sensible.'
    },
    { kind: 'click', selector: 'button[data-capture="talent-pool-result-trigger"]:visible' },
    { kind: 'wait', selector: '[data-capture="talent-pool-evidence"]', timeout: 10000 },
    {
      kind: 'mark',
      label: 'evidence-inspector',
      note: 'Perfil person-first con evidencia y enlaces a la postulación de origen.'
    }
  ]
}
