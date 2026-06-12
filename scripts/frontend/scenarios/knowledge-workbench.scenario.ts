// TASK-1084 — Human Knowledge Center runtime.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'knowledge-workbench',
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
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Knowledge es una ruta interna autenticada vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' },
    {
      kind: 'visible',
      selector: '[data-nexa-floating-trigger="true"]',
      reason: 'El FAB flotante de Nexa debe permanecer disponible sobre Knowledge.'
    },
    {
      kind: 'visible',
      selector: '[data-capture="knowledge-command-surface"]',
      reason: 'La caja glow de Nexa es la entrada principal del Workbench.'
    }
  ],
  quality: {
    allowLoading: false,
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
      kind: 'mark',
      label: 'knowledge-workbench-fullpage',
      fullPage: true,
      note: 'Workbench completo con search humano, rutas, resultados e inspector.'
    },
    {
      kind: 'mark',
      label: 'knowledge-command-surface',
      clipSelector: '[data-capture="knowledge-command-surface"]',
      note: 'Caja canónica NexaComposer kind knowledgeAsk.'
    },
    {
      kind: 'mark',
      label: 'knowledge-results-panel',
      clipSelector: '[data-capture="knowledge-results-panel"]',
      note: 'Browse/search de documentos publicados.'
    },
    {
      kind: 'mark',
      label: 'knowledge-inspector-panel',
      clipSelector: '[data-capture="knowledge-inspector-panel"]',
      note: 'Inspector con metadata, trazabilidad y feedback.'
    },
    {
      kind: 'fill',
      selector: 'input[aria-label="Pregúntale a Nexa"]',
      value: 'métricas ICO'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'knowledge-human-search',
        intent: 'El search humano mantiene el usuario en el Workbench y actualiza resultados sin abrir chat.',
        action: { kind: 'press', selector: 'input[aria-label="Pregúntale a Nexa"]', key: 'Enter' },
        frames: [
          { label: 'knowledge-search-0ms', atMs: 0, fullPage: true },
          { label: 'knowledge-search-900ms', atMs: 900, fullPage: true }
        ]
      }
    }
  ]
}
