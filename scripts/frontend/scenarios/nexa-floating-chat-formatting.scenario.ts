// TASK-1138 — Evidencia LIVE de la política `answerFormatting` del prompt V2 (v2.1.0).
// Maneja el chat flotante REAL (no el mockup): abre el panel, envía una pregunta y captura
// la respuesta real de Gemini (`/api/home/nexa`, V2 ON). Verifica a ojo que el texto salga
// ESCANEABLE (párrafos cortos + viñetas + negrita en el dato clave), no un ladrillo de prosa.
//
// Es una scenario LIVE/manual: depende del modelo (no-determinista) + dev server + Gemini.
// NO corre en CI. Requiere `NEXA_SYSTEM_PROMPT_V2_ENABLED=true` (ya en .env.local) + agent-session.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  // El FAB flotante se autosuprime en '/home' (ahí el chat va embebido) — usar otra ruta del dashboard.
  name: 'nexa-floating-chat-formatting',
  route: '/people',
  // Envía un mensaje real (fill + click send) → muta estado de conversación.
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 800,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-floating-trigger"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 60000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'chat flotante autenticado via agent-session GVC local' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar error boundary' }
  ],
  steps: [
    { kind: 'click', selector: '[data-capture="nexa-floating-trigger"]' },
    { kind: 'wait', selector: '[data-capture="nexa-composer"]', timeout: 10000 },
    {
      kind: 'fill',
      selector: '[data-capture="nexa-composer"] textarea',
      value: '¿Qué módulos tiene Greenhouse y para qué sirve cada uno? Enuméralos con los puntos principales.'
    },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'composer-con-pregunta', clipSelector: '[data-capture="nexa-floating-panel"]', note: 'Pregunta tipeada, antes de enviar' },
    { kind: 'click', selector: 'button[aria-label="Enviar mensaje"]' },
    // Espera a que la respuesta TERMINE: el toolbar de feedback aparece al cerrar el turno. Gemini ~5-20s.
    { kind: 'wait', selector: 'button[aria-label="Respuesta util"]', timeout: 60000 },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: 'respuesta-formateada', clipSelector: '[data-capture="nexa-floating-panel"]', note: 'Respuesta V2 v2.1.0 con answerFormatting: párrafos/viñetas/negrita, no un ladrillo' }
  ]
}
