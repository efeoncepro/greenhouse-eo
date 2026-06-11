// TASK-1078 — Nexa floating chat (concepto B). Evidencia de motion del glow
// (idle breathing + barrido al enfocar) y del composer/botón enviar a escala de ms.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'nexa-floating-chat',
  route: '/nexa/floating-chat/mockup',
  // El fill escribe en el composer de un mockup con runtime mock (sin API real).
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1000,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="nexa-composer"]',
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
    { kind: 'mark', label: 'idle-composer', clipSelector: '[data-capture="nexa-composer"]', note: 'Idle: línea de luz que respira (sin cursor)' },
    {
      kind: 'interaction',
      interaction: {
        name: 'focus-composer-beam',
        intent: 'Al enfocar el composer, el barrido de luz recorre el borde a velocidad uniforme',
        action: { kind: 'click', selector: '#nexa-floating-composer-input' },
        frames: [
          { label: 'beam-0ms', atMs: 0, clipSelector: '[data-capture="nexa-composer"]' },
          { label: 'beam-450ms', atMs: 450, clipSelector: '[data-capture="nexa-composer"]' },
          { label: 'beam-900ms', atMs: 900, clipSelector: '[data-capture="nexa-composer"]' },
          { label: 'beam-1400ms', atMs: 1400, clipSelector: '[data-capture="nexa-composer"]' },
          { label: 'beam-2000ms', atMs: 2000, clipSelector: '[data-capture="nexa-composer"]' }
        ]
      }
    },
    { kind: 'fill', selector: '#nexa-floating-composer-input', value: 'Analiza el churn de mayo' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'composer-with-text', clipSelector: '[data-capture="nexa-composer"]', note: 'Botón enviar navy + ícono blanco al haber texto' },
    {
      kind: 'interaction',
      interaction: {
        name: 'hover-send',
        intent: 'Hover del botón enviar → teal con ícono navy (no gris/negro)',
        action: { kind: 'hover', selector: 'button[aria-label="Enviar mensaje"]' },
        frames: [
          { label: 'send-hover', atMs: 250, clipSelector: '[data-capture="nexa-composer"]' }
        ]
      }
    }
  ]
}
