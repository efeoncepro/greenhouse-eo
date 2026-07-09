import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task354-careers-runtime-audit',
  route: '/public/careers',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop1440', width: 1440, height: 900 },
    { name: 'mobile390', width: 390, height: 844 }
  ],
  initialHoldMs: 1600,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="careers-home-hero"]',
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'careers publica no requiere sesion' },
    { kind: 'noErrorBoundary', reason: 'TASK-354 debe renderizar sin error boundary' }
  ],
  quality: {
    layout: {
      enabled: true,
      includeSelector: 'body',
      ignoreSelectors: ['[class*="visuallyHidden"]'],
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
          name: 'home-first-tab',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 7000
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'home-first-fold',
      fullPage: true,
      note: 'Home careers completo: hero, attract, listing y nurture.'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="careers-home-listing"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'home-listing',
      clipSelector: '[data-capture="careers-home-listing"]',
      note: 'Listado publico con opening publicado.'
    },
    {
      kind: 'click',
      selector: 'a[href^="/public/careers/"]:not([href$="/apply"])',
      note: 'Navega al primer detalle publico.'
    },
    {
      kind: 'wait',
      selector: '[data-capture="careers-detail-hero"]',
      timeout: 15000
    },
    {
      kind: 'mark',
      label: 'detail-first-fold',
      fullPage: true,
      note: 'Detalle publico del opening.'
    },
    {
      kind: 'click',
      selector: 'a[href$="/apply"]',
      note: 'Navega al apply publico.'
    },
    {
      kind: 'wait',
      selector: '[data-capture="careers-apply-form"]',
      timeout: 15000
    },
    {
      kind: 'mark',
      label: 'apply-form',
      fullPage: true,
      note: 'Apply form con contrato Growth Forms y uploader CV.'
    },
    {
      kind: 'mark',
      label: 'cv-uploader',
      clipSelector: '[data-capture="careers-cv-uploader"]',
      note: 'Uploader de CV PDF dentro del form publico.'
    }
  ]
}
