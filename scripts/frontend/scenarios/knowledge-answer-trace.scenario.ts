// TASK-1089 — Knowledge answer trace surface.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'knowledge-answer-trace',
  route: '/knowledge/mockup/answer-trace',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1100,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-knowledge-answer-surface"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup interno autenticado via GVC local actor' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: '[data-nexa-floating-trigger="true"]',
      reason: 'el FAB flotante de Nexa debe estar disponible sobre Knowledge'
    }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="nexa-knowledge-answer-surface"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="nexa-knowledge-answer-surface"]'
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'knowledge-answer-trace-fullpage',
      fullPage: true,
      note: 'Surface completa: pregunta-burbuja, respuesta Nexa, composer descendido y prueba lateral'
    },
    {
      kind: 'mark',
      label: 'knowledge-conversation-lane',
      clipSelector: '[data-capture="nexa-knowledge-conversation-lane"]',
      note: 'Lane conversacional con continuidad pregunta → respuesta → follow-up'
    },
    {
      kind: 'mark',
      label: 'knowledge-proof-panel',
      clipSelector: '[data-capture="nexa-knowledge-proof-panel"]',
      note: 'Panel de trazabilidad Fuentes/Packet/Evals'
    },
    {
      kind: 'fill',
      selector: 'input[aria-label="Pregúntale a Nexa"]',
      value: '¿Qué significa Impacto en mis métricas ICO?'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'submit-knowledge-question',
        intent: 'La pregunta se preserva como burbuja y el composer queda disponible debajo',
        action: { kind: 'press', selector: 'input[aria-label="Pregúntale a Nexa"]', key: 'Enter' },
        frames: [
          { label: 'question-promoted-0ms', atMs: 0, fullPage: true },
          { label: 'question-promoted-750ms', atMs: 750, fullPage: true }
        ]
      }
    }
  ]
}
