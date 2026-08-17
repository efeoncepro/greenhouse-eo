import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task1741-careers-editorial-detail',
  route: '/public/careers/EO-OPN-0061',
  viewport: { width: 1440, height: 1200 },
  viewports: [
    { name: 'desktop1440', width: 1440, height: 1200 },
    { name: 'mobile390', width: 390, height: 844 }
  ],
  qualityProfile: 'premium',
  initialHoldMs: 1800,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="careers-detail-hero"]',
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 20000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: 'body',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: 'body',
      ignoreSelectors: ['[class*="visuallyHidden"]'],
      failOnViolations: true
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'hero-apply-focus',
          startSelector: '[data-capture="careers-detail-hero-apply"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 1800,
      maxRequests: 80,
      maxTransferBytes: 8_000_000,
      maxFcpMs: 5000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: 'body',
      requireSurfaceRecipeMarker: false,
      expectedDataCaptureRegions: [
        'careers-detail-hero',
        'careers-detail-content',
        'careers-detail-work',
        'careers-detail-remote',
        'careers-detail-process',
        'career-summary'
      ],
      maxUniformCards: 4,
      maxNestedSurfaceDepth: 2,
      maxContainedSurfacesInViewport: 4
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la hoja de la vacante es pública' },
    { kind: 'noErrorBoundary', reason: 'el payload parcial real degrada sin romper la hoja' },
    {
      kind: 'visible',
      selector: '[data-capture="careers-detail-hero-apply"]',
      reason: 'el CTA temprano existente permanece visible'
    },
    {
      kind: 'visible',
      selector: '[data-capture="career-summary"]',
      reason: 'el resumen y segundo CTA existente permanecen en la hoja'
    }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'detail-first-fold',
      clipSelector: '[data-capture="careers-detail-hero"]',
      note: 'Primer fold editorial: rol, seniority público, promesa, facts y CTA existente.'
    },
    {
      kind: 'mark',
      label: 'detail-full',
      fullPage: true,
      note: 'Hoja completa para comparar jerarquía, contenido, rail, footer y ausencia de regresiones.'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="careers-detail-remote"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'remote-and-summary',
      fullPage: false,
      note: 'Modelo remoto real, países elegibles y continuidad del rail.'
    }
  ]
}
