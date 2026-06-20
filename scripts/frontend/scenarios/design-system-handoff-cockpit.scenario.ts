import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-handoff-cockpit',
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
    { kind: 'noLoginRedirect', reason: 'Design handoff cockpit vive bajo dashboard autenticado via GVC local actor.' },
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
          name: 'tab-reachability',
          startSelector: '[data-capture="design-system-handoff-page"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="design-system-handoff-page"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="design-system-handoff-page"]', timeout: 16000 },
    {
      kind: 'mark',
      label: 'cockpit-first-fold',
      fullPage: false,
      note: 'Evidence Ledger + inspector command center en el primer pliegue.'
    },
    {
      kind: 'mark',
      label: 'cockpit-ledger',
      clipSelector: '[data-capture="design-system-handoff-lanes"]',
      note: 'Ledger agrupado con estados, prioridad, evidence y node health.'
    },
    { kind: 'click', selector: '[data-capture="design-system-handoff-tab-intake"]' },
    { kind: 'sleep', ms: 350 },
    {
      kind: 'mark',
      label: 'cockpit-intake',
      clipSelector: '[data-capture="design-system-handoff-create"]',
      note: 'Intake gobernado para registrar nodos Figma allowlisted.'
    },
    { kind: 'click', selector: '[data-capture="design-system-handoff-tab-allowlist"]' },
    { kind: 'sleep', ms: 350 },
    {
      kind: 'mark',
      label: 'cockpit-allowlist',
      clipSelector: '[data-capture="design-system-handoff-allowlist"]',
      note: 'Allowlist administrable desde command API, sin mezclar AXIS master.'
    }
  ]
}
