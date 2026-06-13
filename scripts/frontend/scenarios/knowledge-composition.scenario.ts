// TASK-1110 — Composición Nexa in-place RUNTIME en /knowledge (lente Humano, placement 'composed').
// Captura el morph dormant → ask → composed: el composer del consumer es el único ask; el workbench REAL
// de docs es el host (browse/navegar = host, preguntar = compose) y persiste condensado bajo la respuesta,
// con el doc citado anclado (data-nexa-anchor). Default ON (rollout-flag DB). Datos reales → idealmente
// staging; en local el corpus puede degradar honesto (confidence='none') sin romper el host.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'knowledge-composition',
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
    selector: '[data-capture="knowledge-nexa-composition-lens"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Knowledge es ruta interna autenticada vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' },
    {
      kind: 'visible',
      selector: '[data-capture="nexa-moment-host"]',
      reason: 'El workbench REAL de docs es el host y persiste vivo (dormant y composed).'
    }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="knowledge-nexa-composition-lens"]' },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="knowledge-nexa-composition-lens"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="knowledge-result-row"]', timeout: 12000 },
    {
      kind: 'mark',
      label: 'composition-dormant',
      fullPage: true,
      note: 'Dormant: el composer ("Pregúntale a Nexa") arriba y el workbench de docs vivo y usable abajo.'
    },
    {
      kind: 'fill',
      selector: 'input[aria-label="Pregúntale a Nexa sobre el corpus…"]',
      value: '¿Cómo se calcula el RpA en mis métricas ICO?'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'knowledge-composition-ask',
        intent: 'Preguntar compone in-place: thinking → reasoning → la respuesta lidera y el host condensa con la cita anclada.',
        action: { kind: 'press', selector: 'input[aria-label="Pregúntale a Nexa sobre el corpus…"]', key: 'Enter' },
        frames: [
          { label: 'composition-thinking-0ms', atMs: 0, fullPage: true },
          { label: 'composition-reasoning-700ms', atMs: 700, fullPage: true },
          { label: 'composition-composed-2400ms', atMs: 2400, fullPage: true }
        ]
      }
    },
    { kind: 'sleep', ms: 600 },
    {
      kind: 'mark',
      label: 'composition-composed',
      fullPage: true,
      note: 'Composed: respuesta Nexa arriba + fuentes ancladas; el host (workbench) persiste condensado con el doc citado resaltado.'
    }
  ]
}
