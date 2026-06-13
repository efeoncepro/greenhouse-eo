// TASK-1101 — Lente Nexa rica en /knowledge: NexaAnswersCanvas runtime cableado al retrieval real.
// Requiere el dev server con NEXA_ANSWERS_CANVAS_LENS_ENABLED=true. Verifica el wiring + la máquina de
// estados (idle → thinking → reasoning → answered/gap). En local (sin corpus) cae al gap honesto; el
// grounded-rico se verifica en staging (corpus + pool estable, lección ISSUE-094).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'knowledge-nexa-canvas-lens',
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
    { kind: 'noLoginRedirect', reason: 'Knowledge es una ruta interna autenticada vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="knowledge-nexa-canvas-lens"]'
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="knowledge-nexa-canvas-lens"]'
    }
  },
  steps: [
    { kind: 'wait', selector: '[role="tab"]:has-text("Nexa")', timeout: 12000 },
    { kind: 'click', selector: '[role="tab"]:has-text("Nexa")' },
    { kind: 'wait', selector: '[data-capture="knowledge-nexa-canvas-lens"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'canvas-lens-idle',
      fullPage: true,
      note: 'Lente Nexa rica (idle): el NexaAnswersCanvas con composer + estado idle.'
    },
    { kind: 'fill', selector: 'input[aria-label="Escribe tu pregunta…"]', value: '¿Qué significa Impacto en mis métricas ICO?' },
    {
      kind: 'interaction',
      interaction: {
        name: 'canvas-lens-ask',
        intent: 'La pregunta dispara el retrieval real y la coreografía thinking → reasoning → answered (o gap honesto).',
        action: { kind: 'press', selector: 'input[aria-label="Escribe tu pregunta…"]', key: 'Enter' },
        frames: [
          { label: 'canvas-lens-thinking-0ms', atMs: 0, fullPage: true },
          { label: 'canvas-lens-reasoning-1400ms', atMs: 1400, fullPage: true },
          { label: 'canvas-lens-answered-3200ms', atMs: 3200, fullPage: true }
        ]
      }
    },
    { kind: 'sleep', ms: 1500 },
    {
      kind: 'mark',
      label: 'canvas-lens-settled',
      fullPage: true,
      note: 'Estado asentado: respuesta grounded con citas + trust cue (o gap honesto sin corpus local).'
    },
    // GAP B (TASK-1102) — hilo multi-turno: el follow-up compacta el turno vivo al historial (morph VT)
    // y el turno previo PERSISTE arriba mientras Nexa responde el nuevo. Prueba la continuidad espacial.
    { kind: 'fill', selector: 'input[aria-label="Sigue preguntando…"]', value: '¿Y cómo se lo explico a un manager sin tecnicismos?' },
    {
      kind: 'interaction',
      interaction: {
        name: 'canvas-lens-followup',
        intent: 'El follow-up compacta el turno anterior al historial (View Transitions) y lo mantiene visible sobre el nuevo turno.',
        action: { kind: 'press', selector: 'input[aria-label="Sigue preguntando…"]', key: 'Enter' },
        frames: [
          { label: 'canvas-lens-followup-thinking-200ms', atMs: 200, fullPage: true },
          { label: 'canvas-lens-followup-answered-3200ms', atMs: 3200, fullPage: true }
        ]
      }
    },
    { kind: 'sleep', ms: 1200 },
    {
      kind: 'mark',
      label: 'canvas-lens-thread-settled',
      fullPage: true,
      note: 'Hilo con dos turnos: el primero compactado arriba (historial), el segundo vivo abajo.'
    }
  ]
}
