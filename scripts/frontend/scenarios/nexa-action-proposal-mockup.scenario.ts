// TASK-1137 — GVC de la confirm-card de acción gobernada en el chat (desktop + mobile).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'nexa-action-proposal-mockup',
  route: '/nexa/action-proposal/mockup',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
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
  steps: [
    {
      kind: 'mark',
      label: 'confirm-card',
      fullPage: true,
      note: 'Confirm-card de acción gobernada: el LLM propone, el humano confirma (estado idle).'
    }
  ]
}
