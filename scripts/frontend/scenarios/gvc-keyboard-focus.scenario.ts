// TASK-1018 — Regression scenario for the keyboard/focus/reduced-motion gate.
// Walks a keyboard route on a stable mockup surface and checks focus + ring.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'gvc-keyboard-focus',
  route: '/agency/organizations/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="organization-list-enterprise-mockup"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  quality: {
    keyboard: {
      enabled: true,
      probes: [
        {
          name: 'tab-into-surface',
          startSelector: '[data-capture="organization-list-enterprise-mockup"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    }
  },
  assertions: [{ kind: 'noLoginRedirect', reason: 'mockup autenticado' }],
  steps: [{ kind: 'mark', label: 'initial' }]
}
