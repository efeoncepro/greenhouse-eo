// TASK-1078 — verifica el flujo "nueva conversación": click en el botón circular del
// header → limpia el chat → el empty hero entra de forma fluida (fade/translate).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'nexa-new-conversation',
  route: '/nexa/floating-chat/mockup',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: 'button[aria-label="Nueva conversación"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup autenticado via GVC local actor' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar error boundary' }
  ],
  steps: [
    { kind: 'mark', label: 'antes-conversacion', note: 'Estado con conversación sembrada' },
    {
      kind: 'interaction',
      interaction: {
        name: 'nueva-conversacion',
        intent: 'Click en el botón circular del header limpia el chat y el empty hero entra fluido',
        action: { kind: 'click', selector: 'button[aria-label="Nueva conversación"]' },
        frames: [
          { label: 'reset-0ms', atMs: 0 },
          { label: 'reset-160ms', atMs: 160 },
          { label: 'reset-360ms', atMs: 360 },
          { label: 'reset-650ms', atMs: 650 }
        ]
      }
    }
  ]
}
