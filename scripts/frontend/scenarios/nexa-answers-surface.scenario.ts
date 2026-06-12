// TASK-1096 — Nexa Answers visual prototype: Knowledge first real low-risk surface.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'nexa-answers-surface',
  route: '/knowledge/mockup/nexa-answers',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="nexa-answers-surface"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 450,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup interno autenticado via GVC local actor' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="nexa-answers-trust-cue"]',
      reason: 'Nexa Answers debe priorizar trust cue compacto antes que proof visible.'
    }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="nexa-answers-visual-page"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="nexa-answers-surface"]'
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-answers-answered-fullpage',
      fullPage: true,
      note: 'Nexa Answers en Knowledge: respuesta primero, trust cue compacto y proof colapsado.'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-conversation',
      clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
      note: 'Turno principal con pregunta, identidad Nexa, respuesta y composer descendido.'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-chart-trend',
      clipSelector: '[data-capture="nexa-answers-chart-variant"]',
      note: 'Variante chart: tendencia Recharts dentro de la respuesta enriquecida.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'show-nexa-answers-chart-comparison',
        intent: 'El modo comparativo muestra barras Recharts asentadas dentro de la bubble.',
        action: { kind: 'click', selector: 'button:has-text("Comparativo")' },
        frames: [
          {
            label: 'nexa-answers-chart-comparison',
            atMs: 900,
            clipSelector: '[data-capture="nexa-answers-chart-variant"]',
            note: 'Variante chart: comparativo Recharts dentro de la misma bubble.'
          }
        ]
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'show-nexa-answers-chart-composition',
        intent: 'El modo composición muestra donut Recharts asentado dentro de la bubble.',
        action: { kind: 'click', selector: 'button:has-text("Composición")' },
        frames: [
          {
            label: 'nexa-answers-chart-composition',
            atMs: 1200,
            clipSelector: '[data-capture="nexa-answers-chart-variant"]',
            note: 'Variante chart: composición Recharts dentro de la misma bubble.'
          }
        ]
      }
    },
    {
      kind: 'click',
      selector: 'button:has-text("Pensando")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-thinking"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-thinking-beat',
      clipSelector: '[data-capture="nexa-answers-canvas-conversation"]',
      note: 'Thinking beat alineado al patrón curado de Nexa Chat: wordmark compacto + dots inline wave.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Respuesta")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-trust-cue"]',
      timeout: 5000
    },
    {
      kind: 'fill',
      selector: 'input[aria-label="Continúa con Nexa"]',
      value: 'Dame una versión para un manager'
    },
    {
      kind: 'mark',
      label: 'nexa-answers-followup-composer-active',
      clipSelector: '[data-capture="nexa-answers-canvas-composer"]',
      note: 'Composer post-respuesta con texto: conserva Nexa mark y cambia el botón a enviar activo.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'submit-nexa-answers-followup',
        intent: 'El follow-up escrito se promueve a burbuja y no vuelve a semántica de búsqueda.',
        action: { kind: 'press', selector: 'input[aria-label="Continúa con Nexa"]', key: 'Enter' },
        frames: [{ label: 'nexa-answers-written-followup', atMs: 250, clipSelector: '[data-capture="nexa-answers-surface"]' }]
      }
    },
    {
      kind: 'click',
      selector: 'button:has-text("Proof")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-proof"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-proof-expanded',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Proof expandido bajo demanda; la evidencia no desplaza el answer-first default.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Follow-up")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-compact-answer-card"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-followup-compacted',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Follow-up compacto: conserva contexto sin reimprimir todo el proof.'
    },
    {
      kind: 'click',
      selector: 'button:has-text("Idle")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-answers-canvas-idle"]',
      timeout: 5000
    },
    {
      kind: 'mark',
      label: 'nexa-answers-idle',
      clipSelector: '[data-capture="nexa-answers-surface"]',
      note: 'Idle limpio: composer glow sin respuesta falsa ni proof prematuro.'
    }
  ]
}
