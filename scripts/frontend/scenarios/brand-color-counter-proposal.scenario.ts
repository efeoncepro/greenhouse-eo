// Brand color counter-proposal (TASK-1052 follow-up discussion) — visual review of
// the Claude product-design counter-proposal section on the brand-color mockup.
// Proposal only — NOT tokenized.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'brand-color-counter-proposal',
  route: '/admin/design-system/mockup/brand-color-proposal',
  viewport: { width: 1280, height: 900 },
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'scroll',
      selector: '[data-capture="counter-proposal-d"]'
    },
    {
      kind: 'mark',
      label: 'counter-proposal-d',
      clipSelector: '[data-capture="counter-proposal-d"]',
      note: 'Contrapropuesta D: spine + verde muted canónico + semánticas dual-mode + pops con ink-pairs + demo light/dark'
    }
  ]
}
