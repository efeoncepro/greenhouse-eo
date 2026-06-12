// Internal Nexa Chat Pattern Lab verification — composer variants and chat atoms.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-chat',
  route: '/design-system/nexa-chat',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-chat-lab"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-chat-lab-fullpage',
      fullPage: true,
      note: 'Laboratorio interno del patrón Nexa Chat y sus atoms'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="nexa-composer-command-variant"]',
      scrollBlock: 'center'
    },
    {
      kind: 'mark',
      label: 'nexa-composer-command-variant',
      clipSelector: '[data-capture="nexa-composer-command-variant"]',
      note: 'Variant command del NexaComposer con kind knowledgeAsk'
    }
  ]
}
