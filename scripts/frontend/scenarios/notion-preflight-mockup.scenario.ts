// TASK-1009 — GVC del panel de preflight Notion (verify_notion_flowing).
// Mockup con data ficticia (NO toca clientes reales). Tres frames clippeados:
// idle (botón "Correr preflight"), resultado fluye (9 verde), resultado no fluye
// (template L1 + portal en rojo, freshness advisory).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'notion-preflight-mockup',
  route: '/agency/clients/mockup/notion-preflight',
  viewport: { width: 1440, height: 1100 },
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="notion-preflight-mockup"]',
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' }
  ],
  steps: [
    { kind: 'scroll', selector: '[data-capture="preflight-idle"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'idle', clipSelector: '[data-capture="preflight-idle"]', note: 'Idle — botón Correr preflight + hint' },
    { kind: 'scroll', selector: '[data-capture="preflight-ready"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'ready', clipSelector: '[data-capture="preflight-ready"]', note: 'Resultado — el cliente fluye (9 verde)' },
    { kind: 'scroll', selector: '[data-capture="preflight-notready"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'notready', clipSelector: '[data-capture="preflight-notready"]', note: 'Resultado — todavía no fluye (rojo + advisory)' }
  ]
}
