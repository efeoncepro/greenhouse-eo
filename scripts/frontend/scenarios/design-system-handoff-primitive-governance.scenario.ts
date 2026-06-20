import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-handoff-primitive-governance',
  route: '/design-system/handoff',
  mutating: false,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1600,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="design-system-handoff-page"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 18000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Primitive governance vive bajo el cockpit autenticado de Design Handoff.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="design-system-handoff-page"]' },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    keyboard: {
      enabled: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'primitive-decision-focus',
          startSelector: '[data-capture="design-system-handoff-primitive-governance"] .MuiAccordionSummary-root',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="design-system-handoff-page"]',
      expectedDataCaptureRegions: [
        'design-system-handoff-page',
        'design-system-handoff-lanes',
        'design-system-handoff-primitive-governance'
      ]
    }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="design-system-handoff-page"]', timeout: 16000 },
    { kind: 'wait', selector: '[data-capture="design-system-handoff-primitive-governance"]', timeout: 16000 },
    { kind: 'sleep', ms: 350 },
    {
      kind: 'mark',
      label: 'primitive-governance-first-fold',
      fullPage: false,
      note: 'Cockpit con entry seleccionada y readiness incluyendo Primitive governance.'
    },
    {
      kind: 'mark',
      label: 'primitive-governance-inspector',
      clipSelector: '[data-capture="design-system-handoff-primitive-governance"]',
      note: 'Decision DS: strategy, primitive key, variant/kind, Lab, runtime, GVC, docs, owner y warnings.'
    }
  ]
}
