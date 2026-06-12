// TASK-1090 — Knowledge lenses runtime: Humano default + Nexa Answer Trace + MCP packet.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'knowledge-lenses',
  route: '/knowledge',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="knowledge-workbench"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Knowledge lenses es una ruta interna autenticada vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' },
    {
      kind: 'visible',
      selector: '[data-capture="knowledge-command-surface"]',
      reason: 'Humano es el default y muestra la búsqueda documental.'
    },
    {
      kind: 'visible',
      selector: '[data-nexa-floating-trigger="true"]',
      reason: 'El FAB flotante de Nexa debe permanecer disponible sobre Knowledge.'
    }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="knowledge-workbench"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="knowledge-workbench"]'
    }
  },
  steps: [
    {
      kind: 'wait',
      selector: '[data-capture="knowledge-result-row"]',
      timeout: 12000
    },
    {
      kind: 'mark',
      label: 'knowledge-human-default',
      fullPage: true,
      note: 'Humano default: búsqueda documental, rutas, resultados e inspector.'
    },
    {
      kind: 'click',
      selector: '[role="tab"]:has-text("Nexa")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="nexa-knowledge-answer-surface"]',
      timeout: 8000
    },
    {
      kind: 'mark',
      label: 'knowledge-nexa-lens-idle',
      fullPage: true,
      note: 'Nexa lens: Answer Trace embebido dentro de /knowledge.'
    },
    {
      kind: 'fill',
      selector: 'input[aria-label="Pregúntale a Nexa"]',
      value: '¿Qué significa Impacto en mis métricas ICO?'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'knowledge-nexa-question',
        intent: 'La pregunta se preserva como burbuja y se recupera evidencia real para la respuesta.',
        action: { kind: 'press', selector: 'input[aria-label="Pregúntale a Nexa"]', key: 'Enter' },
        frames: [
          { label: 'knowledge-nexa-question-0ms', atMs: 0, fullPage: true },
          { label: 'knowledge-nexa-question-900ms', atMs: 900, fullPage: true },
          { label: 'knowledge-nexa-question-settled', atMs: 2400, fullPage: true }
        ]
      }
    },
    {
      kind: 'sleep',
      ms: 900
    },
    {
      kind: 'click',
      selector: 'button:has-text("MCP")'
    },
    {
      kind: 'wait',
      selector: '[data-capture="knowledge-mcp-lens"]',
      timeout: 8000
    },
    {
      kind: 'mark',
      label: 'knowledge-mcp-lens',
      fullPage: true,
      note: 'MCP lens: paquete/resource/evidencia real, sin mock packet.'
    }
  ]
}
